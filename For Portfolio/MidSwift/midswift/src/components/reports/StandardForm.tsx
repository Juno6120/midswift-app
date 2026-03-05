import { ReactElement } from "react";
import { TallyCounter } from "@/src/components/forms/TallyCounter";

// I'm setting up these interfaces to define the exact shape of my data.
// Using interfaces over types for objects is a nice habit because they are easily extendable later.
interface Indicator {
  id: string;
  label: string;
  has_gender_split: boolean;
}

interface DataEntry {
  indicator_id: string;
  value_m: number;
  value_f: number;
}

// I'm creating a specific type for gender instead of using raw strings everywhere.
// This way, TypeScript will yell at me if I accidentally type "male" instead of "m" later down the line.
type Gender = "m" | "f";

// Here is the blueprint for the props my form needs to work correctly.
interface FormProps {
  indicators: Indicator[];
  entries: Record<string, DataEntry>;
  onUpdate: (indicatorId: string, gender: Gender, newValue: number) => void;
}

export default function StandardForm({
  indicators,
  entries,
  onUpdate,
}: FormProps): ReactElement {
  // I'm returning a main wrapper div to give my list of cards some breathing room.
  return (
    <div className="space-y-4">
      {/* Now, I'm looping through every indicator passed into the props so I can build out the form. */}
      {indicators.map((indicator) => {
        // I'm grabbing the current tally values. I use optional chaining (?.) just in case
        // there's no entry for this indicator yet. I'm also using the nullish coalescing
        // operator (??) instead of (||) to default to 0. It's much safer for numbers!
        const currentM = entries[indicator.id]?.value_m ?? 0;
        const currentF = entries[indicator.id]?.value_f ?? 0;

        return (
          <div
            // I absolutely need to include this unique key so React can keep track of these
            // cards efficiently without re-rendering everything unnecessarily.
            key={indicator.id}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"
          >
            <h3 className="font-bold text-gray-800 mb-4 text-lg">
              {indicator.label}
            </h3>

            {/* I'm checking a condition here: I only want to show the tally counters 
                if this specific indicator requires us to split the data by gender. */}
            {indicator.has_gender_split && (
              <div className="space-y-2">
                <TallyCounter
                  label="Male (M)"
                  value={currentM}
                  onChange={(val) => onUpdate(indicator.id, "m", val)}
                />
                <TallyCounter
                  label="Female (F)"
                  value={currentF}
                  onChange={(val) => onUpdate(indicator.id, "f", val)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
