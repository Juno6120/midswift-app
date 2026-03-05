import { TallyCounter } from "@/src/components/forms/TallyCounter";

// I'm using interfaces here instead of types for consistency,
// which is a standard best practice in TypeScript for object shapes.
interface Indicator {
  readonly id: string;
  readonly label: string;
  readonly has_gender_split: boolean;
}

// I'm keeping the snake_case keys (value_m, value_f) because they likely
// map directly to your backend or database schema.
interface DataEntry {
  readonly indicator_id: string;
  readonly value_m: number;
  readonly value_f: number;
}

// For our component props, I'm enforcing immutability using ReadonlyArray
// and Readonly<Record>. This tells TypeScript to yell at us if we ever
// try to accidentally mutate these props directly inside the component.
interface FormProps {
  readonly indicators: ReadonlyArray<Indicator>;
  readonly entries: Readonly<Record<string, DataEntry>>;
  readonly onUpdate: (
    indicatorId: string,
    gender: "m" | "f",
    newValue: number,
  ) => void;
}

export default function TeenagePregnancyForm({
  indicators,
  entries,
  onUpdate,
}: FormProps) {
  // I'm wrapping everything in a responsive container. The overflow-visible
  // is handy here just in case any dropdowns or tooltips get added later.
  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-50 rounded-3xl shadow-xl border border-slate-200 relative overflow-visible">
      {" "}
      {/* I'm making this header sticky. It's super helpful for users 
          so they don't lose context if they have to scroll down a long list. */}
      <div className="bg-purple-600 p-6 md:p-8 text-white rounded-t-3xl sticky top-7 md:top-6 z-20 shadow-lg">
        {" "}
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          TEENAGE PREGNANCY REPORT FORM
        </h2>
        <p className="text-purple-100 mt-1 text-sm md:text-base opacity-90">
          Record data for the specific age brackets below.
        </p>
      </div>
      <div className="p-4 md:p-6 space-y-6">
        {/* I'm looping through our indicators array to generate a card for each one. */}
        {indicators.map((indicator) => {
          // Here, I'm grabbing the current values from our entries dictionary.
          // It looks like we're repurposing 'value_m' and 'value_f' from a generic
          // backend to represent our age brackets. I'm using optional chaining (?.)
          // and a fallback to 0 so the component doesn't crash if an entry doesn't exist yet.
          const current10to14 = entries[indicator.id]?.value_m || 0;
          const current15to19 = entries[indicator.id]?.value_f || 0;

          return (
            <div
              key={indicator.id}
              className="relative bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:border-purple-300 hover:shadow-md"
            >
              {/* This is the top section of the card showing the actual question or indicator label. */}
              <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 rounded-t-2xl">
                <h3 className="font-bold text-slate-800 text-lg md:text-xl">
                  {indicator.label}
                </h3>
              </div>

              {/* I'm splitting the bottom half into two columns on desktop, 
                  and stacking them on mobile for better responsiveness. */}
              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
                {/* This is the block for the 10-14 age bracket. Notice how I'm passing 
                    "m" into the onUpdate function to keep it aligned with our data structure. */}
                <div className="flex-1 p-4 bg-purple-50/30">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 ml-1">
                      10 - 14 Y/O
                    </span>
                    <TallyCounter
                      label=""
                      value={current10to14}
                      onChange={(val) => onUpdate(indicator.id, "m", val)}
                    />
                  </div>
                </div>

                {/* And here is the block for the 15-19 age bracket. I'm passing "f" 
                    to the onUpdate function here. */}
                <div className="flex-1 p-4 bg-fuchsia-50/30 rounded-b-2xl md:rounded-bl-none md:rounded-br-2xl">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-600 ml-1">
                      15 - 19 Y/O
                    </span>
                    <TallyCounter
                      label=""
                      value={current15to19}
                      onChange={(val) => onUpdate(indicator.id, "f", val)}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Just a simple footer to assure the user that they don't need to look for a save button. */}
      <div className="p-4 bg-slate-100 text-center text-xs text-slate-500 italic rounded-b-3xl border-t border-slate-200">
        Changes are saved automatically as you adjust the counters.
      </div>
    </div>
  );
}
