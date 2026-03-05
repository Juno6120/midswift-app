"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { CheckCircle2, LayoutDashboard, ArrowRight } from "lucide-react";

// I'm setting up this interface to ensure we know exactly what data this modal needs.
// I've added the `readonly` modifier here as a TypeScript best practice since we shouldn't be mutating props directly inside the component.
interface ReportSavedModalProps {
  readonly isOpen: boolean;
  readonly reportType: string;
}

export default function ReportSavedModal({
  isOpen,
  reportType,
}: ReportSavedModalProps) {
  const router = useRouter();

  // Here, I'm explicitly typing our state as booleans. While TypeScript can often infer this,
  // being explicit is a great habit for readability and long-term maintenance.
  // I'm using `mounted` to make sure we're fully loaded on the client side before dealing with portals.
  const [mounted, setMounted] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // I'm firing this effect off exactly once when the component mounts.
  // It tells our component "Hey, we're on the client now!" which is crucial for Next.js SSR compatibility so hydration doesn't break.
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // This is where I'm handling the heavy lifting for the modal's behavior.
  useEffect(() => {
    if (isOpen) {
      // Whenever the modal opens, I trigger the animation state and lock the body scroll.
      // This stops the user from awkwardly scrolling the page in the background while the modal is up.
      setIsAnimating(true);
      document.body.style.overflow = "hidden";

      // I'm setting up a timer to automatically push the user to the dashboard.
      // I explicitly typed this with `ReturnType<typeof setTimeout>` to avoid annoying NodeJS vs Window timeout conflicts in Next.js!
      const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
        router.push("/dashboard");
      }, 2500);

      // It's always a good idea to clean up after ourselves. If the component unmounts
      // or the modal closes before the timer finishes, I clear the timeout and unlock the scroll.
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "unset";
      };
    } else {
      // If the modal isn't open, I'm just making sure our animation state knows about it.
      setIsAnimating(false);
    }
  }, [isOpen, router]);

  // If we haven't mounted yet, or if the modal is fully closed (not open AND not animating out),
  // I'm bailing out early and rendering nothing to keep the DOM clean.
  if (!mounted || (!isOpen && !isAnimating)) return null;

  // I'm using `createPortal` here to attach this modal directly to the `document.body`.
  // I love doing this because it breaks us out of the current DOM tree and completely avoids any CSS z-index wars with parent containers!
  return createPortal(
    <div
      className="fixed inset-0 z-1000 flex items-center justify-center p-4 md:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-500 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`relative w-full max-w-105 overflow-hidden
          bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl
          border border-teal-500/15 dark:border-teal-400/10
          rounded-[42px]
          shadow-[0_20px_60px_-10px_rgba(20,184,166,0.25),0_32px_80px_-20px_rgba(0,0,0,0.35)]
          transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) transform
          ${isOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-95"}`}
      >
        <div className="absolute -top-28 -left-28 w-72 h-72 bg-teal-400/20 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-28 -right-28 w-72 h-72 bg-emerald-400/15 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative px-8 pt-12 pb-10 flex flex-col items-center text-center">
          <div className="relative mb-8 group">
            <div className="absolute -inset-4 bg-linear-to-tr from-teal-500 via-emerald-400 to-cyan-300 rounded-full opacity-20 blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-3xl bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md flex items-center justify-center border border-teal-500/20 shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-teal-600 dark:text-teal-400" />
            </div>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-3">
            Report Saved!
          </h2>

          <p className="text-zinc-600 dark:text-zinc-400 text-[15px] leading-relaxed mb-8 max-w-70">
            Your{" "}
            <span className="font-bold text-teal-600 dark:text-teal-400">
              {reportType}
            </span>{" "}
            report has been secured. You can now manage it from your dashboard.
          </p>

          <p className="mt-6 text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
            Redirecting in seconds...
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
