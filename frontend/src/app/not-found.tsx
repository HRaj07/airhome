import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-8">
      <h1 className="text-3xl font-bold text-rausch">404</h1>
      <p className="mt-2 text-lg font-semibold">This page doesn&apos;t exist</p>
      <p className="mt-2 text-sm text-hof dark:text-neutral-400">
        The page you&apos;re looking for may have been moved or removed.
      </p>
      <Link href="/" className="mt-6 rounded-lg bg-rausch px-5 py-2.5 text-sm font-semibold text-white hover:bg-rausch_dark">
        Back to home
      </Link>
    </div>
  );
}
