"use client";
import { Heart, WarningOctagon, X } from "@phosphor-icons/react";
import { JSX } from "react";

// I'm setting up this interface to define exactly what props this component expects.
// I made these properties 'readonly' because React props should never be mutated directly inside the component!
interface LoadingProps {
  readonly isTimeout: boolean;
  readonly onClose: () => void;
}

// Here's my main LoadingScreen component. I'm passing in the timeout status and the close handler,
// and I'm explicitly telling TypeScript that this will return a JSX Element.
export default function LoadingScreen({
  isTimeout,
  onClose,
}: LoadingProps): JSX.Element {
  return (
    // I'm wrapping the whole screen in a fixed, z-indexed overlay with a nice blur effect
    // so it blocks interactions with the background while keeping a clean glass look.
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-white/85 backdrop-blur-md transition-all">
      {/* If the loading takes too long and hits a timeout, I'm rendering a little 'X' 
          button in the top right corner so the user isn't trapped on this screen forever. */}
      {isTimeout && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={22} weight="bold" className="text-slate-400" />
        </button>
      )}

      {/* This container holds the main visual—either the loading rings or the timeout warning. */}
      <div className="relative flex items-center justify-center">
        {/* I'm adding an outer background ring. If we're timed out, it just glows gently (amber). 
            If we're loading, it pulses outward in teal using my custom animation. */}
        <div
          className={`absolute w-28 h-28 rounded-full ${
            isTimeout
              ? "bg-amber-50 animate-pulse"
              : "bg-teal-50 animate-[ringPulse_1.2s_ease-in-out_infinite]"
          }`}
        />

        {/* This is the inner ring. I'm applying a slight animation delay to it when loading 
            so it creates a cool ripple effect with the outer ring. */}
        <div
          className={`absolute w-20 h-20 rounded-full ${
            isTimeout
              ? "bg-amber-100/60"
              : "bg-teal-100/60 animate-[ringPulse_1.2s_ease-in-out_infinite_0.1s]"
          }`}
        />

        {/* Here's the logic for the actual center icon. A timeout gives us an amber warning sign, 
            otherwise, we get a teal heart that physically beats to show the app is 'alive' and working. */}
        {isTimeout ? (
          <WarningOctagon
            size={44}
            weight="duotone"
            className="relative z-10 text-amber-500"
          />
        ) : (
          <Heart
            size={44}
            weight="fill"
            className="relative z-10 text-teal-600 animate-[heartbeat_1.2s_ease-in-out_infinite]"
          />
        )}
      </div>

      {/* I'm updating the title and description dynamically based on whether we are 
          still loading smoothly or if we hit a snag and timed out. */}
      <div className="mt-8 text-center max-w-65">
        <h2 className="text-[17px] font-semibold text-slate-800 tracking-tight">
          {isTimeout ? "Taking Longer Than Expected" : "Loading"}
        </h2>
        <p className="text-[13px] text-slate-400 mt-2 leading-relaxed font-normal">
          {isTimeout
            ? "This is taking a bit longer than usual. Please check your connection or try again."
            : "Please wait a moment while we get things ready for you."}
        </p>
      </div>

      {/* I only want this little indeterminate progress bar sliding back and forth 
          if we're actually still in the active loading phase. */}
      {!isTimeout && (
        <div className="mt-7 w-40 h-0.75 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-teal-500 rounded-full animate-[loadingBar_2s_ease-in-out_infinite]" />
        </div>
      )}

      {/* Just in case the top-right 'X' button isn't obvious enough, I'm giving the user 
          a very clear 'Dismiss' button at the bottom when a timeout happens. */}
      {isTimeout && (
        <button
          onClick={onClose}
          className="mt-6 px-5 py-2 text-[13px] font-medium text-teal-600 border border-teal-200 rounded-full hover:bg-teal-50 transition-colors"
        >
          Dismiss
        </button>
      )}

      {/* Finally, I'm keeping my custom keyframe animations scoped right here to the component 
          using styled-jsx so they don't leak into or conflict with the rest of my app. */}
      <style jsx>{`
        @keyframes heartbeat {
          0% {
            transform: scale(1);
          }
          14% {
            transform: scale(1.25);
          }
          28% {
            transform: scale(1);
          }
          42% {
            transform: scale(1.18);
          }
          56% {
            transform: scale(1);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes ringPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.6;
          }
          42% {
            transform: scale(1.12);
            opacity: 1;
          }
        }
        @keyframes loadingBar {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
