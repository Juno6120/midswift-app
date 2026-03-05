"use client";

import { useEffect, useState, useCallback, type ReactElement } from "react";
import { X, Github, Mail, Globe } from "lucide-react";
import Image from "next/image";

// I'm setting up this interface to ensure TypeScript knows exactly what props this modal needs.
// We just need a boolean to know if it's open, and a function to call when it's time to close.
interface AboutDeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// I added an explicit return type of `JSX.Element | null` here.
// It's a solid best practice to explicitly declare what your components return!
export default function AboutDeveloperModal({
  isOpen,
  onClose,
}: AboutDeveloperModalProps): ReactElement | null {
  // I'm explicitly typing this state as a boolean.
  // We use this to keep the component in the DOM just long enough for the CSS exit animations to finish.
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // I'm wrapping our escape key listener in a useCallback.
  // This memoizes the function so its reference doesn't change on every render,
  // which keeps the useEffect below from re-triggering unnecessarily.
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  // Here, I'm using an effect to handle all the side effects of the modal opening and closing.
  useEffect(() => {
    if (isOpen) {
      // When we open, I trigger the animation state, lock the background scrolling so the user
      // doesn't scroll the page behind the modal, and start listening for the Escape key.
      setIsAnimating(true);
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEsc);
    } else {
      // When we close, I set a 300ms delay before toggling isAnimating off.
      // This gives our Tailwind transition classes enough time to fade everything out smoothly.
      setTimeout(() => setIsAnimating(false), 300);
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    }

    // This cleanup function is crucial! If the component completely unmounts,
    // I want to make absolutely sure we unlock the scroll and remove the key listener to avoid memory leaks.
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, handleEsc]);

  // If the modal isn't told to be open, AND it's done animating its exit,
  // I just return null to keep the DOM totally clean.
  if (!isOpen && !isAnimating) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-200 flex items-center justify-center p-4 md:p-6"
    >
      <div
        className={`absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-90 overflow-hidden
          bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl
          border border-teal-500/15 dark:border-teal-400/10
          rounded-[42px]
          shadow-[0_20px_60px_-10px_rgba(20,184,166,0.25),0_32px_80px_-20px_rgba(0,0,0,0.35)]
          transition-all duration-300 transform
          ${
            isOpen
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-8 scale-95"
          }`}
      >
        <div className="absolute -top-28 -left-28 w-72 h-72 bg-teal-400/20 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-28 -right-28 w-72 h-72 bg-emerald-400/15 rounded-full blur-[90px] pointer-events-none" />

        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-6 right-6 z-10 p-2.5 rounded-full 
                     bg-white/70 dark:bg-zinc-800/60
                     text-zinc-500 
                     hover:text-teal-700 dark:hover:text-teal-300
                     hover:scale-110 active:scale-95
                     backdrop-blur-md
                     transition-all duration-200 group"
        >
          <X size={16} className="transition-transform group-hover:rotate-90" />
        </button>

        <div className="relative px-8 pt-12 pb-10 flex flex-col items-center text-center">
          <div className="relative group mb-6">
            <div className="absolute -inset-1.5 bg-linear-to-tr from-teal-500 via-emerald-400 to-cyan-300 rounded-full opacity-30 group-hover:opacity-60 blur-md transition-opacity duration-500" />

            <div className="relative h-24 w-24 rounded-full p-0.75 bg-linear-to-tr from-teal-500 via-emerald-400 to-cyan-300">
              <div className="relative h-full w-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-2 ring-white dark:ring-zinc-900">
                <Image
                  src="/icons/lonavatar.png"
                  alt="Lon"
                  fill
                  sizes="96px"
                  priority
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5 mb-6">
            <h3
              id="modal-title"
              className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              Lon
            </h3>

            <div
              className="inline-flex px-3 py-1 rounded-full
                            bg-teal-500/10
                            border border-teal-500/25
                            backdrop-blur-sm"
            >
              <p className="text-teal-700 dark:text-teal-300 font-bold text-[10px] uppercase tracking-[0.18em]">
                The Developer
              </p>
            </div>
          </div>

          <p className="text-zinc-600 dark:text-zinc-400 text-[15px] leading-relaxed mb-6">
            Hi, I’m Lon! I’m a full-stack developer on a mission to build web
            apps that are{" "}
            <span className="text-zinc-950 dark:text-zinc-100 font-semibold">
              compact
            </span>
            ,{" "}
            <span className="text-zinc-950 dark:text-zinc-100 font-semibold">
              intuitive
            </span>
            , and{" "}
            <span className="text-zinc-950 dark:text-zinc-100 font-semibold">
              genuinely useful
            </span>
            . My development philosophy is simple:{" "}
            {/* I swapped the literal quotes here for HTML entities (&quot;) to keep React's linter happy! */}
            <span className="italic">&quot;Almost bug-free! :D&quot;</span>
            <span className="block mt-4 pl-4">
              Thanks for checking out my work!
            </span>
          </p>

          <div className="flex justify-center gap-4 pt-4 border-t border-teal-500/10 w-full text-zinc-700 dark:text-zinc-300">
            <Mail size={20} />
            <span className="font-medium">yasisangelon@gmail.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
