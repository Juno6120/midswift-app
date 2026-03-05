"use client";

import { useState } from "react";
import { TallyCounter } from "@/src/components/forms/TallyCounter";

// I prefer using interfaces over types for object shapes because they are easier for TypeScript to cache and extend.
// I'm also marking these properties as readonly because we shouldn't be directly modifying the raw indicator data once we receive it.
interface Indicator {
  readonly id: string;
  readonly label: string;
  readonly has_gender_split: boolean;
}

interface DataEntry {
  readonly indicator_id: string;
  readonly value_m: number;
  readonly value_f: number;
}

// Here, I'm defining our component's props. Notice I'm making the arrays and objects deeply readonly.
// This acts as a safeguard so we don't accidentally mutate state directly inside the component.
interface FormProps {
  readonly indicators: readonly Indicator[];
  readonly entries: Readonly<Record<string, DataEntry>>;
  readonly onUpdate: (
    indicatorId: string,
    gender: "m" | "f",
    newValue: number,
  ) => void;
}

// I'm throwing an "as const" at the end of this array. This is a great TypeScript trick!
// It tells the compiler that this array is completely static and will never change, which gives us ultra-strict types for our strings instead of a generic "string[]".
const REPORT_GROUPS = [
  {
    title: "Attendant at Birth",
    labels: ["NO. OF LB", "MD", "RN", "RHM", "HILOT"],
  },
  {
    title: "Place of Birth",
    labels: [
      "RHU",
      "BMONC OTHERS",
      "PRIV. L-IN",
      "CNPH",
      "LDH",
      "PRIV. HOSP.",
      "HOME",
    ],
  },
  {
    title: "Birth Weight",
    labels: [">2500", "<2500", "Unknown"],
  },
  {
    title: "Pregnancy Outcome",
    labels: ["LB", "FD", "AB"],
  },
  {
    title: "Delivery Type",
    labels: ["NSD", "CS"],
  },
] as const;

// Again, using "as const" here to lock in these specific tailwind class strings.
const SECTION_THEMES = [
  "bg-blue-50 border-blue-200",
  "bg-emerald-50 border-emerald-200",
  "bg-amber-50 border-amber-200",
  "bg-purple-50 border-purple-200",
  "bg-rose-50 border-rose-200",
] as const;

export default function NatalityForm({
  indicators,
  entries,
  onUpdate,
}: FormProps) {
  // I'm explicitly typing our state as <string | null> so TypeScript knows exactly what to expect.
  // We use this to keep track of which accordion group is currently open.
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Here I'm creating a function to handle the click when someone wants to open or close a section.
  // I added a "void" return type to be crystal clear about what this function outputs.
  const toggleGroup = (title: string): void => {
    // First, I check if the section they clicked is already the one that's open.
    const isOpening = expandedGroup !== title;
    // If it's a new section, I open it. Otherwise, I close the current one by setting state to null.
    setExpandedGroup(isOpening ? title : null);

    // I'm using a tiny timeout here. This gives the DOM just enough time to render the newly opened section
    // before we try to smoothly scroll down to it.
    setTimeout(() => {
      const sectionId = `section-${title.replace(/\s+/g, "-")}`;
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-50 rounded-3xl shadow-xl border border-slate-200 relative overflow-visible">
      {/* I'm setting up our main hero header so the user knows exactly what form they're filling out. */}
      <div className="bg-blue-600 p-6 md:p-8 text-white rounded-t-3xl">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          NATALITY REPORT FORM
        </h2>
        <p className="text-blue-100 mt-1 text-sm md:text-base opacity-90">
          Record natality and birth details by category.
        </p>
      </div>

      <div className="p-4 md:p-6 space-y-6 md:space-y-10">
        {/* I'm looping through our static REPORT_GROUPS to build the distinct sections of the form. */}
        {REPORT_GROUPS.map((group, index) => {
          // Here, I'm matching the labels in our group with the actual indicator data passed in via props.
          // I cast it as Indicator[] at the end because the .filter(Boolean) correctly removes any undefined values,
          // but TypeScript sometimes needs a gentle nudge to recognize that the array is now clean.
          const groupIndicators = group.labels
            .map((label) => indicators.find((i) => i.label === label))
            .filter(Boolean) as Indicator[];

          // If a group doesn't actually have any valid indicators, I'm just going to skip rendering it entirely.
          if (groupIndicators.length === 0) return null;

          // I'm checking if this specific group is the one the user currently has opened.
          const isOpen = expandedGroup === group.title;
          // I'm cycling through our theme array so each section gets a nice, alternating color scheme based on its index.
          const themeClass = SECTION_THEMES[index % SECTION_THEMES.length];

          return (
            <div
              key={group.title}
              id={`section-${group.title.replace(/\s+/g, "-")}`}
              className={`rounded-2xl border p-4 md:p-6 transition-all duration-300 
                ${""} 
                scroll-mt-32 md:scroll-mt-20 
                ${themeClass}`}
            >
              {/* This is the clickable header for the accordion. I made it sticky so that if it's a really long section, 
                  the user always knows what category they are currently looking at. */}
              <div
                className={`sticky top-7 md:top-6 z-10 bg-inherit -mx-4 px-4 py-3 -mt-4 md:-mx-6 md:px-6 md:py-4 md:-mt-6 rounded-t-2xl transition-shadow ${
                  isOpen ? "shadow-sm border-b border-black/5" : ""
                }`}
              >
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center gap-4 py-2 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg"
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

              {/* Here's the actual content of the section. I'm toggling the display class based on our isOpen state. */}
              <div className={`mt-5 space-y-6 ${isOpen ? "block" : "hidden"}`}>
                {/* Now I'm looping through every indicator that belongs to this specific group to render the form inputs. */}
                {groupIndicators.map((indicator) => {
                  // I'm pulling the current values for this indicator from our entries prop, defaulting to 0 if we haven't tracked anything yet.
                  const currentM = entries[indicator.id]?.value_m || 0;
                  const currentF = entries[indicator.id]?.value_f || 0;

                  return (
                    <div
                      key={indicator.id}
                      className="relative bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md"
                    >
                      <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 rounded-t-2xl">
                        <h4 className="font-bold text-slate-800 text-lg md:text-xl">
                          {indicator.label}
                        </h4>
                      </div>

                      {/* If the indicator requires us to track males and females separately, I'll render a split view with two tally counters. */}
                      {indicator.has_gender_split ? (
                        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
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
                      ) : (
                        /* Otherwise, if it's not split by gender, I'm just showing a single grand total counter. I'm reusing the 'm' value under the hood to store the single total. */
                        <div className="p-4 bg-white rounded-b-2xl">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">
                              Total Count
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
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Just a friendly footer to reassure the user that they don't need to hunt for a save button! */}
      <div className="p-4 bg-slate-100 text-center text-xs text-slate-500 italic rounded-b-3xl border-t border-slate-200">
        Changes are saved automatically as you adjust the counters.
      </div>
    </div>
  );
}
