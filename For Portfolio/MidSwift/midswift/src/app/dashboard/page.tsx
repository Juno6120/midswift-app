// src/app/dashboard/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ChevronDown, FileText, Stethoscope } from "lucide-react";

import { NewReportTrigger } from "@/src/components/features/reports/NewReportTrigger";
import { YearlyReportList } from "@/src/components/features/reports/YearlyReportList";
import LoaderStopper from "@/src/components/ui/LoaderStopper";
import DashboardFab from "@/src/app/dashboard/DashboardFab";

// I'm defining a clear interface for my report objects so I don't have to
// rely on 'any' or complex 'typeof' lookups later in the logic.
type MonthName =
  | "JANUARY"
  | "FEBRUARY"
  | "MARCH"
  | "APRIL"
  | "MAY"
  | "JUNE"
  | "JULY"
  | "AUGUST"
  | "SEPTEMBER"
  | "OCTOBER"
  | "NOVEMBER"
  | "DECEMBER";

interface Report {
  id: string;
  report_type: string;
  report_month: MonthName;
  report_year: number;
  status: string;
}

// I'm mapping the messy database keys to nice, human-readable labels
// so the UI looks professional to the end user.
const CATEGORY_MAP: Record<string, string> = {
  GENERAL: "General Monthly Report",
  "GENERAL REPORT": "General Monthly Report",
  "BCG/HEPA B": "BCG/Hepa B Report",
  NATALITY: "Natality Report",
  "DEWORMING AND VITAMIN A": "Deworming & Vitamin A Report",
  "TEENAGE PREGNANCY": "Teenage Pregnancy Report",
} as const;

// This is my "source of truth" for the order and naming of sections on the dashboard.
const DASHBOARD_CATEGORIES = [
  "General Monthly Report",
  "BCG/Hepa B Report",
  "Natality Report",
  "Deworming & Vitamin A Report",
  "Teenage Pregnancy Report",
  "Other Reports",
] as const;

export default async function DashboardPage() {
  // I'm grabbing the cookies so I can keep the user's session active while talking to Supabase.
  const cookieStore = await cookies();

  // Here, I'm setting up the server-side client. I'm using the bang (!) operator
  // because I know for a fact these environment variables are required for the app to even boot.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    },
  );

  // First things first: I need to know who is logged in.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Now, I'm fetching all reports belonging to the current midwife,
  // sorting them by the newest year first, then chronologically by month.
  const { data: reports } = await supabase
    .from("reports")
    .select("id, report_type, report_month, report_year, status")
    .eq("midwife_id", user?.id)
    .order("report_year", { ascending: false })
    .order("report_month", { ascending: true });

  // I'm reshaping the flat list of reports into a grouped object.
  // This makes it way easier to render them inside their respective category accordions.
  const groupedByType =
    (reports as Report[] | null)?.reduce(
      (acc, report) => {
        const displayCategory =
          CATEGORY_MAP[report.report_type] || "Other Reports";
        if (!acc[displayCategory]) acc[displayCategory] = [];
        acc[displayCategory].push(report);
        return acc;
      },
      {} as Record<string, Report[]>,
    ) || {};

  // For the desktop view, I want a balanced two-column layout,
  // so I'm splitting my categories into "evens" and "odds".
  const column1Categories = DASHBOARD_CATEGORIES.filter((_, i) => i % 2 === 0);
  const column2Categories = DASHBOARD_CATEGORIES.filter((_, i) => i % 2 !== 0);

  // I'm using these specific Tailwind classes to give each yearly block a unique
  // color stripe—it helps the user distinguish between different years visually.
  const YEAR_COLORS = [
    "border-l-teal-500 bg-teal-50/40",
    "border-l-indigo-500 bg-indigo-50/40",
    "border-l-emerald-500 bg-emerald-50/40",
    "border-l-amber-500 bg-amber-50/40",
    "border-l-rose-500 bg-rose-50/40",
    "border-l-sky-500 bg-sky-50/40",
  ] as const;

  // I created this helper function to render the category accordions.
  // It handles both the empty state and the further grouping of reports by year.
  const renderCategory = (category: string, isMobile: boolean) => {
    const categoryReports = (groupedByType[category] || []).sort(
      (a, b) => Number(a.report_month) - Number(b.report_month),
    );

    // Within a category, I need to group reports by year so I can show
    // the "YearlyReportList" component for each specific year.
    const reportsByYear = categoryReports.reduce(
      (acc, report) => {
        if (!acc[report.report_year]) acc[report.report_year] = [];
        acc[report.report_year]?.push(report);
        return acc;
      },
      {} as Record<number, Report[]>,
    );

    // I'm sorting the years descending (2025, 2024...) because
    // users usually care most about their most recent work.
    const yearKeys = Object.keys(reportsByYear).sort(
      (a, b) => Number(b) - Number(a),
    );

    const isSingleYear = yearKeys.length === 1;

    return (
      <details
        key={category}
        name={isMobile ? "category-accordion" : undefined}
        className="group bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden transition-all duration-500 open:ring-2 open:ring-teal-500/20 open:border-teal-500 open:shadow-xl"
      >
        <summary className="flex items-center justify-between px-6 py-6 cursor-pointer hover:bg-slate-50 transition-colors list-none outline-none">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 group-open:text-teal-700 transition-colors leading-tight">
              {category}
            </h3>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase tracking-wide">
                {categoryReports.length}{" "}
                {categoryReports.length === 1 ? "Entry" : "Entries"}
              </span>
            </div>
          </div>
          <ChevronDown className="w-6 h-6 text-slate-300 group-open:rotate-180 transition-transform duration-500 group-open:text-teal-500" />
        </summary>

        <div className="grid transition-all duration-500 ease-in-out grid-rows-[0fr] group-open:grid-rows-[1fr]">
          <div className="overflow-hidden min-h-0">
            <div className="border-t border-slate-100 bg-slate-50/50 p-5">
              <div
                className="space-y-6 max-h-104 overflow-y-auto pr-2
                           scrollbar-thin
                           scrollbar-thumb-teal-500
                           scrollbar-track-slate-100
                           hover:scrollbar-thumb-teal-600"
              >
                {categoryReports.length === 0 ? (
                  <div className="py-10 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium italic">
                      No reports filed yet.
                    </p>
                  </div>
                ) : (
                  yearKeys.map((yearStr, index) => {
                    const year = Number(yearStr);
                    const months = (reportsByYear[year] || []).sort(
                      (a, b) => Number(a.report_month) - Number(b.report_month),
                    );

                    // I'm building the export URL by looking back at the original map key.
                    // If I can't find it, I just fall back to the category name.
                    const exportUrl = `/api/export/annual?type=${encodeURIComponent(
                      Object.keys(CATEGORY_MAP).find(
                        (k) => CATEGORY_MAP[k] === category,
                      ) || category,
                    )}&year=${year}`;

                    const colorClass = YEAR_COLORS[index % YEAR_COLORS.length];

                    return (
                      <div
                        key={year}
                        className={`border-l-4 rounded-2xl p-4 ${colorClass}`}
                      >
                        <YearlyReportList
                          category={category}
                          year={year}
                          reports={months}
                          exportUrl={exportUrl}
                          defaultOpen={isSingleYear}
                          accordionName={
                            !isSingleYear
                              ? `year-accordion-${category.replace(
                                  /\s+/g,
                                  "-",
                                )}`
                              : undefined
                          }
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </details>
    );
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* I'm forcing the body to stay still because the dashboard uses custom scrolling inside containers */
        body { 
          overflow: hidden !important; 
        }
        /* I'm adjusting padding when modals are open to prevent that annoying 'layout shift' from the scrollbar disappearing */
        body:has([role="dialog"]), 
        body:has(dialog[open]),
        body:has(.modal-open) { 
          padding-right: var(--removed-body-scroll-bar-size, 0px);
        }
      `,
        }}
      />
      <LoaderStopper />

      <div className="max-w-6xl mx-auto px-4 pt-8 pb-12 md:pt-12 md:pb-16 space-y-10">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="relative hidden sm:block">
              {/* This ping effect adds a nice subtle "live" feel to the medical icon */}
              <div className="absolute inset-0 bg-teal-200 rounded-2xl animate-ping opacity-20"></div>
              <div className="relative bg-linear-to-br from-teal-600 to-teal-700 p-4 rounded-2xl shadow-xl shadow-teal-100 border border-teal-500/20">
                <Stethoscope
                  className="w-15 h-15 text-white"
                  strokeWidth={2.5}
                />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Dashboard
              </h1>
              <p className="text-slate-500 font-medium">
                Manage and export your clinical records.
              </p>
            </div>
          </div>

          <NewReportTrigger />
        </header>

        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <h2 className="font-bold text-slate-800 text-lg">
                Report Categories
              </h2>
            </div>
          </div>

          {/* I'm rendering a simple stack for mobile users */}
          <div className="flex flex-col gap-6 lg:hidden">
            {DASHBOARD_CATEGORIES.map((category) =>
              renderCategory(category, true),
            )}
          </div>

          {/* And here I'm using that two-column grid I prepared earlier for larger screens */}
          <div className="hidden lg:grid grid-cols-2 gap-6 items-start">
            <div className="flex flex-col gap-6">
              {column1Categories.map((category) =>
                renderCategory(category, false),
              )}
            </div>
            <div className="flex flex-col gap-6">
              {column2Categories.map((category) =>
                renderCategory(category, false),
              )}
            </div>
          </div>
        </section>
      </div>

      <DashboardFab />
    </>
  );
}
