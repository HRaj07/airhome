import CategoryChooser, { CategoryOption } from "@/components/CategoryChooser";

export const metadata = { title: "Host a service — airhome" };

/** The nine service types Airbnb lists, in its own alphabetical order. */
const SERVICE_CATEGORIES: CategoryOption[] = [
  { value: "Catering", label: "Catering", emoji: "🍽️" },
  { value: "Chefs", label: "Chef", emoji: "🔪" },
  { value: "Hair", label: "Hairstyling", emoji: "💇" },
  { value: "Make-up", label: "Make-up", emoji: "💄" },
  { value: "Massage", label: "Massage", emoji: "💆" },
  { value: "Training", label: "Personal training", emoji: "🏋️" },
  { value: "Photography", label: "Photography", emoji: "📷" },
  { value: "Prepared meals", label: "Prepared meals", emoji: "🍱" },
  { value: "Spa treatments", label: "Spa treatments", emoji: "🧖" },
];

export default function CreateServicePage() {
  return (
    <CategoryChooser
      kind="service"
      heading="What service will you provide?"
      options={SERVICE_CATEGORIES}
    />
  );
}
