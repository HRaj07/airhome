"use client";

import Carousel from "./Carousel";
import ListingCard from "./ListingCard";
import type { ListingCard as ListingCardType } from "@/lib/types";

export default function ListingCarousel({
  title,
  city,
  listings,
}: {
  title: string;
  city: string;
  listings: ListingCardType[];
}) {
  return (
    <Carousel title={title} href={`/homes?location=${encodeURIComponent(city)}`} itemCount={listings.length}>
      {listings.map((l) => (
        <ListingCard key={l.id} listing={l} compact />
      ))}
    </Carousel>
  );
}
