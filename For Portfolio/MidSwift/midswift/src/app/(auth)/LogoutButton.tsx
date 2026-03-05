"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoutModal } from "@/src/components/modals/LogoutModal";

export function LogoutButton(): React.JSX.Element {
  // I’m grabbing the router instance here so I can redirect the user once they're signed out.
  const router = useRouter();

  // I'm initializing my Supabase client to interact with the authentication service.
  const supabase = createClient();

  // I’m using these state hooks to track whether the modal is visible and if the logout process is currently running.
  // I've added explicit boolean types here just to be clear about what these values should always be.
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // This is the main function I'm using to handle the logout flow.
  // I've marked it as a Promise<void> since it's an asynchronous operation that doesn't return a value.
  const handleLogout = async (): Promise<void> => {
    // I’m setting the loading state to true so I can disable buttons or show a spinner if I want to.
    setLoading(true);

    // Here, I’m telling Supabase to sign the user out.
    const { error } = await supabase.auth.signOut();

    // If there's an issue signing out, I’ll catch it here, log it, and stop the loading state.
    if (error) {
      console.error("Logout error:", error.message);
      setLoading(false);
      return;
    }

    // Now that the session is cleared, I'll close the modal.
    setIsOpen(false);

    // I’m using .replace() instead of .push() because I don't want the user to be able to
    // click the 'back' button and end up back on a protected page.
    router.replace("/login");

    // I’m calling .refresh() to make sure the server components re-run and clear out any cached user data.
    router.refresh();
  };

  return (
    <>
      {/* I'm setting up this button as the primary trigger to open our confirmation modal. */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen(true)}
        className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full justify-start gap-2"
      >
        <LogOut className="h-5 w-5" />
        Log Out
      </Button>

      {/* I’m placing the LogoutModal here and passing it the state and functions it needs.
          This keeps the UI clean by only showing the actual popup when 'isOpen' is true.
      */}
      <LogoutModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
