export default function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-neutral-50 py-8 text-sm text-hof dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© {new Date().getFullYear()} airhome, Inc. A student project clone — not affiliated with Airbnb.</p>
        <div className="flex gap-4">
          <span>Privacy · Terms · Sitemap (mock)</span>
        </div>
      </div>
    </footer>
  );
}
