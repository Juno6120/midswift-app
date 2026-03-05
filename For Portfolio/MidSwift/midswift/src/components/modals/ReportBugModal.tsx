"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Send, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";

// I'm defining the props for the LogoutModal so TypeScript knows exactly what functions and state it needs to work.
interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  // If the modal isn't supposed to be open, I'm just returning null to render nothing at all.
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* I'm rendering a clickable background overlay here. When clicked, it triggers the onClose prop to dismiss the modal. */}
      <div
        className="absolute inset-0 bg-zinc-900/60 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* This is the actual modal card containing the UI. I've placed it relative to the backdrop so it sits on top. */}
      <div className="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-2xl shadow-zinc-200/20 dark:shadow-none w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-500/15 border border-red-500/20 rounded-full mb-4">
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-center text-zinc-900 dark:text-zinc-100 mb-2">
            Confirm Sign Out
          </h3>
          <p className="text-center text-zinc-500 dark:text-zinc-400 mb-8">
            Are you sure you want to log out? You will need to sign back in to
            access your dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-zinc-200/50 dark:border-zinc-700/50 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl hover:bg-zinc-500/10 dark:hover:bg-zinc-800/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-500 text-white font-semibold rounded-xl shadow-lg shadow-red-500/20 dark:shadow-red-500/10 border border-red-500/50 transition-all active:scale-95"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// I'm setting up the interface for the Report Bug modal to ensure we pass the correct boolean and close handler.
interface ReportBugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportBugModal({
  isOpen,
  onClose,
}: ReportBugModalProps) {
  // I'm tracking several pieces of state here: animation timing, form input, loading status, and successful submission.
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Here, I'm grabbing the Supabase client so we can communicate with the database.
  const supabase = createClient();

  // I'm wrapping this in a useCallback so it doesn't get recreated on every render. It just listens for the Escape key to close the modal.
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  // I'm using this effect to lock the page scroll when the modal is open, and to clean up event listeners when it closes.
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEsc);
    } else {
      setTimeout(() => {
        setIsAnimating(false);
        setIsSuccess(false);
        setDescription("");
      }, 300);
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    }

    // I'm making sure to clean up the scroll lock and event listener if the component unmounts unexpectedly.
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, handleEsc]);

  // I'm handling the form submission here. I prevent the default page reload, trigger the loading state, and reach out to Supabase.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // First, I need to check who is currently logged in so I can tie this bug report to their user ID.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Auth session missing! Please ensure you are logged in.",
        );
      }

      // Now I'm taking the user's description and pushing it up to the 'bug_reports' table.
      const { error: insertError } = await supabase.from("bug_reports").insert([
        {
          description,
          user_id: user.id,
        },
      ]);

      if (insertError) throw insertError;

      // Everything worked, so I'm flipping the success state to true to show them the thank-you screen.
      setIsSuccess(true);

      // I'm giving them a couple of seconds to read the success message before automatically closing the modal.
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: unknown) {
      // I switched 'any' to 'unknown' here for better TypeScript safety. I'm checking if the error is a standard Error object to safely extract its message.
      console.error("Submission Error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      alert(`Failed to send report: ${errorMessage}`);
    } finally {
      // Whether it succeeded or failed, I need to turn off the loading spinner so the user can interact again.
      setIsSubmitting(false);
    }
  };

  // If the modal isn't open and it's not currently in the middle of a close animation, I'm returning null to hide it completely.
  if (!isOpen && !isAnimating) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-bug-title"
      className="fixed inset-0 z-200 flex items-center justify-center p-4 md:p-6"
    >
      {/* I'm rendering a dark, blurred background that fades in and out based on the isOpen state. Clicking it closes the modal. */}
      <div
        className={`absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* This is the main modal container. I'm using transform classes to give it that nice floating pop-in effect. */}
      <div
        className={`relative w-full max-w-105 overflow-hidden
          bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl
          border border-teal-500/15 dark:border-teal-400/10
          rounded-[42px]
          shadow-[0_20px_60px_-10px_rgba(20,184,166,0.25),0_32px_80px_-20px_rgba(0,0,0,0.35)]
          transition-all duration-300 transform
          ${isOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"}`}
      >
        {/* I'm dropping in a couple of blurred background blobs here to give the card a subtle glowing gradient effect inside. */}
        <div className="absolute -top-28 -left-28 w-72 h-72 bg-teal-400/20 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-28 -right-28 w-72 h-72 bg-emerald-400/15 rounded-full blur-[90px] pointer-events-none" />

        {/* This is the close 'X' button stationed at the top right of the modal. */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-6 right-6 z-10 p-2.5 rounded-full 
                       bg-white/70 dark:bg-zinc-800/60
                       text-zinc-500 hover:text-teal-700 dark:hover:text-teal-300
                       hover:scale-110 active:scale-95 transition-all duration-200 group"
        >
          <X size={16} className="transition-transform group-hover:rotate-90" />
        </button>

        <div className="relative px-8 pt-12 pb-10">
          {/* I'm using a ternary operator here. If it hasn't successfully submitted yet, I show the bug report form. Otherwise, I show the success message. */}
          {!isSuccess ? (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative group mb-5">
                  <div className="absolute -inset-2 bg-linear-to-tr from-teal-500 via-emerald-400 to-cyan-300 rounded-2xl opacity-25 blur-md transition-opacity duration-500 group-hover:opacity-50" />
                  <div className="relative w-14 h-14 rounded-2xl bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md flex items-center justify-center border border-teal-500/20">
                    <AlertCircle className="w-6 h-6 text-teal-600 dark:text-teal-300" />
                  </div>
                </div>

                <h2
                  id="report-bug-title"
                  className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
                >
                  Report an Issue
                </h2>

                <p className="text-zinc-600 dark:text-zinc-400 text-[15px] leading-relaxed mt-2 max-w-sm">
                  Found an issue with the app? Let us know below. You may also
                  email us at{" "}
                  <a
                    href="mailto:yasisangelon@gmail.com"
                    className="font-bold text-teal-600 dark:text-teal-400 hover:underline underline-offset-4 transition-all"
                  >
                    yasisangelon@gmail.com
                  </a>
                </p>
              </div>

              {/* This is the actual form wrapper tied to the handleSubmit function I wrote earlier. */}
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                    Description
                  </label>
                  {/* I'm binding the textarea to the 'description' state so it updates as the user types, and disabling it if a submission is in progress. */}
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What were you trying to do? What happened instead?"
                    className="w-full bg-white/60 dark:bg-zinc-800/60 border border-teal-500/20 rounded-2xl px-5 py-3.5 text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 backdrop-blur-md transition-all resize-none"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* This submit button conditionally renders a spinner icon if the app is currently sending data to Supabase. */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl px-6 py-4 shadow-lg shadow-teal-600/20 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Submit Report
                      <Send size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center py-10 animate-in fade-in zoom-in-95 duration-500">
              <div className="relative mb-6">
                <div className="absolute -inset-4 bg-teal-500/20 rounded-full blur-xl animate-pulse" />
                <CheckCircle2 className="w-20 h-20 text-teal-500 relative z-10" />
              </div>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                Thank You!
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 max-w-70">
                Your report has been received. We'll look into it right away.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
