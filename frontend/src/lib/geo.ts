/**
 * Dependency-free geo helpers for the "Nearby" search suggestion (uses the
 * browser's Geolocation API and picks the closest destination we have
 * listings for — the marketplace only has inventory in these cities).
 */

export interface Destination {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export const DESTINATIONS: Destination[] = [
  { city: "New York", country: "United States", latitude: 40.7128, longitude: -74.006 },
  { city: "Los Angeles", country: "United States", latitude: 34.0522, longitude: -118.2437 },
  { city: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522 },
  { city: "London", country: "United Kingdom", latitude: 51.5074, longitude: -0.1278 },
  { city: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503 },
  { city: "Barcelona", country: "Spain", latitude: 41.3874, longitude: 2.1686 },
  { city: "Bali", country: "Indonesia", latitude: -8.3405, longitude: 115.092 },
  { city: "Lisbon", country: "Portugal", latitude: 38.7223, longitude: -9.1393 },
];

/** Great-circle distance in kilometres. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function nearestDestination(lat: number, lon: number, destinations: Destination[] = DESTINATIONS): { destination: Destination; distanceKm: number } {
  let best = destinations[0];
  let bestKm = Infinity;
  for (const d of destinations) {
    const km = haversineKm(lat, lon, d.latitude, d.longitude);
    if (km < bestKm) {
      bestKm = km;
      best = d;
    }
  }
  return { destination: best, distanceKm: Math.round(bestKm) };
}

/**
 * Wraps navigator.geolocation in a promise; rejects with a readable message.
 *
 * Checks the Permissions API first: once someone has blocked location for the
 * site, the browser never re-shows the prompt — getCurrentPosition just fails
 * instantly. Detecting "denied" up front lets us say how to unblock it instead
 * of showing a generic failure.
 */
function browserGeolocate(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location isn't supported by this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location access was denied — allow it in your browser to search nearby"
            : err.code === err.TIMEOUT
              ? "Location took too long to respond — try again"
              : "Couldn't determine your precise location";
        reject(new Error(msg));
      },
      { timeout: 12000, maximumAge: 300000, enableHighAccuracy: false }
    );
  });
}

export interface IpInfo {
  latitude: number;
  longitude: number;
  city?: string;
  currency?: string;
}

const IP_CACHE_KEY = "airbnb_ip_location";
const IP_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

/** One in-flight lookup per page load, so callers can't stampede the API. */
let ipLookupInFlight: Promise<IpInfo | null> | null = null;

function readIpCache(): IpInfo | null {
  try {
    const raw = window.localStorage.getItem(IP_CACHE_KEY);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    if (typeof at !== "number" || Date.now() - at > IP_CACHE_TTL_MS) return null;
    return data as IpInfo;
  } catch {
    return null;
  }
}

/**
 * Approximates location from the visitor's IP via a free, no-key geo API, and
 * carries the currency that comes back in the same payload.
 *
 * Cached hard, and deliberately so: the free tier rate-limits, and the app asks
 * for this twice on every page (once to rank rows by proximity, once to pick a
 * currency). Two calls per reload exhausted the quota within a session, and
 * once the API started refusing, the home page quietly fell back to "busiest
 * city" and showed Lagos to a guest in Delhi. One cached lookup serves both.
 */
export async function ipLookup(): Promise<IpInfo | null> {
  const cached = readIpCache();
  if (cached) return cached;
  if (ipLookupInFlight) return ipLookupInFlight;

  ipLookupInFlight = fetch("https://ipapi.co/json/")
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
        return null;
      }
      const info: IpInfo = {
        latitude: data.latitude,
        longitude: data.longitude,
        city: typeof data.city === "string" ? data.city : undefined,
        currency: typeof data.currency === "string" ? data.currency : undefined,
      };
      try {
        window.localStorage.setItem(IP_CACHE_KEY, JSON.stringify({ at: Date.now(), data: info }));
      } catch {
        // storage full or blocked — the in-memory promise still dedupes
      }
      return info;
    })
    .catch(() => null);

  return ipLookupInFlight;
}

async function ipGeolocate(): Promise<{ latitude: number; longitude: number }> {
  const info = await ipLookup();
  if (!info) throw new Error("IP lookup failed");
  return { latitude: info.latitude, longitude: info.longitude };
}

/**
 * Rough centre of the region a time zone covers. Last resort only: it is
 * country-level accurate at best (every Indian city shares Asia/Kolkata), but
 * a guest in Mumbai seeing Delhi rows is far better than seeing Lagos because
 * an API refused a call.
 */
const ZONE_COORDS: Array<[RegExp, { latitude: number; longitude: number }]> = [
  [/^Asia\/(Kolkata|Calcutta)$/, { latitude: 28.6139, longitude: 77.209 }],
  [/^Asia\/Karachi$/, { latitude: 24.8607, longitude: 67.0011 }],
  [/^Asia\/Dhaka$/, { latitude: 23.8103, longitude: 90.4125 }],
  [/^Asia\/Colombo$/, { latitude: 6.9271, longitude: 79.8612 }],
  [/^Asia\/Dubai$/, { latitude: 25.2048, longitude: 55.2708 }],
  [/^Asia\/Singapore$/, { latitude: 1.3521, longitude: 103.8198 }],
  [/^Asia\/Tokyo$/, { latitude: 35.6762, longitude: 139.6503 }],
  [/^Europe\/London$/, { latitude: 51.5074, longitude: -0.1278 }],
  [/^Europe\/Paris$/, { latitude: 48.8566, longitude: 2.3522 }],
  [/^America\/New_York$/, { latitude: 40.7128, longitude: -74.006 }],
  [/^America\/Los_Angeles$/, { latitude: 34.0522, longitude: -118.2437 }],
  [/^Australia\/Sydney$/, { latitude: -33.8688, longitude: 151.2093 }],
];

function coordsFromTimeZone(): { latitude: number; longitude: number } | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    for (const [pattern, coords] of ZONE_COORDS) {
      if (pattern.test(zone)) return coords;
    }
  } catch {
    // Intl unavailable
  }
  return null;
}

/**
 * Best-effort location for "Nearby": try the browser's precise geolocation
 * first (Permissions API checked up front, since once a site is blocked the
 * browser never re-prompts and getCurrentPosition just fails silently), and
 * if that's unavailable for any reason other than the user explicitly
 * denying it, fall back to an approximate IP-based lookup rather than giving
 * up. `precise: false` on the result lets the caller word its message
 * accordingly ("near you" vs. "approximately near you").
 */
export async function getCurrentPosition(): Promise<{ latitude: number; longitude: number; precise: boolean }> {
  if (typeof navigator !== "undefined" && navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      if (status.state === "denied") {
        throw new Error(
          "Location is blocked for this site. Click the icon left of the address bar, set Location to Allow, then reload the page."
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Location is blocked")) throw e;
      // Permissions API unavailable or refused the query — fall through and try anyway.
    }
  }

  try {
    const pos = await browserGeolocate();
    return { ...pos, precise: true };
  } catch (preciseError) {
    // A denied permission is a real "no" — respect it, don't route around it.
    if (preciseError instanceof Error && preciseError.message.startsWith("Location access was denied")) {
      throw preciseError;
    }
    try {
      const pos = await ipGeolocate();
      return { ...pos, precise: false };
    } catch {
      // Both failed (offline, or the free IP API is rate-limiting). Fall back
      // to the time zone before giving up: a country-level guess still puts
      // the right part of the world on the page.
      const zoned = coordsFromTimeZone();
      if (zoned) return { ...zoned, precise: false };
      throw preciseError;
    }
  }
}

/**
 * Currency guessed from the browser's own time zone — instant and offline, so
 * prices render in the right currency on the first paint instead of flashing
 * dollars. Only covers the currencies the app actually offers; anything else
 * falls through to the IP lookup below, and finally to USD.
 */
const ZONE_CURRENCIES: Array<[RegExp, string]> = [
  [/^Asia\/(Kolkata|Calcutta)$/, "INR"],
  [/^Asia\/Tokyo$/, "JPY"],
  [/^Asia\/Singapore$/, "SGD"],
  [/^Europe\/London$/, "GBP"],
  [/^Australia\//, "AUD"],
  [/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|Montreal|Regina|St_Johns)$/, "CAD"],
  [/^America\//, "USD"],
  [/^Pacific\/(Honolulu)$/, "USD"],
  [/^Europe\//, "EUR"],
];

export function currencyFromTimeZone(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    for (const [pattern, code] of ZONE_CURRENCIES) {
      if (pattern.test(zone)) return code;
    }
  } catch {
    // Intl unavailable — fall through.
  }
  return null;
}

/**
 * Currency from the visitor's IP. More accurate than the time zone (a laptop
 * carried abroad keeps its home zone), but needs a network round trip, so it
 * is used to confirm the guess above rather than to make it.
 */
export async function currencyFromIp(): Promise<string | null> {
  const info = await ipLookup();
  return info?.currency ?? null;
}


export interface ApproximateLocation {
  latitude: number;
  longitude: number;
  precise: boolean;
}

/** One lookup per page load, shared by every caller of getApproximateLocation. */
let approximateLocationInFlight: Promise<ApproximateLocation | null> | null = null;

/**
 * Coarse location for ranking carousel rows. Never throws and never nags.
 *
 * Distinct from getCurrentPosition on purpose. That function treats a denied
 * permission as a real "no", which is right when the guest has just clicked
 * "Nearby" — routing around an explicit refusal there would be wrong. But the
 * home page only wants to know roughly which country it is showing, and
 * blocking precise location should not demote a guest in Delhi to whichever
 * city happens to have the most listings (Lagos). IP and time zone need no
 * permission at all, so a refusal of GPS falls through to them rather than
 * abandoning localisation entirely.
 *
 * Returns null only when every source fails, which callers read as "leave the
 * generic rows alone".
 *
 * Memoised for the life of the page: the "All" tab asks for homes, experiences
 * and services independently, and without this each one would fire its own
 * geolocation prompt and IP lookup for the same answer.
 */
export function getApproximateLocation(): Promise<ApproximateLocation | null> {
  approximateLocationInFlight ??= resolveApproximateLocation();
  return approximateLocationInFlight;
}

async function resolveApproximateLocation(): Promise<ApproximateLocation | null> {
  let denied = false;
  if (typeof navigator !== "undefined" && navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      denied = status.state === "denied";
    } catch {
      // Permissions API unavailable — try anyway.
    }
  }

  if (!denied) {
    try {
      const pos = await browserGeolocate();
      return { ...pos, precise: true };
    } catch {
      // Fall through to the permission-free sources.
    }
  }

  try {
    const pos = await ipGeolocate();
    return { ...pos, precise: false };
  } catch {
    // rate-limited, offline, or blocked by an extension
  }

  const zoned = coordsFromTimeZone();
  return zoned ? { ...zoned, precise: false } : null;
}
