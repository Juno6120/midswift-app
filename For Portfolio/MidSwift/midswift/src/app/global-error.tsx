"use client";

import { useEffect } from "react";
import { RefreshCcw, AlertOctagon } from "lucide-react";

/**
 * I'm defining this interface to keep my component props clean and explicit.
 * Next.js passes a 'digest' property for error tracking in production,
 * and the 'reset' function is the standard way to try and recover.
 */
interface GlobalErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    /**
     * I'm logging the error here so I can actually see what went wrong
     * in my monitoring tools or the browser console.
     */
    console.error("Critical Layout Error caught by global-error.tsx:", error);
  }, [error]);

  return (
    /**
     * Since global-error.tsx wraps the entire application—including the
     * root layout—I'm including the <html> and <body> tags here.
     * If I don't, the page will break because the main layout is gone.
     */
    <html lang="en">
      <body>
        <div className="relative min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6 overflow-hidden font-sans">
          {/* I'm creating a glassmorphism background effect with these blurred shapes */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-[10%] right-[-5%] w-[60%] h-[60%] bg-rose-200/40 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-orange-100/40 rounded-full blur-[120px]" />
            <div className="absolute inset-0 backdrop-blur-[60px]" />
          </div>

          <div className="relative z-10 max-w-lg w-full bg-white/50 backdrop-blur-2xl border border-rose-100/60 p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-rose-900/10 text-center">
            {/* I'm wrapping the icon in a styled container to make the error look a bit more "official" */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-rose-100/50 rounded-3xl mb-6 border border-rose-200">
              <AlertOctagon className="w-10 h-10 text-rose-600" />
            </div>

            <h1 className="text-3xl font-black text-slate-900 mb-4">
              Critical <span className="text-rose-600">System</span> Error
            </h1>

            <p className="text-slate-600 font-medium mb-8">
              A severe error occurred in the application's core layout. We need
              to completely reload the system to get things back on track.
            </p>

            <div className="flex justify-center">
              {/**
               * I'm choosing a hard window reload here. While Next.js provides a
               * reset() function, a global layout crash often means the app state
               * is corrupted, so a full refresh is the safest way to recover.
               */}
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-3 bg-rose-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-rose-700 transition-all active:scale-95 shadow-lg shadow-rose-200 group"
              >
                <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                Hard Reboot
              </button>
            </div>

            {/* I'm displaying the Error ID (digest) to help users report the specific incident */}
            <p className="mt-8 text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">
              Error ID: {error.digest || "Fatal Core Error"}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
