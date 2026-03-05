"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FilePlus } from "lucide-react";
import { NewReportModal } from "./NewReportModal";

export function NewReportTrigger() {
  // I’m using an explicit boolean state here to track if the modal is visible or hidden.
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // I need to hook into the URL search params and the router so I can react to specific URL triggers.
  const searchParams = useSearchParams();
  const router = useRouter();

  // I'm setting up this effect to handle "deep linking." If someone hits the dashboard with
  // ?action=new-report in the address bar, I want to catch that and pop the modal open immediately.
  useEffect(() => {
    const actionTrigger = searchParams.get("action");

    if (actionTrigger === "new-report") {
      // I found the trigger, so I'm flipping the switch to show the modal.
      setIsModalOpen(true);

      // After I open it, I'm cleaning up the URL by replacing it with the clean dashboard path.
      // I do this so the modal doesn't keep opening every time the user refreshes the page later.
      // I'm also setting scroll to false so the user's scroll position doesn't jump.
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, router]);

  return (
    <>
      {/* I'm using a standard button here to let users manually open the report flow. 
          I’ve added type="button" just to be safe so it never accidentally submits a form. */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center justify-center gap-3 bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-teal-100 transition-all hover:-translate-y-1 active:scale-95"
      >
        <FilePlus className="w-15 h-15" />
        New Monthly Report
      </button>

      {/* I’m mounting the actual modal component here. I pass in my 'isModalOpen' state 
          and a simple callback function that flips the state back to false when they close it. */}
      <NewReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
