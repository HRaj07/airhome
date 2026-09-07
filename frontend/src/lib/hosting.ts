/**
 * The "Become a host" wizard, described as data: the steps in order, which of
 * Airbnb's three phases each belongs to, and the option lists the steps show.
 * The page at /become-a-host/[id]/[step] renders whatever step the URL names;
 * this file is what makes Back/Next and the progress bar work.
 */
import type { ListingDetail, PropertyType } from "./types";

export type WizardStep =
  | "about-your-place"
  | "structure"
  | "privacy-type"
  | "location"
  | "floor-plan"
  | "stand-out"
  | "amenities"
  | "photos"
  | "title"
  | "description"
  | "finish-setup"
  | "booking-settings"
  | "visibility"
  | "price"
  | "weekend-price"
  | "discounts"
  | "legal"
  | "receipt";

/** Airbnb's three phases; the progress bar is split into three segments. */
export const PHASES: { title: string; steps: WizardStep[] }[] = [
  { title: "Tell us about your place", steps: ["about-your-place", "structure", "privacy-type", "location", "floor-plan"] },
  { title: "Make it stand out", steps: ["stand-out", "amenities", "photos", "title", "description"] },
  { title: "Finish up and publish", steps: ["finish-setup", "booking-settings", "visibility", "price", "weekend-price", "discounts", "legal", "receipt"] },
];

export const STEPS: WizardStep[] = PHASES.flatMap((p) => p.steps);

export function isWizardStep(s: string): s is WizardStep {
  return (STEPS as string[]).includes(s);
}

export function stepIndex(step: WizardStep): number {
  return STEPS.indexOf(step);
}

export function nextStep(step: WizardStep): WizardStep | null {
  const i = stepIndex(step);
  return i >= 0 && i < STEPS.length - 1 ? STEPS[i + 1] : null;
}

export function prevStep(step: WizardStep): WizardStep | null {
  const i = stepIndex(step);
  return i > 0 ? STEPS[i - 1] : null;
}

/** Progress of each of the three bar segments, 0–1, for the current step. */
export function phaseProgress(step: WizardStep): number[] {
  const i = stepIndex(step);
  let seen = 0;
  return PHASES.map((phase) => {
    const start = seen;
    seen += phase.steps.length;
    if (i < start) return 0;
    if (i >= seen) return 1;
    return (i - start + 1) / phase.steps.length;
  });
}

/** "Which of these best describes your place?" — Airbnb's list, in its order. */
export const STRUCTURE_TYPES: { id: string; label: string; emoji: string }[] = [
  { id: "house", label: "House", emoji: "🏠" },
  { id: "flat", label: "Flat/apartment", emoji: "🏢" },
  { id: "barn", label: "Barn", emoji: "🛖" },
  { id: "bed_and_breakfast", label: "Bed & breakfast", emoji: "☕" },
  { id: "boat", label: "Boat", emoji: "⛵" },
  { id: "cabin", label: "Cabin", emoji: "🪵" },
  { id: "campervan", label: "Campervan/motorhome", emoji: "🚐" },
  { id: "casa_particular", label: "Casa particular", emoji: "🏘️" },
  { id: "castle", label: "Castle", emoji: "🏰" },
  { id: "cave", label: "Cave", emoji: "🕳️" },
  { id: "container", label: "Container", emoji: "📦" },
  { id: "cycladic_home", label: "Cycladic home", emoji: "🏛️" },
  { id: "dammuso", label: "Dammuso", emoji: "🧱" },
  { id: "dome", label: "Dome", emoji: "⛺" },
  { id: "earth_home", label: "Earth home", emoji: "🌱" },
  { id: "farm", label: "Farm", emoji: "🚜" },
  { id: "guesthouse", label: "Guesthouse", emoji: "🏡" },
  { id: "hotel", label: "Hotel", emoji: "🏨" },
  { id: "houseboat", label: "Houseboat", emoji: "🛥️" },
  { id: "kezhan", label: "Kezhan", emoji: "🏮" },
  { id: "minsu", label: "Minsu", emoji: "🎋" },
  { id: "riad", label: "Riad", emoji: "🕌" },
  { id: "ryokan", label: "Ryokan", emoji: "🏯" },
  { id: "shepherds_hut", label: "Shepherd's hut", emoji: "🐑" },
  { id: "tent", label: "Tent", emoji: "🏕️" },
  { id: "tiny_home", label: "Tiny home", emoji: "🛖" },
  { id: "tower", label: "Tower", emoji: "🗼" },
  { id: "treehouse", label: "Treehouse", emoji: "🌳" },
  { id: "trullo", label: "Trullo", emoji: "🪨" },
  { id: "windmill", label: "Windmill", emoji: "🌬️" },
  { id: "yurt", label: "Yurt", emoji: "⛺" },
];

export function structureLabel(id: string): string {
  return STRUCTURE_TYPES.find((s) => s.id === id)?.label ?? "Place";
}

/** "What type of place will guests have?" */
export const PRIVACY_TYPES: { id: PropertyType; title: string; body: string; emoji: string }[] = [
  { id: "entire_home", title: "An entire place", body: "Guests have the whole place to themselves.", emoji: "🏠" },
  { id: "private_room", title: "A room", body: "Guests have their own room in a home, plus access to shared spaces.", emoji: "🚪" },
  { id: "shared_room", title: "A shared room in a hostel", body: "Guests sleep in a shared room in a professionally managed hostel with staff on-site 24/7.", emoji: "🛏️" },
];

/** "Next, let's describe your house" — pick up to two. */
export const HIGHLIGHTS: { id: string; label: string; emoji: string }[] = [
  { id: "peaceful", label: "Peaceful", emoji: "🕊️" },
  { id: "unique", label: "Unique", emoji: "✨" },
  { id: "family_friendly", label: "Family-friendly", emoji: "👨‍👩‍👧" },
  { id: "stylish", label: "Stylish", emoji: "🎨" },
  { id: "central", label: "Central", emoji: "📍" },
  { id: "spacious", label: "Spacious", emoji: "🪟" },
];

/** Airbnb's three amenity groups on the amenities step, by amenity name. */
export const GUEST_FAVOURITES = ["Wifi", "TV", "Kitchen", "Washing machine", "Free parking", "Air conditioning", "Dedicated workspace", "Heating"];
export const STANDOUT_AMENITIES = ["Pool", "Hot tub", "Private patio or balcony", "BBQ grill", "Garden", "Fireplace", "Gym", "Outdoor furniture", "Sea view", "Mountain view", "EV charger"];
export const SAFETY_AMENITIES = ["Smoke alarm", "First aid kit", "Fire extinguisher", "Carbon monoxide alarm"];

/** Sample photos a host can drop in when they have no URLs handy. */
export const SAMPLE_PHOTOS: { url: string; label: string }[] = [
  { url: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200", label: "Living room" },
  { url: "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200", label: "Bedroom" },
  { url: "https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=1200", label: "Kitchen" },
  { url: "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200", label: "Bathroom" },
  { url: "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=1200", label: "Exterior" },
  { url: "https://images.pexels.com/photos/2635038/pexels-photo-2635038.jpeg?auto=compress&cs=tinysrgb&w=1200", label: "Balcony" },
  { url: "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200", label: "Bedroom 2" },
  { url: "https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg?auto=compress&cs=tinysrgb&w=1200", label: "Dining" },
];

export const TITLE_MAX = 32;
export const DESCRIPTION_MAX = 500;

/** The guest service fee, for the "guest price" shown on the price step. Must
 *  match the listing's service_fee_pct, which is what checkout actually adds —
 *  quoting the host 14% while charging the guest 12% made the wizard lie. */
export const GUEST_FEE_PCT = 0.12;
/** What Airbnb keeps from the host. */
export const HOST_FEE_PCT = 0.03;

/** The step a draft should open at: the one it was saved on, or the first. */
export function resumeStep(listing: { wizard_step?: string }): WizardStep {
  const s = listing.wizard_step;
  return s && isWizardStep(s) ? s : "about-your-place";
}

/** Whether a listing has enough to publish, mirroring the server's checks. */
export function publishProblems(l: ListingDetail): string[] {
  const out: string[] = [];
  if (!l.title.trim()) out.push("Add a title");
  if (!l.city.trim()) out.push("Add the location");
  if (l.photos.length < 1) out.push("Add at least one photo");
  if (!l.price_per_night || l.price_per_night <= 0) out.push("Set a nightly price");
  if (!l.description.trim()) out.push("Write a description");
  return out;
}

/** Route helpers so the many links to the wizard agree on its shape. */
export function wizardHref(id: number | string, step: WizardStep): string {
  return `/become-a-host/${id}/${step}`;
}
