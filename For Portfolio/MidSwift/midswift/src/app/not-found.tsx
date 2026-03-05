"use client";

import type { JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoveLeft, Home, SearchX } from "lucide-react";

// I'm explicitly setting the return type to JSX.Element here.
// It's a good TypeScript habit to strictly define what my components output.
export default function NotFound(): JSX.Element {
  // I'm grabbing the Next.js router instance right off the bat.
  // I'll need this later so I can wire up a functional "Go Back" button for the user.
  const router = useRouter();

  return (
    // I'm wrapping the entire page in a full-screen flex container.
    // I made sure to set overflow-hidden and relative positioning so my background blur effects don't break the layout or cause weird scrollbars.
    <div className="relative min-h-screen bg-[#FDFCFB] text-slate-900 font-sans flex items-center justify-center overflow-hidden">
      // I'm setting up a decorative background layer here. // I made it
      absolute and removed pointer events so it just sits behind everything
      without interfering with clicks.
      <div className="absolute inset-0 z-0 pointer-events-none">
        // I'm placing two massive, heavily blurred circles—one teal and one
        rose—in opposite corners. // Then, I'm layering a full-screen
        backdrop-blur over them to create that really smooth, frosted
        glassmorphism effect.
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-teal-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-rose-100/30 rounded-full blur-[120px]" />
        <div className="absolute inset-0 backdrop-blur-[60px]" />
      </div>
      // This is my main content wrapper. // I'm keeping it up front with z-10
      and restricting the maximum width so the text doesn't stretch too far on
      huge monitors.
      <div className="relative z-10 max-w-md w-full px-6 text-center">
        // I'm building a nice little floating glass card to house the SearchX
        icon. // I added a subtle white border and a shadow to really make it
        pop off that blurred background.
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2rem] flex items-center justify-center shadow-xl shadow-slate-200/50">
            <SearchX className="w-12 h-12 text-teal-600" />
          </div>
        </div>
        // I'm laying out the main headers. // For the 404 text, I made it
        massive but faded out so it doesn't scream at the user.
        <h1 className="text-7xl font-black text-slate-200 mb-2">404</h1>
        // For the main title, I wanted it to look modern, so I used background
        clipping to paint the word "System" with a teal-to-emerald gradient.
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">
          Lost in the{" "}
          <span className="bg-linear-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent">
            System?
          </span>
        </h2>
        <p className="text-slate-500 font-medium mb-10">
          We couldn't find the page you're looking for. It might have been
          moved, deleted, or perhaps it never existed in this ward.
        </p>
        // Here are my action buttons. I stacked them in a flex column so they
        are easy to tap on mobile devices.
        <div className="flex flex-col gap-4">
          // For the first option, I'm hooking into that router instance I
          grabbed earlier. // Calling router.back() acts exactly like the user
          hitting their browser's back button.
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <MoveLeft className="w-5 h-5" />
            Go Back
          </button>
          // For the fallback option, I'm using Next.js's built-in Link
          component instead of a standard anchor tag. // This ensures that
          clicking "Back to Home" gives us a lightning-fast client-side
          transition without a full page reload.
          <Link
            href="/"
            className="flex items-center justify-center gap-3 bg-teal-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-teal-200 hover:bg-teal-700 transition-all active:scale-95"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
