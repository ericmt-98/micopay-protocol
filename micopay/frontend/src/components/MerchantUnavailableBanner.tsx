interface MerchantUnavailableBannerProps {
  onWait: () => void;
  onCancelRematch: () => void;
  cancelLoading?: boolean;
}

/**
 * Shown when the matched merchant is offline or paused during an active trade (#31).
 */
export default function MerchantUnavailableBanner({
  onWait,
  onCancelRematch,
  cancelLoading = false,
}: MerchantUnavailableBannerProps) {
  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-3">
        <span
          className="material-symbols-outlined shrink-0 text-amber-700"
          style={{ fontVariationSettings: '"FILL" 1' }}
        >
          pause_circle
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold leading-snug">This merchant is temporarily unavailable</p>
          <p className="text-xs text-amber-900/80 leading-relaxed">
            You can wait for them to return, or cancel this trade and pick another merchant. Your amount will stay
            the same when you go back to the list.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onWait}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100/80 transition-colors"
            >
              Wait
            </button>
            <button
              type="button"
              disabled={cancelLoading}
              onClick={onCancelRematch}
              className="rounded-lg bg-amber-800 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-900 disabled:opacity-60 transition-colors"
            >
              {cancelLoading ? 'Cancelling…' : 'Cancel and re-match'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
