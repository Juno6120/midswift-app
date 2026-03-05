import { TallyCounter } from "@/src/components/forms/TallyCounter";

// I extracted the gender options into their own specific type.
// It makes the signature cleaner and easier to update later if we ever need to.
type Gender = "m" | "f";

// I switched these from 'type' to 'interface' for consistency.
// I also marked the properties as readonly because in React, we really shouldn't
// be mutating our data objects or props directly. This gives us strict safety.
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

interface FormProps {
  // Using ReadonlyArray ensures we don't accidentally push or pop items from the props.
  readonly indicators: ReadonlyArray<Indicator>;
  // Record is perfect here, but marking it readonly reinforces our immutable data flow.
  readonly entries: Readonly<Record<string, DataEntry>>;
  readonly onUpdate: (
    indicatorId: string,
    gender: Gender,
    newValue: number,
  ) => void;
}

export default function BcgHepaBForm({
  indicators,
  entries,
  onUpdate,
}: FormProps) {
  // I'm wrapping everything in a main container with some nice rounded corners and shadows
  // to make it pop off the page and look like a cohesive document.
  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-50 rounded-3xl shadow-xl border border-slate-200 relative overflow-visible">
      {/* I'm making this header sticky so the user always knows what form they are filling out, 
          even if they have to scroll down a really long list of indicators. */}
      <div className="bg-blue-600 p-6 md:p-8 text-white rounded-t-3xl sticky top-7 md:top-6 z-20 shadow-lg">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          BCG & HEPA B REPORT FORM
        </h2>
        <p className="text-blue-100 mt-1 text-sm md:text-base opacity-90">
          Immunization Registry: Record male and female infant data.
        </p>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Here, I'm looping through our list of indicators to build out the individual cards. */}
        {indicators.map((indicator) => {
          // I'm safely plucking out the current values for male and female.
          // I switched to using '??' (nullish coalescing) instead of '||' because if a value
          // happens to be exactly 0, '||' treats it as falsey, whereas '??' handles 0 perfectly.
          const currentM = entries[indicator.id]?.value_m ?? 0;
          const currentF = entries[indicator.id]?.value_f ?? 0;

          return (
            // I'm keeping your transition effects here because they give a really nice,
            // tactile feel when the user hovers over a specific row.
            <div
              key={indicator.id}
              className="relative bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md"
            >
              {/* I'm separating the label into its own header section within the card 
                  so it's clearly distinct from the actual input fields. */}
              <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 rounded-t-2xl">
                <h3 className="font-bold text-slate-800 text-lg md:text-xl">
                  {indicator.label}
                </h3>
              </div>

              {/* I only want to show the male/female split if the indicator actually requires it. */}
              {indicator.has_gender_split && (
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
                  {/* This is the male entry block. I gave it a slight blue tint to visually group it. */}
                  <div className="flex-1 p-4 bg-blue-50/30">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 ml-1">
                        Male (M)
                      </span>
                      {/* I'm hooking up the counter. When it changes, I just pass the specific 'm' flag 
                          up to our parent component via the onUpdate callback. */}
                      <TallyCounter
                        label=""
                        value={currentM}
                        onChange={(val) => onUpdate(indicator.id, "m", val)}
                      />
                    </div>
                  </div>

                  {/* This is the female entry block. Similar deal, but with a rose tint for quick visual scanning. */}
                  <div className="flex-1 p-4 bg-rose-50/30 rounded-b-2xl md:rounded-bl-none md:rounded-br-2xl">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 ml-1">
                        Female (F)
                      </span>
                      {/* Same as above, I'm just passing the 'f' flag when this counter updates. */}
                      <TallyCounter
                        label=""
                        value={currentF}
                        onChange={(val) => onUpdate(indicator.id, "f", val)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Just a friendly reminder footer to let users know their work is safe. */}
      <div className="p-4 bg-slate-100 text-center text-xs text-slate-500 italic rounded-b-3xl border-t border-slate-200">
        Changes are saved automatically as you adjust the counters.
      </div>
    </div>
  );
}
