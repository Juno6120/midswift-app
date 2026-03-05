"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createClient } from "@/src/lib/supabase/client";
import {
  X,
  ChevronDown,
  Check,
  Calendar,
  FileText,
  AlertCircle,
  FilePlus2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

import LoadingScreen from "@/src/components/ui/LoadingScreen";

// I'm using 'as const' here so TypeScript knows these aren't just any strings,
// but these specific categories. This helps with better autocompletion later.
const REPORT_TYPES = [
  "BCG/HEPA B",
  "TEENAGE PREGNANCY",
  "DEWORMING AND VITAMIN A",
  "NATALITY",
  "GENERAL REPORT",
] as const;

// I'm defining a type based on the array above so I can reuse it in my state and props.
type ReportType = (typeof REPORT_TYPES)[number];

const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

type MonthType = (typeof MONTHS)[number];

const DEWORMING_MONTHS = ["JANUARY", "APRIL", "JULY", "OCTOBER"] as const;

const CURRENT_YEAR = new Date().getFullYear();

// I'm generating a list of years starting from 2020 up to right now.
const YEAR_OPTIONS: string[] = Array.from(
  { length: CURRENT_YEAR - 2020 + 1 },
  (_, i) => (CURRENT_YEAR - i).toString(),
);

// This is where I store the look-and-feel for each report type.
// I'm using a Record type here to keep the mapping strict.
interface StyleMeta {
  color: string;
  dot: string;
  bg: string;
}

const REPORT_TYPE_META: Record<ReportType, StyleMeta> = {
  "BCG/HEPA B": { color: "text-sky-600", dot: "bg-sky-400", bg: "bg-sky-50" },
  "TEENAGE PREGNANCY": {
    color: "text-rose-600",
    dot: "bg-rose-400",
    bg: "bg-rose-50",
  },
  "DEWORMING AND VITAMIN A": {
    color: "text-amber-600",
    dot: "bg-amber-400",
    bg: "bg-amber-50",
  },
  NATALITY: {
    color: "text-violet-600",
    dot: "bg-violet-400",
    bg: "bg-violet-50",
  },
  "GENERAL REPORT": {
    color: "text-teal-600",
    dot: "bg-teal-400",
    bg: "bg-teal-50",
  },
};

interface CustomSelectProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (val: string) => void;
  icon?: React.ReactNode;
  className?: string;
  hint?: string;
}

// I built this custom select because the native ones are hard to style.
// It handles its own "open" state and detects clicks outside to close itself.
function CustomSelect({
  label,
  value,
  options,
  onChange,
  icon,
  className,
  hint,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={cn("flex flex-col gap-1.5 relative", className)}
      ref={containerRef}
    >
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
          {label}
        </label>
        {hint && (
          <span className="text-[10px] font-bold text-teal-500/80">{hint}</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group flex items-center justify-between w-full px-3 sm:px-4 py-3.5 rounded-2xl border transition-all duration-300 backdrop-blur-md",
          isOpen
            ? "border-teal-500/40 bg-white/90 dark:bg-zinc-800/90 shadow-[0_0_20px_rgba(20,184,166,0.1)]"
            : "border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 hover:border-teal-500/20",
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden min-w-0">
          {icon && (
            <div
              className={cn(
                "transition-colors shrink-0",
                isOpen ? "text-teal-500" : "text-zinc-400",
              )}
            >
              {icon}
            </div>
          )}
          <span className="font-bold text-[13px] sm:text-[14px] text-zinc-700 dark:text-zinc-200 truncate">
            {value}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            "transition-transform duration-300 text-zinc-400 shrink-0 ml-1",
            isOpen && "rotate-180 text-teal-500",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-2xl z-70 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="py-2 max-h-48 overflow-y-auto scrollbar-custom">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between w-full px-5 py-3 text-left transition-colors",
                  value === opt
                    ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100",
                )}
              >
                <span className="font-bold text-sm tracking-wide">{opt}</span>
                {value === opt && <Check className="w-4 h-4" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface InlineAlertProps {
  message: string;
  onDismiss: () => void;
}

// I'm using this for quick error messages inside the modal.
// It's much nicer than a standard browser alert.
function InlineAlert({ message, onDismiss }: InlineAlertProps) {
  return (
    <div className="flex items-start gap-3 px-5 py-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl animate-in slide-in-from-top-2 duration-300">
      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
      <p className="text-[13px] font-bold text-rose-600 dark:text-rose-400 flex-1 leading-snug">
        {message}
      </p>
      <button
        onClick={onDismiss}
        className="text-rose-300 hover:text-rose-500 transition-colors"
      >
        <X size={16} strokeWidth={3} />
      </button>
    </div>
  );
}

interface NewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewReportModal({ isOpen, onClose }: NewReportModalProps) {
  // I'm initializing my state here. I used the types I defined earlier
  // so that I can't accidentally set a report type that doesn't exist.
  const [reportType, setReportType] = useState<ReportType>(REPORT_TYPES[0]);
  const [month, setMonth] = useState<string>("JANUARY");
  const [year, setYear] = useState<string>(CURRENT_YEAR.toString());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  const router = useRouter();
  const supabase = createClient();

  // I need this to prevent hydration errors since this modal uses a Portal.
  useEffect(() => {
    setMounted(true);
  }, []);

  // I'm wrapping this in useCallback so it doesn't get recreated on every render.
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  // Here I'm handling some UX: blocking page scroll when the modal is open
  // and listening for the Escape key to close it.
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEsc);
    } else {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, handleEsc]);

  if (!mounted || !isOpen) return null;

  // Some reports are quarterly, so I'm filtering the available months here.
  const availableMonths =
    reportType === "DEWORMING AND VITAMIN A" ? DEWORMING_MONTHS : MONTHS;

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMessage(null);
    setIsLoading(true);

    // Double-checking that the month is valid for the specific report type.
    if (
      reportType === "DEWORMING AND VITAMIN A" &&
      !DEWORMING_MONTHS.includes(month as any)
    ) {
      setAlertMessage("Invalid month for Deworming & Vitamin A report.");
      setIsLoading(false);
      return;
    }

    // Checking if the user session is still active before I try to save anything.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Here I'm inserting the new report into Supabase.
    // I specifically ask for the 'id' back so I can redirect the user to it.
    const { data, error } = await supabase
      .from("reports")
      .insert({
        midwife_id: user.id,
        report_type: reportType,
        report_month: month,
        report_year: parseInt(year),
        status: "DRAFT",
      })
      .select("id")
      .single();

    if (error) {
      // I'm catching common database errors like duplicate records to show a friendly message.
      setAlertMessage(
        error.message.includes("duplicate key")
          ? "A report for this period already exists."
          : "Something went wrong. Please try again.",
      );
      setIsLoading(false);
    } else if (data) {
      // If everything went well, I send them straight to the report editor.
      router.push(`/dashboard/reports/${data.id}`);
    }
  };

  const meta =
    REPORT_TYPE_META[reportType] || REPORT_TYPE_META["GENERAL REPORT"];

  // I'm using createPortal to render this at the top level of the DOM.
  // This keeps the modal on top of everything else regardless of parent styling.
  return createPortal(
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4 md:p-6"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-500"
        onClick={onClose}
      />

      <div className="relative w-full max-w-120 max-h-[90vh] overflow-y-auto scrollbar-custom bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-teal-500/15 dark:border-teal-400/10 rounded-[42px] shadow-[0_20px_60px_-10px_rgba(20,184,166,0.2),0_32px_80px_-20px_rgba(0,0,0,0.3)] transition-all duration-500 animate-in fade-in zoom-in-95 slide-in-from-bottom-8">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-teal-400/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-400/15 rounded-full blur-[80px] pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-8 right-8 z-10 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:scale-110 active:scale-95 transition-all"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="relative px-6 sm:px-10 pt-10 pb-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-5">
              <div className="absolute -inset-3 bg-teal-500/20 rounded-2xl blur-lg animate-pulse" />
              <div className="relative w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/20">
                <FilePlus2 className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              New Report
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm sm:text-[15px] font-medium mt-1">
              Select your filing parameters below.
            </p>
          </div>

          <form onSubmit={handleCreateReport} className="space-y-6">
            <CustomSelect
              label="Report Category"
              value={reportType}
              options={REPORT_TYPES}
              onChange={(val) => {
                // When the report type changes, I need to reset any alerts
                // and make sure the month is valid for the new type.
                setReportType(val as ReportType);
                setAlertMessage(null);
                if (
                  val === "DEWORMING AND VITAMIN A" &&
                  !DEWORMING_MONTHS.includes(month as any)
                )
                  setMonth("JANUARY");
              }}
              icon={<FileText size={18} />}
              hint={
                reportType === "DEWORMING AND VITAMIN A"
                  ? "Quarterly"
                  : undefined
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CustomSelect
                label="Month"
                value={month}
                options={availableMonths}
                onChange={(val) => {
                  setMonth(val);
                  setAlertMessage(null);
                }}
                icon={<Calendar size={18} />}
              />
              <CustomSelect
                label="Year"
                value={year}
                options={YEAR_OPTIONS}
                onChange={(val) => {
                  setYear(val);
                  setAlertMessage(null);
                }}
              />
            </div>

            <div
              className={cn(
                "flex items-center gap-3 px-5 py-3.5 rounded-2xl border transition-colors",
                meta.bg,
                "border-zinc-100 dark:border-zinc-800/50 bg-opacity-50",
              )}
            >
              <div className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} />
              <div className="flex flex-col overflow-hidden min-w-0">
                <span
                  className={cn(
                    "text-[9px] font-black uppercase tracking-widest",
                    meta.color,
                  )}
                >
                  Ready to file
                </span>
                <span className="text-[12px] sm:text-[13px] font-bold text-zinc-700 dark:text-zinc-300 truncate">
                  {reportType} — {month} {year}
                </span>
              </div>
            </div>

            {alertMessage && (
              <InlineAlert
                message={alertMessage}
                onDismiss={() => setAlertMessage(null)}
              />
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 rounded-2xl text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-2 group relative flex items-center justify-center gap-2 bg-zinc-900 dark:bg-teal-600 hover:bg-zinc-800 dark:hover:bg-teal-500 text-white font-bold rounded-2xl px-6 py-4 shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:translate-y-0"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirm & Start</span>
                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {isLoading && (
        <LoadingScreen isTimeout={false} onClose={() => setIsLoading(false)} />
      )}

      {/* I'm injecting these global styles to give the scrollbars a custom, brand-matched look. */}
      <style jsx global>{`
        .scrollbar-custom::-webkit-scrollbar {
          width: 5px;
        }
        .scrollbar-custom::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: rgba(20, 184, 166, 0.2);
          border-radius: 10px;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: rgba(20, 184, 166, 0.4);
        }
        .scrollbar-custom {
          scrollbar-width: thin;
          scrollbar-color: rgba(20, 184, 166, 0.2) transparent;
        }
      `}</style>
    </div>,
    document.body,
  );
}
