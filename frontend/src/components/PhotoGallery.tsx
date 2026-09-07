"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Grid2X2 } from "lucide-react";
import type { Photo } from "@/lib/types";

export default function PhotoGallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const sorted = [...photos].sort((a, b) => a.position - b.position);
  const main = sorted[0];
  const rest = sorted.slice(1, 5);

  return (
    <div className="relative">
      <div className="grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl" style={{ height: 420 }}>
        <button
          onClick={() => setLightboxIndex(0)}
          className="relative col-span-4 row-span-2 sm:col-span-2 sm:row-span-2"
        >
          {main ? (
            <Image src={main.url} alt={title} fill sizes="50vw" className="object-cover" priority />
          ) : (
            <div className="h-full w-full bg-neutral-200 dark:bg-neutral-800" />
          )}
        </button>
        {rest.map((p, i) => (
          <button key={p.id} onClick={() => setLightboxIndex(i + 1)} className="relative hidden sm:block">
            <Image src={p.url} alt={`${title} photo ${i + 2}`} fill sizes="25vw" className="object-cover" />
          </button>
        ))}
        {Array.from({ length: Math.max(0, 4 - rest.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="hidden bg-neutral-100 dark:bg-neutral-800 sm:block" />
        ))}
      </div>

      {sorted.length > 1 && (
        <button
          onClick={() => setLightboxIndex(0)}
          className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold shadow-md dark:bg-neutral-900"
        >
          <Grid2X2 size={16} />
          Show all photos
        </button>
      )}

      {lightboxIndex !== null && (
        <Lightbox photos={sorted} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onIndexChange={setLightboxIndex} title={title} />
      )}
    </div>
  );
}

function Lightbox({
  photos,
  index,
  onClose,
  onIndexChange,
  title,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  title: string;
}) {
  const photo = photos[index];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-4 text-white">
        <button onClick={onClose} aria-label="Close gallery" className="rounded-full p-2 hover:bg-white/10">
          <X size={22} />
        </button>
        <span className="text-sm">
          {index + 1} / {photos.length}
        </span>
      </div>
      <div className="relative flex-1">
        <Image src={photo.url} alt={`${title} photo ${index + 1}`} fill sizes="100vw" className="object-contain" />
        {index > 0 && (
          <button
            onClick={() => onIndexChange(index - 1)}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 hover:bg-white sm:left-6"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            onClick={() => onIndexChange(index + 1)}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 hover:bg-white sm:right-6"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
