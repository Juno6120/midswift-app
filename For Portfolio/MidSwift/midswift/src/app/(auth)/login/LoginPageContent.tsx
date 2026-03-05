"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthForm from "./AuthForm";

/**
 * Hey! I'm defining this as the main content for the Login page.
 * I'm importing React and using 'React.ReactElement' to be strictly
 * explicit about what this component returns, keeping TypeScript perfectly happy.
 */
export default function LoginPageContent(): React.ReactElement {
  // I'm initializing the router and search params hooks so I can
  // interact with the URL and handle navigation logic.
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Here, I'm checking if there's a "switch" flag in the URL.
   * If the URL has ?switch=true, I'll know the user is trying to
   * switch accounts rather than just doing a fresh login.
   */
  const isSwitching: boolean = searchParams.get("switch") === "true";

  /**
   * I'm wrapping the back navigation in this handler.
   * It's a simple way to let the user "cancel" and go back
   * to where they were if they change their mind.
   */
  const handleCancel = (): void => {
    router.back();
  };

  return (
    /**
     * I'm setting up a full-screen container here.
     * I'm using a very light background (#FDFCFB) and hidden overflow
     * to make sure those decorative background blobs don't cause scrollbars.
     */
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-[#FDFCFB] overflow-hidden">
      {/* This is the "background layer." 
          I'm using absolute positioning and high blur values to create 
          that soft, modern "glassmorphism" look with animated teal and indigo blobs.
      */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[0%] left-[-5%] w-[60%] h-[60%] bg-teal-100/50 rounded-full blur-[120px] animate-glass-1" />
        <div className="absolute bottom-[0%] right-[-5%] w-[60%] h-[60%] bg-emerald-100/50 rounded-full blur-[120px] animate-glass-2" />
        <div className="absolute top-[20%] right-[20%] w-[40%] h-[40%] bg-indigo-50/60 rounded-full blur-[100px] animate-glass-3" />
        <div className="absolute inset-0 backdrop-blur-[100px]" />
        <div className="absolute inset-0 bg-grain" />
      </div>

      {/* This is the main card. 
          I've added a backdrop blur and a slight white tint (bg-white/70) 
          so it feels like a frosted glass pane sitting on top of the blobs.
      */}
      <div className="relative z-10 w-full max-w-md bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white/60">
        {/* I'm only showing this "X" button if 'isSwitching' is true. 
            It feels more intuitive to give users a way out if they 
            accessed this page via a specific "switch account" action.
        */}
        {isSwitching && (
          <button
            onClick={handleCancel}
            aria-label="Cancel"
            className="absolute top-5 right-5 text-gray-500 hover:text-gray-800 transition-colors text-2xl font-semibold"
          >
            ×
          </button>
        )}

        {/* Branding section: Just getting the logo and the titles centered nicely. */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-20 w-20 bg-white/50 backdrop-blur-md rounded-3xl flex items-center justify-center mb-4 rotate-3 shadow-inner border border-white/40">
            <img
              src="/icons/midswift-logo.svg"
              alt="Midswift Logo"
              className="h-14 w-auto object-contain"
            />
          </div>
          <h1 className="text-4xl font-black text-teal-800 tracking-tight">
            MidSwift
          </h1>
          <p className="text-gray-500 font-medium">
            Labo - RHU Reporting Portal
          </p>
        </div>

        {/* I'm dropping the AuthForm component here. 
            This is where the actual input fields and submission logic live. 
        */}
        <AuthForm />
      </div>
    </div>
  );
}
