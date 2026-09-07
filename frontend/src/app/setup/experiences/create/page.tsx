import CategoryChooser, { CategoryOption } from "@/components/CategoryChooser";

export const metadata = { title: "Host an experience — airhome" };

/**
 * The five themes Airbnb groups experiences under.
 *
 * `value` is the category actually stored on the row, and it deliberately
 * reuses the catalogue's existing vocabulary ("Wellness", "Outdoors") rather
 * than the card's wording. A new experience then joins the carousel row its
 * peers are already in, instead of creating a category of one.
 */
const EXPERIENCE_CATEGORIES: CategoryOption[] = [
  { value: "Art & culture", label: "Art and design", emoji: "🖼️" },
  { value: "Wellness", label: "Fitness and wellness", emoji: "🧘" },
  { value: "Food & drink", label: "Food and drink", emoji: "🍝" },
  { value: "History & culture", label: "History and culture", emoji: "🏛️" },
  { value: "Outdoors", label: "Nature and outdoors", emoji: "🏞️" },
];

export default function CreateExperiencePage() {
  return (
    <CategoryChooser
      kind="experience"
      heading="What experience will you offer to guests?"
      options={EXPERIENCE_CATEGORIES}
    />
  );
}
