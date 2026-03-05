"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/src/lib/supabase/client";
import { useLoading } from "@/src/context/LoadingContext";
import LoadingScreen from "@/src/components/ui/LoadingScreen";
import LoaderStopper from "@/src/components/ui/LoaderStopper";
import {
  ArrowLeft,
  User,
  Save,
  CheckCircle,
  Camera,
  ShieldCheck,
} from "lucide-react";

// I'm setting a 6-second limit here so I can tell the UI when it's taking too long to load.
const LOADING_TIMEOUT_MS = 6000;

// I'm defining this interface to keep my status messages predictable and type-safe.
interface UpdateStatus {
  type: "success" | "error";
  msg: string;
}

export default function ProfilePage() {
  // I'm initializing my Supabase client and router to handle data and navigation.
  const supabase = createClient();
  const { startLoading } = useLoading();
  const router = useRouter();

  // I'm using these states to track the different loading phases of the page.
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPageLoading, setIsPageLoading] = useState<boolean>(true);
  const [isTimeout, setIsTimeout] = useState<boolean>(false);

  // I'm storing the user info here so I can bind it to my form inputs.
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  // I'm setting up this effect to trigger a "timeout" state if the profile doesn't load within my time limit.
  useEffect(() => {
    if (!isPageLoading) return;
    const timer = setTimeout(() => {
      setIsTimeout(true);
    }, LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isPageLoading]);

  // I want to pull the user's current data as soon as the component mounts.
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async (): Promise<void> => {
    // First, I'm grabbing the authenticated user from Supabase.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setEmail(user.email ?? "");

      // Now, I'm reaching out to my 'profiles' table to get the specific display name.
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name ?? "");
      }
    }

    // Once I have the data (or realize there isn't any), I'm turning off the loading states.
    setLoading(false);
    setIsPageLoading(false);
    setIsTimeout(false);
  };

  const handleUpdate = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    // I'm preventing the default form refresh so I can handle the update via AJAX.
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // I'm pushing the updated full name back to my Supabase table.
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);

    if (error) {
      setStatus({ type: "error", msg: "Failed to update profile." });
    } else {
      // If everything went well, I'm showing a success message and then heading back to the previous page.
      setStatus({ type: "success", msg: "Profile updated successfully!" });
      setTimeout(() => {
        setStatus(null);
        router.back();
      }, 1500);
    }
    setLoading(false);
  };

  // If the page is still in its initial fetch state, I'm showing the full-screen loader.
  if (isPageLoading) {
    return (
      <LoadingScreen
        isTimeout={isTimeout}
        onClose={() => {
          setIsPageLoading(false);
          setIsTimeout(false);
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6 overflow-hidden">
      <LoaderStopper />

      {/* I'm creating a "glass" aesthetic here with some blurred, animated background circles. */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[0%] left-[-5%] w-[60%] h-[60%] bg-teal-100/50 rounded-full blur-[120px] animate-glass-1" />
        <div className="absolute bottom-[0%] right-[-5%] w-[60%] h-[60%] bg-emerald-100/50 rounded-full blur-[120px] animate-glass-2" />
        <div className="absolute top-[20%] right-[20%] w-[40%] h-[40%] bg-indigo-50/60 rounded-full blur-[100px] animate-glass-3" />
        <div className="absolute inset-0 backdrop-blur-[100px]" />
        <div className="absolute inset-0 bg-grain" />
      </div>

      {/* If I'm navigating away, I'll pop this overlay up to keep the transition smooth. */}
      {isNavigating && (
        <LoadingScreen
          isTimeout={false}
          onClose={() => setIsNavigating(false)}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-3xl"
      >
        <div className="mb-6">
          <button
            onClick={() => {
              startLoading();
              setIsNavigating(true);
              router.back();
            }}
            className="group inline-flex items-center gap-2 text-slate-500 hover:text-teal-700 transition-colors"
          >
            <div className="p-2 group-hover:bg-white/60 rounded-full transition-all">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm tracking-wide">BACK</span>
          </button>
        </div>

        <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-white/40 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-teal-800 tracking-tight">
                Account Settings
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Manage your profile information
              </p>
            </div>
            <div className="h-14 w-14 bg-white/50 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/40 shadow-inner">
              <img
                src="/icons/midswift-logo.svg"
                alt="Midswift Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
          </div>

          <div className="md:flex">
            <div className="md:w-1/3 bg-white/30 p-8 border-r border-white/40 flex flex-col items-center justify-center text-center gap-4">
              <div className="relative group cursor-pointer">
                <div className="w-28 h-28 bg-linear-to-tr from-teal-500 to-emerald-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white/80">
                  <User className="w-14 h-14 text-white" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white w-6 h-6" />
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 wrap-break-word break-all">
                  {fullName || "User"}
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-1">
                  {email}
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-100/60 text-teal-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-teal-200/50">
                <ShieldCheck className="w-3 h-3" />
                Verified Member
              </div>
            </div>

            <div className="md:w-2/3 p-8 md:p-10">
              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFullName(e.target.value)
                      }
                      maxLength={30}
                      className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all font-semibold text-slate-700"
                      required
                    />
                    <p
                      className={`text-[11px] font-medium text-right mt-1 ${fullName.length === 30 ? "text-red-400 font-semibold" : "text-slate-400"}`}
                    >
                      {fullName.length}/30
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Email Address
                    </label>
                    <input
                      type="text"
                      value={email}
                      disabled
                      className="w-full px-5 py-3.5 rounded-xl bg-gray-100 border border-gray-200 text-slate-400 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>

                {/* I'm using AnimatePresence here so the status messages slide in and out nicely. */}
                <AnimatePresence>
                  {status && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
                        status.type === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-red-50 text-red-700 border border-red-100"
                      }`}
                    >
                      {status.type === "success" && (
                        <CheckCircle className="w-5 h-5 shrink-0" />
                      )}
                      {status.msg}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white h-14 text-base font-bold rounded-2xl shadow-lg shadow-teal-100 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  <Save className="w-5 h-5" />
                  {loading ? "Updating..." : "Save Changes"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
