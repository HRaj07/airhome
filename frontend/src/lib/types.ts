export type PropertyType = "entire_home" | "private_room" | "shared_room" | "hotel_room";
export type BookingStatus = "confirmed" | "cancelled";

export interface User {
  id: number;
  email?: string;
  full_name: string;
  avatar_url: string;
  is_host: boolean;
  is_superhost: boolean;
  bio: string;
  created_at: string;
}

export interface Amenity {
  id: number;
  name: string;
  icon: string;
}

export interface ListingCard {
  id: number;
  title: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  price_per_night: number;
  property_type: PropertyType;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  latitude: number;
  longitude: number;
  cover_photo_url: string;
  rating_avg: number;
  review_count: number;
  is_wishlisted: boolean;
}

export interface Photo {
  id: number;
  url: string;
  position: number;
}

export interface ListingDetail extends ListingCard {
  description: string;
  address: string;
  cleaning_fee: number;
  service_fee_pct: number;
  host: User;
  photos: Photo[];
  amenities: Amenity[];
  blocked_dates: string[];
}

export interface PaginatedListings {
  items: ListingCard[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface FeaturedRow {
  title: string;
  city: string;
  items: ListingCard[];
}

export interface BookingListingSummary {
  id: number;
  title: string;
  cover_photo_url: string;
  city: string;
  country: string;
  price_per_night: number;
}

export interface Booking {
  id: number;
  listing: BookingListingSummary;
  check_in: string;
  check_out: string;
  guests_count: number;
  nights: number;
  subtotal: number;
  cleaning_fee: number;
  service_fee: number;
  total_price: number;
  status: BookingStatus;
  created_at: string;
}

export interface Review {
  id: number;
  author: User;
  rating: number;
  comment: string;
  created_at: string;
}

export interface HostListingSummary extends ListingCard {
  booking_count: number;
  revenue: number;
}

export interface HostDashboard {
  listings: HostListingSummary[];
  upcoming_bookings: Booking[];
}

export interface ListingFormData {
  title: string;
  description: string;
  property_type: PropertyType;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  max_guests: number;
  price_per_night: number;
  cleaning_fee: number;
  service_fee_pct: number;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  amenity_ids: number[];
  photo_urls: string[];
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  entire_home: "Entire home",
  private_room: "Private room",
  shared_room: "Shared room",
  hotel_room: "Hotel room",
};

/** Short label used in card titles, e.g. "Home in Montmartre". */
export const PROPERTY_TYPE_SHORT: Record<PropertyType, string> = {
  entire_home: "Home",
  private_room: "Room",
  shared_room: "Shared room",
  hotel_room: "Hotel room",
};
