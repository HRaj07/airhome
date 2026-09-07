"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { wishlistApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import ListingGrid from "@/components/ListingGrid";
import type { ListingCard } from "@/lib/types";

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/wishlist");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    wishlistApi
      .list()
      .then((items) => setListings(items.map((l) => ({ ...l, is_wishlisted: true }))))
      .catch(() => showToast("Couldn't load your wishlist", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (authLoading || !user) {
    return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <h1 className="mb-6 text-2xl font-semibold">Wishlist</h1>
      <ListingGrid
        listings={listings}
        loading={loading}
        hasMore={false}
        onLoadMore={() => {}}
        emptyMessage="Your wishlist is empty"
      />
      {!loading && listings.length === 0 && (
        <div className="mt-2 flex justify-center text-hof dark:text-neutral-400">
          <Heart size={20} className="mr-2" /> Tap the heart on any listing to save it here.
        </div>
      )}
    </div>
  );
}
