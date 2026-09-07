"use client";

import Carousel from "./Carousel";
import ExperienceCard from "./ExperienceCard";
import type { ExperienceRow } from "@/lib/types";
import { KIND_PATH } from "@/lib/types";

export default function ExperienceCarousel({ row }: { row: ExperienceRow }) {
  const kind = row.items[0]?.kind ?? "experience";
  const param = kind === "service" ? "category" : "location";
  return (
    <Carousel title={row.title} href={`${KIND_PATH[kind]}?${param}=${encodeURIComponent(row.key)}`} itemCount={row.items.length}>
      {row.items.map((item) => (
        <ExperienceCard key={item.id} item={item} compact />
      ))}
    </Carousel>
  );
}
