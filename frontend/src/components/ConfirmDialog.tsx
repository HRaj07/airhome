export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm animate-slide-up rounded-2xl bg-white p-6 dark:bg-neutral-900">
        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        <p className="mb-6 text-sm text-hof dark:text-neutral-400">{description}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${danger ? "bg-rausch hover:bg-rausch_dark" : "bg-ink dark:bg-white dark:text-ink"}`}
          >
            {busy ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
