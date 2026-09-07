"use client";

import { Home, DoorOpen, Users, Hotel, LucideIcon } from "lucide-react";
import type { PropertyType } from "@/lib/types";

const CATEGORIES: { type: PropertyType; label: string; icon: LucideIcon }[] = [
  { type: "entire_home", label: "Entire homes", icon: Home },
  { type: "private_room", label: "Private rooms", icon: DoorOpen },
  { type: "shared_room", label: "Shared rooms", icon: Users },
  { type: "hotel_room", label: "Hotel rooms", icon: Hotel },
];

export default function CategoryRow({
  selected,
  onSelect,
}: {
  selected: PropertyType | "";
  onSelect: (t: PropertyType | "") => void;
}) {
  return (
    <div className="scrollbar-none flex gap-6 overflow-x-auto border-b border-neutral-200 px-1 py-4 dark:border-neutral-800">
      {CATEGORIES.map(({ type, label, icon: Icon }) => {
        const active = selected === type;
        return (
          <button
            key={type}
            onClick={() => onSelect(active ? "" : type)}
            className={`flex shrink-0 flex-col items-center gap-2 border-b-2 pb-2 text-xs transition-colors ${
              active
                ? "border-ink text-ink dark:border-white dark:text-white"
                : "border-transparent text-hof hover:border-neutral-300 hover:text-ink dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2 : 1.5} />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
