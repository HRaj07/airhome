import { ReactNode } from "react";
import { SearchX } from "lucide-react";

export default function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="text-neutral-300 dark:text-neutral-600">{icon ?? <SearchX size={48} strokeWidth={1.2} />}</div>
      <h3 className="text-lg font-semibold text-ink dark:text-neutral-100">{title}</h3>
      {description && <p className="max-w-sm text-sm text-hof dark:text-neutral-400">{description}</p>}
      {action}
    </div>
  );
}
