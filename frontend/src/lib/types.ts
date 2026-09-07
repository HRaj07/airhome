export type PropertyType = "entire_home" | "private_room" | "shared_room" | "hotel_room";
export type BookingStatus = "confirmed" | "cancelled";

export interface User {
  id: number;
  email?: string;
  full_name: string;
  avatar_url: string;
  is_host: boolean;
  is_superhost: boolean;
  identity_verified?: boolean;
  bio: string;
  home_city?: string;
  languages?: string;
  created_at: string;
}

export interface Amenity {
  id: number;
  name: string;
  icon: string;
  /** Section of the "Show all amenities" modal. */
  group?: string;
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
  instant_book?: boolean;
  /** First few photos, so the card can offer a swipeable gallery. */
  photo_urls: string[];
  rating_avg: number;
  review_count: number;
  is_wishlisted: boolean;
  /** draft | published | unlisted — only the owner ever sees non-published cards. */
  status?: ListingStatus;
  /** Where the "Become a host" wizard resumes a draft. */
  wizard_step?: string;
}

export type ListingStatus = "draft" | "published" | "unlisted";

/** Everything the "Become a host" wizard collects beyond the classic form. */
export interface HostingFields {
  structure_type: string;
  host_highlights: string[];
  weekend_price: number | null;
  new_listing_discount: number;
  weekly_discount: number;
  monthly_discount: number;
  guest_visibility: "any" | "experienced";
  has_exterior_camera: boolean;
  has_noise_monitor: boolean;
  has_weapons: boolean;
}

export interface Photo {
  id: number;
  url: string;
  position: number;
}

export interface ListingDetail extends ListingCard, HostingFields {
  description: string;
  guest_access: string;
  other_notes: string;
  address: string;
  cleaning_fee: number;
  service_fee_pct: number;
  instant_book: boolean;
  host: User;
  host_years_hosting: number;
  photos: Photo[];
  amenities: Amenity[];
  blocked_dates: string[];
  highlights: ListingHighlight[];
  rating_categories: RatingCategory[];
  sleeping: SleepingArea[];
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
  experiences: HostExperienceSummary[];
  services: HostExperienceSummary[];
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
  instant_book?: boolean;
  guest_access?: string;
  other_notes?: string;
  amenity_ids: number[];
  photo_urls: string[];
}

/** One wizard step's worth of changes: send only what the step touched. */
export type ListingDraftUpdate = Partial<
  Pick<
    ListingFormData,
    | "title" | "description" | "property_type" | "bedrooms" | "beds" | "bathrooms" | "max_guests"
    | "price_per_night" | "cleaning_fee" | "address" | "neighborhood" | "city" | "state" | "country"
    | "latitude" | "longitude" | "instant_book" | "amenity_ids" | "photo_urls"
  > &
    HostingFields & { clear_weekend_price: boolean; wizard_step: string }
>;

// ---------- Hosting dashboard ----------

export interface HostReservation {
  id: number;
  kind: "home" | "experience" | "service";
  listing_id: number;
  listing_title: string;
  cover_photo_url: string;
  city: string;
  guest_id: number;
  guest_name: string;
  guest_avatar_url: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests_count: number;
  total_price: number;
  host_payout: number;
  status: BookingStatus;
  created_at: string;
}

export interface HostReservations {
  checking_out: HostReservation[];
  currently_hosting: HostReservation[];
  arriving_soon: HostReservation[];
  upcoming: HostReservation[];
  pending_review: HostReservation[];
  all: HostReservation[];
}

export interface EarningsMonth {
  month: number;
  label: string;
  paid: number;
  upcoming: number;
}

export interface EarningsTransaction {
  id: number;
  kind: "home" | "experience" | "service";
  date: string;
  listing_title: string;
  guest_name: string;
  nights: number;
  gross: number;
  host_fee: number;
  payout: number;
  status: "paid" | "upcoming" | "cancelled";
}

export interface HostEarnings {
  year: number;
  years: number[];
  total_year: number;
  paid_out: number;
  upcoming: number;
  bookings_count: number;
  nights_booked: number;
  avg_nightly: number;
  months: EarningsMonth[];
  transactions: EarningsTransaction[];
  host_fee_pct: number;
}

export interface ListingInsight {
  id: number;
  title: string;
  cover_photo_url: string;
  city: string;
  status: ListingStatus;
  rating_avg: number;
  review_count: number;
  wishlist_saves: number;
  bookings_30d: number;
  occupancy_30d: number;
  revenue_30d: number;
  revenue_total: number;
}

export interface InsightReview {
  id: number;
  listing_title: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface SuperhostCriterion {
  value: number;
  target: number;
  met: boolean;
}

export interface HostInsights {
  rating_avg: number;
  review_count: number;
  five_star_pct: number;
  occupancy_30d: number;
  nights_booked_30d: number;
  wishlist_saves: number;
  superhost_progress: {
    is_superhost: boolean;
    rating: SuperhostCriterion;
    stays: SuperhostCriterion;
    cancellation_rate: SuperhostCriterion;
    response_rate: SuperhostCriterion;
  };
  listings: ListingInsight[];
  recent_reviews: InsightReview[];
  rating_breakdown: RatingCategory[];
}

export interface CalendarDayOut {
  date: string;
  price: number;
  blocked: boolean;
  booked: boolean;
  booking_id: number | null;
  guest_name: string;
  is_weekend: boolean;
  custom_price: boolean;
}

export interface CalendarMonth {
  listing_id: number;
  listing_title: string;
  base_price: number;
  weekend_price: number | null;
  days: CalendarDayOut[];
}

export interface EarningsEstimate {
  city: string;
  nightly_rate: number;
  nights: number;
  total: number;
  sample_size: number;
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

// ---------- Experiences & Services ----------

export type ExperienceKind = "experience" | "service";

export interface ExperienceCard {
  id: number;
  kind: ExperienceKind;
  category: string;
  title: string;
  city: string;
  country: string;
  price_per_guest: number;
  price_unit: "guest" | "group" | string;
  start_time: string;
  duration_minutes: number;
  max_guests: number;
  latitude: number;
  longitude: number;
  cover_photo_url: string;
  rating_avg: number;
  review_count: number;
}

export interface HostExperienceSummary extends ExperienceCard {
  booking_count: number;
  revenue: number;
}

/** What the host form submits to create or update an experience or a service. */
export interface ExperienceFormData {
  kind: ExperienceKind;
  category: string;
  title: string;
  description: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  price_per_guest: number;
  price_unit: string;
  duration_minutes: number;
  start_time: string;
  max_guests: number;
  photo_urls: string[];
}

export interface ExperienceAvailability {
  date: string;
  spots_left: number;
}

export interface ExperienceReview {
  id: number;
  author: User;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ExperienceDetail extends ExperienceCard {
  description: string;
  host: User;
  photos: Photo[];
  reviews: ExperienceReview[];
  availability: ExperienceAvailability[];
}

export interface ExperienceRow {
  title: string;
  key: string;
  /** What `key` holds, so the row links to the filter that matches it. */
  key_type?: "city" | "category";
  items: ExperienceCard[];
}

export interface PaginatedExperiences {
  items: ExperienceCard[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ExperienceBooking {
  id: number;
  experience: ExperienceCard;
  date: string;
  guests_count: number;
  total_price: number;
  status: BookingStatus;
  created_at: string;
}

/** URL base for a given kind: experiences live under /experiences, services under /services. */
export const KIND_PATH: Record<ExperienceKind, string> = {
  experience: "/experiences",
  service: "/services",
};

export interface MapPin {
  id: number;
  latitude: number;
  longitude: number;
  price_per_night: number;
  city: string;
}

export interface ProfileReview {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  subject_kind: "listing" | "experience" | string;
  subject_id: number;
  subject_title: string;
  subject_city: string;
}

export interface UserProfile extends User {
  trips: number;
  reviews_written: number;
  months_on_platform: number;
  reviews: ProfileReview[];
  listings: ListingCard[];
}

export interface ListingHighlight {
  icon: string;
  title: string;
  body: string;
}

export interface RatingCategory {
  key: string;
  label: string;
  score: number;
}

export interface SleepingArea {
  name: string;
  beds: string;
}

export interface NearestDestination {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  count: number;
  distance_km: number;
}

export interface Destination {
  kind: "city" | "neighborhood" | string;
  label: string;
  sublabel: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  count: number;
}
