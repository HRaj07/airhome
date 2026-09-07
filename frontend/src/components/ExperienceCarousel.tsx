"use client";

import Carousel from "./Carousel";
import ExperienceCard from "./ExperienceCard";
import type { ExperienceRow } from "@/lib/types";
import { KIND_PATH } from "@/lib/types";

export default function ExperienceCarousel({ row }: { row: ExperienceRow }) {
  const kind = row.items[0]?.kind ?? "experience";
  // Services normally group by category, but a located row groups by city —
  // so follow what the row says its key is rather than assuming from kind.
  const keyType = row.key_type ?? (kind === "service" ? "category" : "city");
  const param = keyType === "category" ? "category" : "location";
  return (
    <Carousel title={row.title} href={`${KIND_PATH[kind]}?${param}=${encodeURIComponent(row.key)}`} itemCount={row.items.length}>
      {row.items.map((item) => (
        <ExperienceCard key={item.id} item={item} compact />
      ))}
    </Carousel>
  );
}
