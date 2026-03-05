"use client";

import { JSX, useState } from "react";
import { TallyCounter } from "@/src/components/forms/TallyCounter";

// I'm setting up the shapes of our data here. `Indicator` is for the specific metrics we track,
// `DataEntry` holds the male/female numbers, and `FormProps` tells the component exactly what props to expect.
type Indicator = { id: string; label: string; has_gender_split: boolean };
type DataEntry = { indicator_id: string; value_m: number; value_f: number };

interface FormProps {
  indicators: Indicator[];
  entries: Record<string, DataEntry>;
  onUpdate: (indicatorId: string, gender: "m" | "f", newValue: number) => void;
  reportMonth: string;
}

// I created this `ReportGroup` interface to make sure my configuration array below stays strictly typed.
// It helps me catch typos and ensures every group has the exact required keys and styling classes.
interface ReportGroup {
  key: "DEWORMING" | "VITAMIN_A";
  title: string;
  labels: string[];
  themeClass: string;
  hoverClass: string;
  accentColor: "teal" | "orange";
}

// I'm defining the blueprint for our two main report types here. It holds the titles,
// the specific labels I need to cross-reference, and the Tailwind classes I want for styling.
const REPORT_GROUPS: readonly ReportGroup[] = [
  {
    key: "DEWORMING",
    title: "Deworming Program",
    labels: [
      "1 - 19 Y/O GIVEN 2 DOSES",
      "1 - 4 DEWORMED",
      "5 - 9 DEWORMED",
      "10 - 19 DEWORMED",
      "GIVEN 1 DOSE",
    ],
    themeClass: "bg-teal-50 border-teal-200",
    hoverClass: "hover:border-teal-300",
    accentColor: "teal",
  },
  {
    key: "VITAMIN_A",
    title: "Vitamin A Program",
    labels: [
      "6 - 11 MONTHS",
      "12 - 59 MONTHS",
      "NHTS 4P'S",
      "NHTS NON 4P'S",
      "NON NHTS",
    ],
    themeClass: "bg-orange-50 border-orange-200",
    hoverClass: "hover:border-orange-300",
    accentColor: "orange",
  },
];

export default function DewormingForm({
  indicators,
  entries,
  onUpdate,
  reportMonth,
}: FormProps): JSX.Element {
  // I'm using this state to remember which section is currently expanded.
  // It starts off as null, meaning everything is closed by default.
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Here, I'm figuring out which program we should actually be showing based on the incoming month.
  // Deworming happens in January and July, while Vitamin A is for April and October.
  const allowedGroupKey: "DEWORMING" | "VITAMIN_A" | null =
    reportMonth === "JANUARY" || reportMonth === "JULY"
      ? "DEWORMING"
      : reportMonth === "APRIL" || reportMonth === "OCTOBER"
        ? "VITAMIN_A"
        : null;

  // This is a handy function I wrote to handle the accordion toggle.
  // If I'm opening a section, I give the DOM a tiny 150ms delay to actually expand,
  // and then I smoothly scroll the browser right to the top of that specific section.
  const toggleGroup = (title: string): void => {
    const isOpening = expandedGroup !== title;
    setExpandedGroup(isOpening ? title : null);

    if (isOpening) {
      setTimeout(() => {
        const sectionId = `section-${title.replace(/\s+/g, "-")}`;
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 150);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-50 rounded-3xl shadow-xl border border-slate-200 relative overflow-visible">
      {/* I'm laying out the main header for the entire form right here. */}
      <div className="bg-teal-600 p-6 md:p-8 text-white rounded-t-3xl">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight uppercase">
          Deworming & Vitamin A Program Report Form
        </h2>
        <p className="text-teal-100 mt-1 text-sm md:text-base opacity-90">
          Recording data for {reportMonth}. Changes save automatically.
        </p>
      </div>

      <div className="p-4 md:p-6 space-y-6 md:space-y-10">
        {/* Now I'm looping through our report groups to build out the UI sections. */}
        {REPORT_GROUPS.map((group) => {
          // If the current month dictates a specific program and this group isn't it, I just skip rendering it entirely.
          if (allowedGroupKey && group.key !== allowedGroupKey) {
            return null;
          }

          // I'm cross-referencing the labels defined in my config with the actual `indicators` passed via props,
          // filtering out any undefined matches to get a clean array of valid indicators.
          const groupIndicators = group.labels
            .map((label) => indicators.find((i) => i.label === label))
            .filter(Boolean) as Indicator[];

          if (groupIndicators.length === 0) return null;

          const isOpen = expandedGroup === group.title;

          return (
            <div
              key={group.title}
              id={`section-${group.title.replace(/\s+/g, "-")}`}
              className={`rounded-2xl border p-4 md:p-6 transition-all duration-300 scroll-mt-32 md:scroll-mt-20 ${group.themeClass}`}
            >
              {/* This is the clickable header for the accordion. I made it sticky so it stays accessible even if the list gets super long! */}
              <div
                className={`sticky top-7 md:top-6 z-10 bg-inherit -mx-4 px-4 py-3 -mt-4 md:-mx-6 md:px-6 md:py-4 md:-mt-6 rounded-t-2xl transition-shadow ${
                  isOpen ? "shadow-sm border-b border-black/5" : ""
                }`}
              >
                <button
                  onClick={() => toggleGroup(group.title)}
                  className={`w-full flex items-center gap-4 py-2 text-left cursor-pointer outline-none focus-visible:ring-2 rounded-lg ${
                    group.accentColor === "teal"
                      ? "focus-visible:ring-teal-400"
                      : "focus-visible:ring-orange-400"
                  }`}
                  aria-expanded={isOpen}
                >
                  <h3 className="text-xl font-bold text-slate-800 tracking-wide">
                    {group.title}
                  </h3>
                  <div className="h-px bg-slate-300/80 flex-1"></div>

                  <div className="text-slate-500 bg-white/80 p-1.5 rounded-full shadow-sm border border-slate-200">
                    <svg
                      className={`w-5 h-5 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>
              </div>

              {/* Here's the actual container for the indicator fields that expands when the user opens the section. */}
              <div className={`mt-5 space-y-6 ${isOpen ? "block" : "hidden"}`}>
                {groupIndicators.map((indicator) => {
                  // I'm grabbing the current tally counts from the props. If there's no entry yet, I default to 0 so the math doesn't break.
                  const currentM = entries[indicator.id]?.value_m || 0;
                  const currentF = entries[indicator.id]?.value_f || 0;

                  return (
                    <div
                      key={indicator.id}
                      className={`relative bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md ${group.hoverClass}`}
                    >
                      <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 rounded-t-2xl">
                        <h4 className="font-bold text-slate-800 text-lg md:text-xl">
                          {indicator.label}
                        </h4>
                      </div>

                      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {/* I'm wrapping the male TallyCounter right here and hooking it up to our update handler. */}
                        <div className="flex-1 p-4 bg-blue-50/30">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 ml-1">
                              Male (M)
                            </span>
                            <TallyCounter
                              label=""
                              value={currentM}
                              onChange={(val) =>
                                onUpdate(indicator.id, "m", val)
                              }
                            />
                          </div>
                        </div>

                        {/* And here's the identical setup, just tracking the female TallyCounter instead. */}
                        <div className="flex-1 p-4 bg-rose-50/30 rounded-b-2xl md:rounded-bl-none md:rounded-br-2xl">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 ml-1">
                              Female (F)
                            </span>
                            <TallyCounter
                              label=""
                              value={currentF}
                              onChange={(val) =>
                                onUpdate(indicator.id, "f", val)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-slate-100 text-center text-xs text-slate-500 italic rounded-b-3xl border-t border-slate-200">
        Note: Deworming is reported in Jan/July; Vitamin A in April/Oct.
      </div>
    </div>
  );
}
