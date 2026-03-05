"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoveLeft, Home, SearchX } from "lucide-react";

/**
 * I'm explicitly defining this as a Functional Component to keep things
 * type-safe and clear for anyone else reading my code.
 */
export default function NotFound(): React.JSX.Element {
  // I'm grabbing the router instance here so I can programmatically
  // send users back to their previous page.
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-[#FDFCFB] text-slate-900 font-sans flex items-center justify-center overflow-hidden">
      {/* I’m building a custom "glass" background effect here. 
          I’m using absolute positioning and heavy blurs to create those 
          soft teal and rose blobs that float behind the content. 
      */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-teal-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-rose-100/30 rounded-full blur-[120px]" />
        <div className="absolute inset-0 backdrop-blur-[60px]" />
      </div>

      <div className="relative z-10 max-w-md w-full px-6 text-center">
        {/* I want a hero icon that feels modern, so I'm wrapping the SearchX 
            icon in a rounded white box with a subtle backdrop filter. 
        */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2rem] flex items-center justify-center shadow-xl shadow-slate-200/50">
            <SearchX className="w-12 h-12 text-teal-600" />
          </div>
        </div>

        {/* Big 404 Header: I'm using a very light slate so it's bold but not distracting. */}
        <h1 className="text-7xl font-black text-slate-200 mb-2">404</h1>

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

        <div className="flex flex-col gap-4">
          {/* When the user clicks this, I’m telling the browser to just 
              pop back to the last entry in their history stack. 
              I added type="button" to ensure it doesn't accidentally 
              try to submit a form if I ever wrap this in one.
          */}
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <MoveLeft className="w-5 h-5" />
            Go Back
          </button>

          {/* I’m using the Next.js Link component here for the home button 
              to make sure the transition is near-instant without a full page reload. 
          */}
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
