"use client";

import {
  useState,
  useEffect,
  useRef,
  ReactNode,
  KeyboardEvent,
  FormEvent,
  MouseEvent,
  TouchEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Mail, Lock, User, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import LoadingScreen from "@/src/components/ui/LoadingScreen";

export default function AuthForm() {
  // I'm using these states to manage the UI toggle, animations, and loading feedback.
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [direction, setDirection] = useState<number>(0);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Here, I'm grabbing the user's input values for the various form fields.
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [rhuAssignment, setRhuAssignment] = useState<string>("");

  // I'm using these to handle the custom "Barangay" autocomplete dropdown.
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // I'm setting up a ref here so I can detect if a user clicks outside the dropdown to close it.
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // I'm detecting if the user arrived here via the Switch Account flow.
  const isSwitchMode = searchParams.get("switch") === "true";

  // I'm defining these variants so Framer Motion knows how to slide the form left or right.
  const formVariants: Variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 60 : -60,
      opacity: 0,
    }),
  };

  const barangays: string[] = [
    "Anahaw",
    "Anameam",
    "Awitan",
    "Baay",
    "Bagacay",
    "Bagong Silang I",
    "Bagong Silang II",
    "Bagong Silang III",
    "Bakiad",
    "Bautista",
    "Bayabas",
    "Bayan-bayan",
    "Benit",
    "Bulhao",
    "Cabatuhan",
    "Cabusay",
    "Calabasa",
    "Canapawan",
    "Daguit",
    "Dalas",
    "Dumagmang",
    "Exciban",
    "Fundado",
    "Guinacutan",
    "Guisican",
    "Gumamela",
    "Iberica",
    "Kalamunding",
    "Lugui",
    "Mabilo I",
    "Mabilo II",
    "Macogon",
    "Mahawan-hawan",
    "Malangcao-Basud",
    "Malasugui",
    "Malatap",
    "Malaya",
    "Malibago",
    "Maot",
    "Masalong",
    "Matanlang",
    "Napaod",
    "Pag-asa",
    "Pangpang",
    "Pinya",
    "San Antonio",
    "San Francisco",
    "Santa Cruz",
    "Submakin",
    "Talobatib",
    "Tigbinan",
    "Tulay na Lupa",
  ];

  // I'm filtering the list in real-time based on what the user is typing.
  const filteredBarangays = barangays.filter((b) =>
    b.toLowerCase().includes(rhuAssignment.toLowerCase()),
  );

  useEffect(() => {
    // I'm adding a global click listener to close the dropdown if the user clicks away from it.
    function handleClickOutside(
      event:
        | MouseEvent
        | TouchEvent
        | globalThis.MouseEvent
        | globalThis.TouchEvent,
    ) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    // I'm cleaning up the listeners when the component unmounts to prevent memory leaks.
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // I'm using this helper to bold the part of the text that matches the user's search query.
  const highlightMatch = (text: string): ReactNode => {
    const index = text.toLowerCase().indexOf(rhuAssignment.toLowerCase());
    if (index === -1 || rhuAssignment === "") return text;
    return (
      <>
        {text.substring(0, index)}
        <span className="text-teal-600 dark:text-teal-400 font-semibold">
          {text.substring(index, index + rhuAssignment.length)}
        </span>
        {text.substring(index + rhuAssignment.length)}
      </>
    );
  };

  // I'm handling keyboard navigation (arrows and enter) for the custom dropdown here.
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < filteredBarangays.length - 1 ? prev + 1 : prev,
      );
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) {
        setRhuAssignment(filteredBarangays[activeIndex]);
        setDropdownOpen(false);
        setActiveIndex(-1);
      }
    }
    if (e.key === "Escape") {
      setDropdownOpen(false);
      setActiveIndex(-1);
    }
  };

  // This is the main engine. I'm handling both Sign In and Sign Up logic with Supabase.
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // If the dropdown is open, I want the first 'Enter' to select the item, not submit the whole form.
    if (!isLogin && dropdownOpen) {
      if (activeIndex >= 0) {
        setRhuAssignment(filteredBarangays[activeIndex]);
      } else if (filteredBarangays.length > 0) {
        setRhuAssignment(filteredBarangays[0]);
      }
      setDropdownOpen(false);
      setActiveIndex(-1);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    if (isLogin) {
      // I'm attempting to log the user in here.
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError("We couldn't find an account with those details.");
        setIsLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } else {
      // I'm creating a new account and attaching the full name and RHU assignment to the user's metadata.
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, rhu_station: rhuAssignment } },
      });
      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    }
  };

  // I'm showing the loading screen and navigating back when the user cancels the switch account flow.
  const handleCancel = () => {
    setIsCancelling(true);
    window.history.back();
  };
  // I'm switching the UI between Login and Sign Up mode and setting the animation direction.
  const toggleAuth = (type: "login" | "signup") => {
    if (type === "login" && !isLogin) {
      setDirection(-1);
      setIsLogin(true);
      setError(null);
    } else if (type === "signup" && isLogin) {
      setDirection(1);
      setIsLogin(false);
      setError(null);
    }
  };

  return (
    <div className="w-full">
      {/* Loading screen shown while navigating back from cancel */}
      {isCancelling && (
        <LoadingScreen
          isTimeout={false}
          onClose={() => setIsCancelling(false)}
        />
      )}

      <div className="flex justify-end mb-6">
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 p-1 rounded-xl flex items-center shadow-sm">
          <button
            onClick={() => toggleAuth("login")}
            className={`relative px-4 py-2 text-sm font-bold rounded-lg transition-colors duration-200 ${
              isLogin
                ? "text-teal-700 dark:text-teal-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {isLogin && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 bg-white/80 dark:bg-zinc-800/80 rounded-lg shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">Log In</span>
          </button>
          <button
            onClick={() => toggleAuth("signup")}
            className={`relative px-4 py-2 text-sm font-bold rounded-lg transition-colors duration-200 ${
              !isLogin
                ? "text-teal-700 dark:text-teal-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {!isLogin && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 bg-white/80 dark:bg-zinc-800/80 rounded-lg shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">Sign Up</span>
          </button>
        </div>
      </div>

      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
        className="relative overflow-hidden p-1 -m-1"
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.form
            key={isLogin ? "login" : "signup"}
            custom={direction}
            variants={formVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 500, damping: 35 },
              opacity: { duration: 0.15 },
            }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
          >
            {error && (
              <div className="bg-red-50/80 dark:bg-red-950/40 backdrop-blur-md border border-red-200/50 dark:border-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {!isLogin && (
              <motion.div
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="flex flex-col gap-5 overflow-visible"
              >
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                    <input
                      type="text"
                      required
                      maxLength={30}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Juno Yasis"
                      className="w-full pl-10 pr-4 py-3 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:bg-white/80 dark:focus:bg-zinc-800/80 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <span
                    className={`text-xs text-right mr-1 ${fullName.length === 30 ? "text-red-400 font-semibold" : "text-zinc-400"}`}
                  >
                    {fullName.length}/30
                  </span>
                </div>

                <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                    RHU Assignment
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      enterKeyHint="done"
                      value={rhuAssignment}
                      onChange={(e) => {
                        setRhuAssignment(e.target.value);
                        setDropdownOpen(true);
                        setActiveIndex(-1);
                      }}
                      onFocus={() => setDropdownOpen(true)}
                      onKeyDown={handleKeyDown}
                      placeholder="Search or select Barangay"
                      className="w-full pl-4 py-3 pr-16 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:bg-white/80 dark:focus:bg-zinc-800/80 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all shadow-sm"
                    />

                    <div className="absolute right-3 top-2.5 flex items-center gap-1">
                      <AnimatePresence>
                        {rhuAssignment && (
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRhuAssignment("");
                              setDropdownOpen(true);
                              setActiveIndex(-1);
                            }}
                            className="p-1 text-zinc-400 hover:text-red-500 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
                          >
                            <X size={16} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                      <ChevronDown
                        className={`h-5 w-5 text-zinc-400 transition-transform ${dropdownOpen ? "rotate-180 text-teal-600" : ""}`}
                      />
                    </div>
                  </div>
                  {dropdownOpen && (
                    <div className="absolute z-20 mt-20 w-full max-h-60 overflow-y-auto bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                      {filteredBarangays.length > 0 ? (
                        filteredBarangays.map((barangay, index) => (
                          <div
                            key={barangay}
                            onClick={() => {
                              setRhuAssignment(barangay);
                              setDropdownOpen(false);
                              setActiveIndex(-1);
                            }}
                            className={`px-4 py-3 text-sm cursor-pointer transition-colors ${index === activeIndex ? "bg-teal-500/15 text-teal-700" : "hover:bg-teal-500/10 hover:text-teal-700"}`}
                          >
                            {highlightMatch(barangay)}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-zinc-400">
                          No barangay found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="junoyasis@gmail.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-zinc-900 dark:text-zinc-100 focus:bg-white/80 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                {!isLogin && (
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400">
                    Min. 8 characters
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 rounded-xl text-zinc-900 dark:text-zinc-100 focus:bg-white/80 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-teal-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white h-14 text-lg font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] mt-2 border border-teal-500/50"
            >
              {isLoading
                ? "Please wait..."
                : isLogin
                  ? "Log In"
                  : "Create My Account"}
            </Button>

            {/* Cancel button shown only when user arrived via Switch Account */}
            {isSwitchMode && (
              <button
                type="button"
                onClick={handleCancel}
                className="w-full h-12 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-all"
              >
                Cancel
              </button>
            )}
          </motion.form>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
