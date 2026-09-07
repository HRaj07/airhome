import type {
  Amenity,
  Booking,
  HostDashboard,
  ListingDetail,
  ListingFormData,
  PaginatedListings,
  Review,
  User,
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
  page?: number;
  limit?: number;
}

function toQueryString(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export const listingsApi = {
  search: (params: SearchParams) => request<PaginatedListings>(`/listings${toQueryString(params)}`),
  get: (id: number | string) => request<ListingDetail>(`/listings/${id}`),
  availability: (id: number | string) => request<{ blocked_dates: string[] }>(`/listings/${id}/availability`),
  mine: () => request<ListingDetail[]>("/listings/mine"),
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
  list: () => request<import("./types").ListingCard[]>("/wishlist"),
  add: (listingId: number) => request<{ ok: boolean }>(`/wishlist/${listingId}`, { method: "POST" }),
  remove: (listingId: number) => request<{ ok: boolean }>(`/wishlist/${listingId}`, { method: "DELETE" }),
};

// ---------- Host ----------
export const hostApi = {
  dashboard: () => request<HostDashboard>("/host/dashboard"),
};

export function setToken(token: string) {
  if (typeof window !== "undefined") window.localStorage.setItem("airbnb_token", token);
}

export function clearToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem("airbnb_token");
}
