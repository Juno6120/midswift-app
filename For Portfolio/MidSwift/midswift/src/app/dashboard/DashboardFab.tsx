"use client";

import { useState } from "react";
import FabMenu from "@/src/components/ui/FabMenu";
import ReportBugModal from "@/src/components/modals/ReportBugModal";
import AboutDeveloperModal from "@/src/components/modals/AboutDeveloperModal";

/**
 * I'm building this component to serve as the floating action hub for the dashboard.
 * It's responsible for managing the "pop-up" state for our utility modals.
 */
export default function DashboardFab() {
  // I’m explicitly typing these as booleans. While TypeScript can infer this,
  // I like being clear about the intent, especially when passing these down as props.
  const [isBugModalOpen, setIsBugModalOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);

  return (
    <>
      {/* I'm passing these 'setter' functions into the FabMenu. 
        When I click a button in that menu, it'll trigger these functions 
        and flip our local state to true, which tells the modals to appear.
      */}
      <FabMenu
        onReportBug={() => setIsBugModalOpen(true)}
        onAbout={() => setIsAboutModalOpen(true)}
      />

      {/* Here, I’m linking the Bug Modal to our state. 
        I'm also giving it a way to "talk back" to the parent by providing 
        an onClose function that sets the state back to false.
      */}
      <ReportBugModal
        isOpen={isBugModalOpen}
        onClose={() => setIsBugModalOpen(false)}
      />

      {/* Same logic here for the About modal. I keep these as separate 
        state variables so I can open or close them independently 
        without one interfering with the other.
      */}
      <AboutDeveloperModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </>
  );
}
