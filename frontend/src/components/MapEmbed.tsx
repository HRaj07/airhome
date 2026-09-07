export default function MapEmbed({ latitude, longitude, label }: { latitude: number; longitude: number; label: string }) {
  const delta = 0.01;
  const bbox = `${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
      <iframe
        title={`Map showing the location of ${label}`}
        src={src}
        className="h-80 w-full grayscale-0"
        loading="lazy"
      />
      <p className="border-t border-neutral-200 bg-white px-4 py-2 text-xs text-hof dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        Exact location provided after booking. Map data © OpenStreetMap contributors.
      </p>
    </div>
  );
}
