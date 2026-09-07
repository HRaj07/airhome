import type {
  Amenity,
  Booking,
  ExperienceBooking,
  ExperienceDetail,
  ExperienceKind,
  ExperienceReview,
  ExperienceRow,
  Destination,
  FeaturedRow,
  HostDashboard,
  PaginatedExperiences,
  ListingCard,
  ListingDetail,
  ListingFormData,
  PaginatedListings,
  Review,
  User,
  MapPin,
  UserProfile,
  NearestDestination,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("airbnb_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---------- Auth ----------
export interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  register: (data: { email: string; password: string; full_name: string; is_host: boolean }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => request<User>("/auth/me"),
};

// ---------- Amenities ----------
export const amenitiesApi = {
  list: () => request<Amenity[]>("/amenities"),
};

// ---------- Listings ----------
export interface SearchParams {
  location?: string;
  check_in?: string;
  check_out?: string;
  guests?: number;
  min_price?: number;
  max_price?: number;
  property_type?: string;
  amenities?: string; // csv ids
  instant_book?: boolean;
  min_bathrooms?: number;
  /** Map viewport. When set, the map is the search area ("Homes in map area"). */
  sw_lat?: number;
  sw_lng?: number;
  ne_lat?: number;
  ne_lng?: number;
  page?: number;
  limit?: number;
}

export interface MapBounds {
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
}

// `object` rather than Record<string, unknown>: interfaces such as SearchParams
// have no index signature, so they are not assignable to a Record.
function toQueryString(params: object): string {
  const usp = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export const listingsApi = {
  search: (params: SearchParams) => request<PaginatedListings>(`/listings${toQueryString(params)}`),
  /** Lightweight pins for every match in the viewport, beyond the current page. */
  mapPins: (params: SearchParams) => request<MapPin[]>(`/listings/map${toQueryString(params)}`),
  /** Homepage rows. Pass coordinates to rank them by proximity to the visitor. */
  featured: (coords?: { latitude: number; longitude: number }) =>
    request<FeaturedRow[]>(
      `/listings/featured${coords ? toQueryString({ lat: coords.latitude, lng: coords.longitude }) : ""}`
    ),
  get: (id: number | string) => request<ListingDetail>(`/listings/${id}`),
  availability: (id: number | string) => request<{ blocked_dates: string[] }>(`/listings/${id}/availability`),
  mine: () => request<ListingCard[]>("/listings/mine"),
  create: (data: ListingFormData) => request<ListingDetail>("/listings", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number | string, data: ListingFormData) =>
    request<ListingDetail>(`/listings/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number | string) => request<{ ok: boolean }>(`/listings/${id}`, { method: "DELETE" }),
};

// ---------- Bookings ----------
export const bookingsApi = {
  create: (data: { listing_id: number; check_in: string; check_out: string; guests_count: number }) =>
    request<Booking>("/bookings", { method: "POST", body: JSON.stringify(data) }),
  mine: () => request<Booking[]>("/bookings/mine"),
  forListing: (listingId: number | string) => request<Booking[]>(`/bookings/listing/${listingId}`),
  cancel: (id: number) => request<{ ok: boolean }>(`/bookings/${id}`, { method: "DELETE" }),
};

// ---------- Reviews ----------
export const reviewsApi = {
  list: (listingId: number | string) => request<Review[]>(`/listings/${listingId}/reviews`),
  create: (listingId: number | string, data: { rating: number; comment: string }) =>
    request<Review>(`/listings/${listingId}/reviews`, { method: "POST", body: JSON.stringify(data) }),
};

// ---------- Wishlist ----------
export const wishlistApi = {
  list: () => request<ListingCard[]>("/wishlist"),
  add: (listingId: number) => request<{ ok: boolean }>(`/wishlist/${listingId}`, { method: "POST" }),
  remove: (listingId: number) => request<{ ok: boolean }>(`/wishlist/${listingId}`, { method: "DELETE" }),
};

// ---------- Host ----------
export const hostApi = {
  dashboard: () => request<HostDashboard>("/host/dashboard"),
};

// ---------- Destinations (search autocomplete) ----------
export const usersApi = {
  profile: (id: number | string) => request<UserProfile>(`/users/${id}`),
  /** Edit your own profile. Send only the fields that changed. */
  updateMe: (data: { full_name?: string; bio?: string; home_city?: string; languages?: string; is_host?: boolean }) =>
    request<User>("/users/me", { method: "PATCH", body: JSON.stringify(data) }),
};

export const destinationsApi = {
  search: (q?: string, limit = 6) => request<Destination[]>(`/destinations${toQueryString({ q, limit })}`),
  /** The closest city with inventory to a coordinate — for "Nearby". */
  nearest: (latitude: number, longitude: number) =>
    request<NearestDestination>(`/destinations/nearest${toQueryString({ lat: latitude, lng: longitude })}`),
};

// ---------- Experiences & Services ----------
export interface ExperienceSearchParams {
  kind: ExperienceKind;
  location?: string;
  category?: string;
  date?: string;
  guests?: number;
  page?: number;
  limit?: number;
}

export const experiencesApi = {
  featured: (kind: ExperienceKind, coords?: { latitude: number; longitude: number }) =>
    request<ExperienceRow[]>(
      `/experiences/featured${toQueryString({
        kind,
        lat: coords?.latitude,
        lng: coords?.longitude,
      })}`
    ),
  search: (params: ExperienceSearchParams) => request<PaginatedExperiences>(`/experiences${toQueryString(params)}`),
  categories: (kind: ExperienceKind) => request<string[]>(`/experiences/categories?kind=${kind}`),
  get: (id: number | string) => request<ExperienceDetail>(`/experiences/${id}`),
  book: (id: number | string, data: { date: string; guests_count: number }) =>
    request<ExperienceBooking>(`/experiences/${id}/bookings`, { method: "POST", body: JSON.stringify(data) }),
  myBookings: () => request<ExperienceBooking[]>("/experiences/bookings/mine"),
  cancelBooking: (id: number) => request<{ ok: boolean }>(`/experiences/bookings/${id}`, { method: "DELETE" }),
  review: (id: number | string, data: { rating: number; comment: string }) =>
    request<ExperienceReview>(`/experiences/${id}/reviews`, { method: "POST", body: JSON.stringify(data) }),
};

export function setToken(token: string) {
  if (typeof window !== "undefined") window.localStorage.setItem("airbnb_token", token);
}

export function clearToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem("airbnb_token");
}
