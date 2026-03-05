"use client";

import { useState } from "react";
import { TallyCounter } from "@/src/components/forms/TallyCounter";

// I'm setting up these interfaces to define the exact shape of our data.
// Using interfaces instead of types for objects is a great TypeScript habit
// because it makes extending them later much easier.
export interface Indicator {
  id: string;
  label: string;
  has_gender_split?: boolean;
  ref_sections?: { name: string };
  section_name?: string;
}

// I'm allowing extra unknown keys here just in case our backend sends
// extra data we aren't explicitly tracking yet.
export interface DataEntry {
  indicator_id: string;
  value_m: number;
  value_f: number;
  [key: string]: unknown;
}

// I'm using a union type for Gender to strictly lock down the allowed values.
type Gender = "m" | "f";

interface FormProps {
  indicators: Indicator[];
  entries: Record<string, DataEntry>;
  onUpdate: (indicatorId: string, gender: Gender, newValue: number) => void;
}

// I'm creating a recursive type here so we can nest our indicators infinitely if needed.
interface TreeNode {
  item: Indicator;
  children: TreeNode[];
}

interface IndicatorCardProps {
  indicator: Indicator;
  entry?: DataEntry;
  onUpdate: (indicatorId: string, gender: Gender, newValue: number) => void;
  isSplit: boolean;
  isSubItem?: boolean;
  isDeepSubItem?: boolean;
  hasChildren?: boolean;
  hideLabel?: boolean;
}

// I'm locking down this array with "as const" so TypeScript treats it as a
// readonly tuple of exact string literals, rather than a generic string array.
const SECTION_THEMES = [
  "bg-blue-50/50 border-blue-200 text-blue-700",
  "bg-emerald-50/50 border-emerald-200 text-emerald-700",
  "bg-indigo-50/50 border-indigo-200 text-indigo-700",
  "bg-violet-50/50 border-violet-200 text-violet-700",
  "bg-cyan-50/50 border-cyan-200 text-cyan-700",
  "bg-slate-50 border-slate-200 text-slate-700",
] as const;

// I'm storing our static relationships here to map level-2 children to their parents.
const LEVEL_2_PARENTS: Record<string, string[]> = {
  "PREG ASSESSED (1ST TRI)": [
    "NORMAL BMI",
    "LOW BMI",
    "HIGH BMI",
    "- NORMAL BMI",
    "- LOW BMI",
    "- HIGH BMI",
  ],
  "PENTA 1": ["- 2", "- 3", "2", "3"],
  "OPV 1": ["- 2", "- 3", "2", "3"],
  "PCV 1": ["- 2", "- 3", "2", "3"],
  "IPV 1": ["- 2", "2"],
  "MCV 1": ["- 2", "2"],
  "HPV 1": ["- 2", "2"],
  "ANTI PNEUMONIA": [
    "BELOW 60 Y/O",
    "ABOVE 60 Y/O",
    "BELOW 60",
    "ABOVE 60",
    "- BELOW 60 Y/O",
    "- ABOVE 60 Y/O",
  ],
  "ANTI FLU": [
    "BELOW 60 Y/O",
    "ABOVE 60 Y/O",
    "BELOW 60",
    "ABOVE 60",
    "- BELOW 60 Y/O",
    "- ABOVE 60 Y/O",
  ],
  "VISUAL TEST": [
    "(20 - 59 Y/O)",
    "(60 Y/O ABOVE)",
    "- (20 - 59 Y/O)",
    "- (60 Y/O ABOVE)",
  ],
  "NEW PHILPEN RISK ASSESSED (20-59)": [
    "- SMOKER",
    "- DRINKER",
    "- OBESE",
    "- HPN",
    "- DM",
    "SMOKER",
    "DRINKER",
    "OBESE",
    "HPN",
    "DM",
  ],
  "NEW PHILPEN RISK ASSESSED (60 UP)": [
    "- SMOKER",
    "- DRINKER",
    "- OBESE",
    "- HPN",
    "- DM",
    "SMOKER",
    "DRINKER",
    "OBESE",
    "HPN",
    "DM",
  ],
};

// I'm taking our flat array of indicators and converting it into a nested tree format.
// This makes rendering our parent-child UI sections a breeze later on.
const buildTree = (inds: Indicator[]): TreeNode[] => {
  const tree: TreeNode[] = [];
  let currentLevel1: TreeNode | null = null;
  let currentLevel2: TreeNode | null = null;

  inds.forEach((ind) => {
    const cleanLabel = ind.label.trim();
    const upperLabel = cleanLabel.toUpperCase();
    const isNumbered = /^\d+\./.test(cleanLabel);

    // If the label starts with a number, I'm treating it as a top-level parent node.
    if (isNumbered) {
      currentLevel1 = { item: ind, children: [] };
      tree.push(currentLevel1);
      currentLevel2 = null;
    } else {
      // Here, I'm checking if this item acts as a level-2 parent based on our constants.
      const matchedParentKey = Object.keys(LEVEL_2_PARENTS).find((k) =>
        upperLabel.includes(k),
      );

      if (matchedParentKey) {
        currentLevel2 = { item: ind, children: [] };
        if (currentLevel1) currentLevel1.children.push(currentLevel2);
        else tree.push(currentLevel2);
      } else {
        let addedToLevel2 = false;

        // If we already have an active level-2 parent, I'm checking if this item belongs to it.
        if (currentLevel2) {
          const parentKey = Object.keys(LEVEL_2_PARENTS).find((k) =>
            currentLevel2!.item.label.toUpperCase().includes(k),
          );

          if (
            parentKey &&
            LEVEL_2_PARENTS[parentKey].some((c) => upperLabel.includes(c))
          ) {
            currentLevel2.children.push({ item: ind, children: [] });
            addedToLevel2 = true;
          }
        }

        // If it doesn't belong to level-2, I'm appending it to level-1 (or the root if needed).
        if (!addedToLevel2) {
          currentLevel2 = null;
          if (currentLevel1)
            currentLevel1.children.push({ item: ind, children: [] });
          else tree.push({ item: ind, children: [] });
        }
      }
    }
  });

  return tree;
};

// I'm using the nullish coalescing operator (??) to safely grab the section name, falling back to an empty string.
const getSectionName = (ind: Indicator): string =>
  ind.ref_sections?.name ?? ind.section_name ?? "";

export default function GeneralForm({
  indicators,
  entries,
  onUpdate,
}: FormProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // I'm handling the accordion toggle logic here. If it doesn't have children, I bail out early.
  const toggleGroup = (id: string, hasChildren: boolean): void => {
    if (!hasChildren) return;

    const isOpening = expandedGroup !== id;
    setExpandedGroup(isOpening ? id : null);

    // I'm giving the DOM a tiny bit of time to render the expanded content before scrolling it into view.
    setTimeout(() => {
      const element = document.getElementById(`section-${id}`);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  // I'm splitting the tree generation into two parts based on whether the indicators need to track gender splits.
  const singleValueTree = buildTree(
    indicators.filter(
      (i) =>
        getSectionName(i) === "General Report - Single Value" ||
        i.has_gender_split === false,
    ),
  );

  const splitValueTree = buildTree(
    indicators.filter(
      (i) =>
        getSectionName(i) === "General Report - Split Value" ||
        i.has_gender_split === true,
    ),
  );

  // I'm merging them back together so we can render them all in a single loop, tagging them with their type.
  const allSections = [
    ...singleValueTree.map((node) => ({ node, type: "single" as const })),
    ...splitValueTree.map((node) => ({ node, type: "split" as const })),
  ];

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-50 rounded-3xl shadow-xl border border-slate-200 relative mb-10 overflow-visible">
      <div className="bg-linear-to-br from-blue-600 to-indigo-700 p-6 md:p-10 text-white rounded-t-3xl">
        <h2 className="text-2xl md:text-4xl font-black tracking-tight uppercase">
          General Report
        </h2>
        <p className="text-blue-100 mt-2 text-sm md:text-lg opacity-90 font-medium">
          Monitoring and evaluation of healthcare program indicators.
        </p>
      </div>

      <div className="p-4 md:p-8 space-y-8 md:space-y-12">
        {allSections.map(({ node, type }, index) => {
          const isOpen = expandedGroup === node.item.id;
          const hasChildren = node.children.length > 0;
          const themeClass = SECTION_THEMES[index % SECTION_THEMES.length];
          const isNumberedSection =
            /^\d+\./.test(node.item.label) && hasChildren;

          return (
            <div
              key={node.item.id}
              id={`section-${node.item.id}`}
              className={`rounded-3xl border transition-all duration-300 scroll-mt-32 md:scroll-mt-20 ${themeClass} ${isOpen ? "pb-8" : "pb-0"}`}
            >
              <div
                className={`${
                  isNumberedSection
                    ? "sticky top-7 md:top-6 z-10 backdrop-blur-sm border-b border-black/5"
                    : ""
                } bg-inherit -mx-1 px-5 py-4 rounded-t-3xl transition-all`}
              >
                <button
                  onClick={() => toggleGroup(node.item.id, hasChildren)}
                  className={`w-full flex items-center gap-4 py-2 text-left group ${
                    !hasChildren ? "cursor-default" : "cursor-pointer"
                  }`}
                >
                  <h3 className="text-xl md:text-2xl font-black tracking-tight uppercase flex-1">
                    {node.item.label}
                  </h3>

                  {hasChildren && (
                    <div className="text-slate-500 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 group-hover:scale-110 transition-transform">
                      <svg
                        className={`w-6 h-6 transition-transform duration-500 ${
                          isOpen ? "rotate-180 text-blue-600" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              </div>

              <div
                className={`mt-6 px-4 md:px-8 space-y-6 ${
                  isOpen || !hasChildren ? "block" : "hidden"
                }`}
              >
                {!node.item.id.includes("synthetic") && (
                  <IndicatorCard
                    indicator={node.item}
                    entry={entries[node.item.id]}
                    onUpdate={onUpdate}
                    isSplit={type === "split"}
                    hideLabel={isNumberedSection}
                  />
                )}

                {/* I'm mapping through the children to render the nested sub-items. */}
                {node.children.map((childNode) => (
                  <div key={childNode.item.id} className="space-y-4">
                    <IndicatorCard
                      indicator={childNode.item}
                      entry={entries[childNode.item.id]}
                      onUpdate={onUpdate}
                      isSplit={type === "split"}
                      isSubItem
                      hasChildren={childNode.children.length > 0}
                    />

                    {/* I'm mapping one level deeper to catch any grand-children nodes. */}
                    {childNode.children.map((grandChild) => (
                      <IndicatorCard
                        key={grandChild.item.id}
                        indicator={grandChild.item}
                        entry={entries[grandChild.item.id]}
                        onUpdate={onUpdate}
                        isSplit={type === "split"}
                        isDeepSubItem
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-6 bg-white/50 text-center text-sm text-slate-400 font-medium rounded-b-3xl border-t border-slate-200">
        All data is encrypted and synced in real-time.
      </div>
    </div>
  );
}

function IndicatorCard({
  indicator,
  entry,
  onUpdate,
  isSplit,
  isSubItem = false,
  isDeepSubItem = false,
  hasChildren = false,
  hideLabel = false,
}: IndicatorCardProps) {
  // I'm retaining this executable void check so the linter doesn't complain about an unused prop.
  void hasChildren;

  // I'm using nullish coalescing again to ensure we always have a safe number to pass to the counter.
  const currentM = entry?.value_m ?? 0;
  const currentF = entry?.value_f ?? 0;

  // I'm defining our base classes here as lets so we can append modifiers based on the depth of the item.
  let containerClasses =
    "relative bg-white border shadow-sm transition-all duration-200 hover:shadow-lg focus-within:ring-2 focus-within:ring-blue-100 ";
  let headerClasses =
    "px-5 py-4 border-b flex justify-between items-center rounded-t-2xl ";

  if (isDeepSubItem) {
    containerClasses +=
      "ml-8 md:ml-16 border-l-4 border-l-amber-400 rounded-xl rounded-l-none scale-[0.98]";
    headerClasses += "bg-amber-50/30 border-amber-100";
  } else if (isSubItem) {
    containerClasses +=
      "ml-4 md:ml-8 border-l-4 border-l-blue-400 rounded-2xl rounded-l-none";
    headerClasses += "bg-blue-50/30 border-blue-100";
  } else {
    containerClasses += "rounded-2xl border-slate-200";
    headerClasses += "bg-slate-50/80 border-slate-100";
  }

  return (
    <div className={containerClasses}>
      {!hideLabel && (
        <div className={headerClasses}>
          <h4
            className={`font-extrabold text-slate-800 ${
              isDeepSubItem ? "text-sm" : isSubItem ? "text-base" : "text-lg"
            }`}
          >
            {indicator.label}
          </h4>
        </div>
      )}

      {/* I'm splitting the view conditionally based on whether this indicator requires distinct male/female values. */}
      {isSplit ? (
        <div
          className={`flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 ${
            hideLabel ? "rounded-t-2xl" : ""
          }`}
        >
          <div className="flex-1 p-5 bg-blue-50/20">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                Male (M)
              </span>
              <TallyCounter
                label=""
                value={currentM}
                onChange={(val: number) => onUpdate(indicator.id, "m", val)}
              />
            </div>
          </div>

          <div className="flex-1 p-5 bg-rose-50/20 rounded-b-2xl md:rounded-bl-none md:rounded-br-2xl">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                Female (F)
              </span>
              <TallyCounter
                label=""
                value={currentF}
                onChange={(val: number) => onUpdate(indicator.id, "f", val)}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`p-5 bg-white rounded-b-2xl ${
            hideLabel ? "rounded-t-2xl" : ""
          }`}
        >
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total Count
            </span>
            <TallyCounter
              label=""
              value={currentM}
              onChange={(val: number) => onUpdate(indicator.id, "m", val)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
