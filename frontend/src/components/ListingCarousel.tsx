"use client";

import Carousel from "./Carousel";
import ListingCard from "./ListingCard";
import type { ListingCard as ListingCardType } from "@/lib/types";

export default function ListingCarousel({
  title,
  city,
  listings,
  nights = 2,
}: {
  title: string;
  city: string;
  listings: ListingCardType[];
  nights?: number;
}) {
  return (
    <Carousel title={title} href={`/homes?location=${encodeURIComponent(city)}`} itemCount={listings.length}>
      {listings.map((l) => (
        <ListingCard key={l.id} listing={l} nights={nights} compact />
      ))}
    </Carousel>
  );
}
