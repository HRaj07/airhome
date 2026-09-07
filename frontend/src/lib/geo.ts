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

/** Wraps navigator.geolocation in a promise; rejects with a readable message. */
export function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
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
            : "Couldn't determine your location right now";
        reject(new Error(msg));
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  });
}
