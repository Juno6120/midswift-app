"use client";

// I'm defining this interface to make the contract for this modal crystal clear —
// anyone using <LogoutModal /> has to tell it whether it's open, how to close it,
// and what to do when the user actually confirms they want to log out.
interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

// I'm exporting this as a named export so it's easy to tree-shake and import
// explicitly wherever it's needed across the app.
export function LogoutModal({
  isOpen,
  onClose,
  onConfirm,
}: LogoutModalProps): React.ReactElement | null {
  // I'm doing an early return here so the modal doesn't render anything into
  // the DOM when it's not needed. No portal, no hidden div — just nothing.
  // This keeps things lean and avoids any accidental accessibility issues
  // with hidden-but-present focusable elements.
  if (!isOpen) return null;

  return (
    // I'm using `fixed inset-0` to cover the entire viewport, and `z-[100]`
    // to make sure this floats above everything else — navbars, sidebars,
    // toasts, the works. The flex centering here saves me from any
    // absolute-positioning math for the card itself.
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* I'm rendering this backdrop div as a sibling to the modal card
          (not a parent) so the blur and overlay don't accidentally bleed
          into the card's own styles. Clicking it triggers onClose, which
          gives users the familiar "click outside to dismiss" behaviour. */}
      <div
        className="absolute inset-0 bg-zinc-900/60 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* I'm using `relative` here to pull the card out of the backdrop's
          stacking context, so it always sits on top. The animate-in + fade-in
          + zoom-in combo gives it a subtle entrance that feels polished
          without being distracting. */}
      <div className="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-2xl shadow-zinc-200/20 dark:shadow-none w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          {/* I'm centering a circular icon container here to immediately
              signal "warning" to the user before they even read a word.
              The red tinted ring is intentionally subtle — alarming enough
              to register, but not so aggressive that it feels like an error. */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-500/15 border border-red-500/20 rounded-full mb-4">
            {/* I'm inlining this SVG rather than pulling in an icon library
                so there's zero extra dependency for a single glyph. It's the
                standard "log out / arrow-right-from-box" path. */}
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                // I'm passing strokeWidth as a number here — that's the
                // correct SVG attribute type in React/TSX rather than a string.
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>

          {/* I'm keeping the heading short and action-oriented — "Confirm Sign Out"
              tells the user exactly what decision they're about to make. */}
          <h3 className="text-xl font-bold text-center text-zinc-900 dark:text-zinc-100 mb-2">
            Confirm Sign Out
          </h3>

          {/* I'm adding a one-liner consequence message here so there's zero
              ambiguity. Users shouldn't have to guess what happens next. */}
          <p className="text-center text-zinc-500 dark:text-zinc-400 mb-8">
            Are you sure you want to log out? You will need to sign back in to
            access your dashboard.
          </p>

          {/* I'm using a flex column on mobile and a row on sm+ screens so
              the buttons stack naturally on small viewports but sit side by
              side on larger ones. The gap-3 keeps the spacing consistent
              regardless of which layout is active. */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* This is the "safe" path — Cancel — so I'm giving it a
                low-emphasis ghost style. It's visually secondary, which
                nudges users toward reading the Sign Out button first. */}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-zinc-200/50 dark:border-zinc-700/50 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl hover:bg-zinc-500/10 dark:hover:bg-zinc-800/50 transition-colors"
            >
              Cancel
            </button>

            {/* This is the destructive action, so I'm using a solid red fill
                to make it stand out. The active:scale-95 gives a satisfying
                "press" micro-interaction on tap/click, and the shadow anchors
                it visually without feeling over-the-top. */}
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-500 text-white font-semibold rounded-xl shadow-lg shadow-red-500/20 dark:shadow-red-500/10 border border-red-500/50 transition-all active:scale-95"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
