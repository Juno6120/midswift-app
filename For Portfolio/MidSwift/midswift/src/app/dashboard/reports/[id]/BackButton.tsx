"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import ReportSavedModal from "@/src/components/modals/ReportSavedModal";

// I'm defining an interface here to clearly outline what data this button needs.
// It's much cleaner than typing it inline and makes the component easier to scale later.
interface BackButtonProps {
  reportType: string;
}

export default function BackButton({ reportType }: BackButtonProps) {
  // I'm using a boolean state to track the modal's visibility.
  // I’ve explicitly typed it as <boolean> so TypeScript doesn't have to guess.
  const [showModal, setShowModal] = useState<boolean>(false);

  // When someone clicks the back button, I'm intercepting that action
  // to show a "Report Saved" confirmation instead of just navigating away.
  const handleBackClick = () => {
    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleBackClick}
        className={cn(
          // I'm using these utility classes to handle the layout, glassmorphism,
          // and hover transitions all in one readable block.
          "group relative flex items-center gap-2.5 px-5 py-2.5 -ml-1",
          "bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md",
          "border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl",
          "text-zinc-500 dark:text-zinc-400 font-bold text-[13px] tracking-tight",
          "transition-all duration-300 ease-out",
          "hover:border-teal-500/30 hover:bg-white/80 dark:hover:bg-zinc-800/80",
          "hover:text-teal-600 dark:hover:text-teal-400 hover:shadow-lg hover:shadow-teal-500/10",
          "active:scale-95",
        )}
      >
        <div className="relative flex items-center justify-center">
          {/* I'm giving the arrow a slight leftward slide animation on hover 
              to give the user a visual hint that they're "going back". */}
          <ArrowLeft
            size={18}
            strokeWidth={2.5}
            className="transition-transform duration-300 group-hover:-translate-x-1.5"
          />
        </div>

        <span className="relative">Back to Dashboard</span>

        {/* I'm layering an absolute div here to create a very subtle 
            teal glow effect when the user hovers over the button. */}
        <div className="absolute inset-0 rounded-2xl bg-teal-500/0 group-hover:bg-teal-500/3 transition-colors duration-300 pointer-events-none" />
      </button>

      {/* I'm placing the modal here outside the button logic so it 
          can be controlled by the state we set up earlier. */}
      <ReportSavedModal isOpen={showModal} reportType={reportType} />
    </>
  );
}
