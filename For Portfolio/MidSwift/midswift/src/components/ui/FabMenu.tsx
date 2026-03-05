"use client";

// I'm importing our React hooks and UI components.
// We need 'use client' at the top since we're dealing with state and DOM events.
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Bug, Info, X } from "lucide-react";

// I'm defining the shape of our props here.
// Adding 'readonly' is a TypeScript best practice—it guarantees we won't
// accidentally try to reassign these functions inside our component.
interface FabMenuProps {
  readonly onReportBug: () => void;
  readonly onAbout: () => void;
}

export default function FabMenu({ onReportBug, onAbout }: FabMenuProps) {
  // I need a way to track whether our Floating Action Button (FAB) menu is open or closed.
  const [isFabOpen, setIsFabOpen] = useState(false);

  // I'm grabbing a reference to the main container div.
  // This helps me figure out exactly where the menu is sitting on the screen later.
  const fabRef = useRef<HTMLDivElement>(null);

  // I'm setting up a function to detect clicks outside of our menu.
  // Wrapping it in useCallback keeps the function reference stable across re-renders.
  const handleClickOutside = useCallback((event: MouseEvent) => {
    // If our menu exists in the DOM, and the thing you just clicked on is NOT inside our menu...
    if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
      // ...then you clicked outside, so I'm closing the menu.
      setIsFabOpen(false);
    }
  }, []);

  // I'm using an effect to actually listen for those mouse clicks on the whole document.
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);

    // It's super important to clean up after ourselves.
    // This return function removes the listener when the component unmounts
    // so we don't cause memory leaks.
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  return (
    <>
      {/* This is our master container parked in the bottom right corner.
        I'm setting 'pointer-events-none' here so that if a user clicks the empty, 
        transparent space around the menu, the click passes right through to the page underneath.
      */}
      <div
        ref={fabRef}
        className="fixed bottom-8 right-8 z-100 flex flex-col items-end gap-3 pointer-events-none"
      >
        {/* Here's the wrapper for our actual popup buttons. 
          I'm toggling Tailwind classes based on the 'isFabOpen' state to smoothly 
          fade, slide, and scale these buttons into view.
        */}
        <div
          className={`
            flex flex-col gap-2 transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]
            ${
              isFabOpen
                ? "opacity-100 translate-y-0 scale-100 visible pointer-events-auto"
                : "opacity-0 translate-y-6 scale-95 invisible pointer-events-none"
            }
          `}
        >
          {/* This is the "Report Bug" button. 
            When clicked, I'm firing off the prop callback you provided and then immediately 
            closing the menu so it doesn't stay stuck open.
          */}
          <button
            onClick={() => {
              onReportBug();
              setIsFabOpen(false);
            }}
            disabled={!isFabOpen}
            className="
              flex items-center gap-3
              bg-white/70 backdrop-blur-xl
              border border-white/80
              shadow-[0_4px_24px_rgba(0,0,0,0.08)]
              rounded-2xl px-4 py-3
              hover:bg-white/90 hover:-translate-y-0.5
              active:scale-95 transition-all group
            "
          >
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-all duration-300">
              <Bug size={16} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-slate-600 tracking-wide">
              Report Bug
            </span>
          </button>

          {/* Same idea here for the "Meet the Dev" button. 
            Fire the callback, close the menu, and handle the visual hover states.
          */}
          <button
            onClick={() => {
              onAbout();
              setIsFabOpen(false);
            }}
            disabled={!isFabOpen}
            className="
              flex items-center gap-3
              bg-white/70 backdrop-blur-xl
              border border-white/80
              shadow-[0_4px_24px_rgba(0,0,0,0.08)]
              rounded-2xl px-4 py-3
              hover:bg-white/90 hover:-translate-y-0.5
              active:scale-95 transition-all group
            "
          >
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
              <Info size={16} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-slate-600 tracking-wide">
              Meet the Dev
            </span>
          </button>
        </div>

        {/* This is the main trigger button that opens and closes everything. 
          I have to explicitly set 'pointer-events-auto' here so you can actually 
          click it, overriding the 'none' we set on the parent wrapper.
        */}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          aria-expanded={isFabOpen}
          aria-label="Toggle Support Menu"
          className={`
            relative h-12 w-12
            rounded-2xl flex items-center justify-center
            shadow-[0_8px_24px_rgba(13,148,136,0.35)]
            hover:scale-110 active:scale-95
            transition-all duration-500 focus:outline-none
            overflow-hidden pointer-events-auto
            ${
              isFabOpen
                ? "bg-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.3)]"
                : "bg-linear-to-br from-teal-500 to-emerald-600"
            }
          `}
        >
          {/* Just a little visual flair! 
            When the menu is closed, I'm rendering a soft, pulsing ring behind the button to draw the eye.
          */}
          {!isFabOpen && (
            <span className="absolute inset-0 rounded-2xl ring-2 ring-teal-400/40 animate-ping opacity-60 pointer-events-none" />
          )}

          {/* This div holds the logo image. 
            I'm using CSS transforms to spin it and shrink it down to nothing (scale-0) 
            when you open the menu.
          */}
          <div
            className={`
              absolute inset-0 h-full w-full transition-all duration-700
              ${isFabOpen ? "rotate-135 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}
            `}
          >
            <Image
              src="/icons/logo.png"
              alt="MidSwift Logo"
              fill
              priority
              className="object-cover"
            />
          </div>

          {/* And here's the close 'X' icon. 
            It does the exact opposite of the logo—when the menu opens, this icon 
            spins into view and scales up to normal size.
          */}
          <div
            className={`
              absolute transition-all duration-500
              ${isFabOpen ? "rotate-0 scale-100 opacity-100" : "rotate-[-135deg] scale-0 opacity-0"}
            `}
          >
            <X className="text-white w-5 h-5" />
          </div>
        </button>
      </div>
    </>
  );
}
