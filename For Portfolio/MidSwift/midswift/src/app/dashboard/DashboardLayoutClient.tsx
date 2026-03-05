"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogoutModal } from "@/src/components/modals/LogoutModal";
import { createClient } from "@/src/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { User, LogOut, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import LoadingScreen from "@/src/components/ui/LoadingScreen";

/** * I'm defining this interface to replace the 'any' type.
 * It helps me keep track of exactly what fields I expect from the Supabase profile.
 */
interface UserProfile {
  full_name: string | null;
  rhu_station: string | null;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  profile: UserProfile | null;
}

export default function DashboardLayoutClient({
  children,
  profile,
}: DashboardLayoutProps) {
  // I'm using these states to manage the UI toggle states for the sidebar and modals.
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // I'm setting up these refs so I can detect if a user clicks outside of the active menus.
  const topMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const sidebarMenuRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // I'm checking if I'm on the landing page so I can adjust the layout and header styles accordingly.
  const isHomePage = pathname === "/";

  useEffect(() => {
    // I'm creating a global click listener to automatically close the user menu when the user clicks away.
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTop = topMenuRef.current?.contains(target);
      const insideMobile = mobileMenuRef.current?.contains(target);
      const insideSidebar = sidebarMenuRef.current?.contains(target);

      if (!insideTop && !insideMobile && !insideSidebar) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // I'm handling the actual Supabase sign-out flow here.
  // Once the session is cleared, I send the user back to the login page.
  const handleActualLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error.message);
      return;
    }
    setShowLogoutModal(false);
    router.replace("/login");
    router.refresh();
  };

  // I'm showing the loading screen first, then doing a hard redirect to clear cached auth state.
  const handleSwitchAccount = () => {
    setIsNavigating(true);
    window.location.href = "/login?switch=true";
  };

  // I've moved the user menu items into a sub-component to keep the main JSX cleaner and easier to read.
  const UserMenuContent = () => (
    <div className="py-2 w-48 bg-white/95 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-zinc-200/20 dark:shadow-none border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
      <Link
        href="/profile"
        onClick={() => setIsMenuOpen(false)}
        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
      >
        <User className="w-4 h-4" />
        Update Profile
      </Link>
      <button
        onClick={() => {
          setIsMenuOpen(false);
          handleSwitchAccount();
        }}
        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-400 transition-colors text-left"
      >
        <RefreshCw className="w-4 h-4" />
        Switch Account
      </button>
      <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 my-1"></div>
      <button
        onClick={() => {
          setIsMenuOpen(false);
          setShowLogoutModal(true);
        }}
        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors text-left"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  );

  return (
    <div className="flex flex-col fixed inset-0 bg-zinc-50 dark:bg-zinc-950 overflow-hidden transition-colors duration-300">
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleActualLogout}
      />

      {/* Loading screen shown while navigating to switch account */}
      {isNavigating && (
        <LoadingScreen
          isTimeout={false}
          onClose={() => setIsNavigating(false)}
        />
      )}

      {/* I only show this specific header layout if the user is on the Home Page. */}
      {isHomePage && (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60 z-50 px-6 flex items-center justify-between transition-colors duration-300">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/icons/midswift-logo.svg"
              alt="Logo"
              width={50}
              height={50}
            />
            <span className="text-lg font-bold text-teal-800 dark:text-teal-400">
              MidSwift
            </span>
          </Link>

          <div className="relative" ref={topMenuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-3 hover:bg-white/50 dark:hover:bg-zinc-800/50 p-1.5 pr-3 rounded-full transition-all border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-700/50"
            >
              <div className="w-8 h-8 rounded-full bg-teal-500/15 flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold text-xs">
                {profile?.full_name?.charAt(0)}
              </div>
              <span className="hidden sm:inline text-sm font-bold text-zinc-700 dark:text-zinc-200">
                {profile?.full_name}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 z-50">
                <UserMenuContent />
              </div>
            )}
          </div>
        </header>
      )}

      {/* If I'm not on the home page, I'm rendering the full sidebar and mobile header layout. */}
      {!isHomePage && (
        <>
          <header className="flex md:hidden shrink-0 items-center justify-between py-3 px-6 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60 z-50 transition-colors duration-300">
            <Link href="/" className="flex items-center gap-2 cursor-pointer">
              <Image
                src="/icons/midswift-logo.svg"
                alt="Logo"
                width={28}
                height={28}
              />
              <span className="text-lg font-bold text-teal-800 dark:text-teal-400">
                MidSwift
              </span>
            </Link>

            <div className="relative" ref={mobileMenuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1 transition-transform active:scale-95"
              >
                <div className="w-9 h-9 rounded-full bg-teal-500/15 flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold border-2 border-white/50 dark:border-zinc-800/50 shadow-sm backdrop-blur-sm">
                  {profile?.full_name?.charAt(0) || "M"}
                </div>
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 z-50">
                  <UserMenuContent />
                </div>
              )}
            </div>
          </header>

          <aside
            className={`h-full shrink-0 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl border-r border-zinc-200/60 dark:border-zinc-800/60 hidden md:flex flex-col fixed top-0 left-0 transition-all duration-300 ease-in-out z-50 ${isCollapsed ? "w-22" : "w-72"}`}
          >
            {/* I'm using this button to let users collapse the sidebar to save screen real estate. */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="absolute -right-3 top-13 flex items-center justify-center w-6 h-6 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-700/50 rounded-full text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 shadow-sm z-50 transition-all hover:scale-110 active:scale-95"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div
              className={`h-24 flex items-center ${isCollapsed ? "justify-center" : "px-8"}`}
            >
              <Link href="/" className="flex items-center gap-3 cursor-pointer">
                <div className="relative w-10 h-10 shrink-0">
                  <Image
                    src="/icons/midswift-logo.svg"
                    alt="Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                {!isCollapsed && (
                  <span className="text-xl font-extrabold tracking-tight text-teal-900 dark:text-teal-400">
                    MidSwift
                  </span>
                )}
              </Link>
            </div>

            <nav className="flex-1 px-4 space-y-2">
              {!isCollapsed && (
                <p className="px-4 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[2px] mb-4">
                  Main Menu
                </p>
              )}
              <Link
                href="/dashboard"
                className={`group flex items-center p-3 rounded-xl transition-all duration-200 ${pathname === "/dashboard" ? "bg-teal-500/15 text-teal-700 dark:text-teal-400 shadow-sm shadow-teal-500/10" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-500/10 hover:text-zinc-900 dark:hover:text-zinc-100"} ${isCollapsed ? "justify-center" : "gap-4 px-4"}`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 12l4-4 4 4 4-5 4 3"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 20h18"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 20v-4M11 20v-4M15 20v-6M19 20v-8"
                  />
                </svg>
                {!isCollapsed && (
                  <span className="font-semibold">Overview</span>
                )}
              </Link>
            </nav>

            {/* I'm placing the user profile trigger at the bottom of the sidebar. */}
            <div
              className="p-4 mt-auto border-t border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/30 dark:bg-zinc-900/30 backdrop-blur-md relative"
              ref={sidebarMenuRef}
            >
              {isMenuOpen && (
                <div
                  className={`absolute bottom-full left-4 right-4 mb-2 z-50 ${isCollapsed ? "w-48 left-full ml-2 bottom-4" : ""}`}
                >
                  <UserMenuContent />
                </div>
              )}

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`w-full flex items-center transition-all hover:bg-white/50 dark:hover:bg-zinc-800/50 p-2 rounded-xl border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-700/50 hover:shadow-sm ${isCollapsed ? "justify-center" : "gap-3 px-2"}`}
              >
                <div className="w-10 h-10 shrink-0 rounded-full bg-teal-500/15 flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold border-2 border-white/50 dark:border-zinc-800/50 shadow-sm">
                  {profile?.full_name?.charAt(0)}
                </div>
                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {profile?.full_name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate uppercase">
                        Barangay {profile?.rhu_station || "RHU"}
                      </p>
                    </div>
                    <ChevronUp
                      className={`w-4 h-4 text-zinc-400 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
                    />
                  </>
                )}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* I'm using dynamic margins here so the content area automatically shifts when the sidebar is expanded or collapsed. */}
      <main
        className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${
          isHomePage
            ? "pt-16 w-full pb-12"
            : `pt-6 px-6 pb-12 md:pt-10 md:px-10 md:pb-12 ${isCollapsed ? "md:ml-22" : "md:ml-72"}`
        }`}
      >
        {children}
      </main>
    </div>
  );
}
