"use client";

import { useState, JSX } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CloudCheck } from "lucide-react";
import TeenagePregnancyForm from "@/src/components/reports/TeenagePregnancyForm";
import DewormingForm from "@/src/components/reports/DewormingForm";
import BcgHepaBForm from "@/src/components/reports/BcgHepaBForm";
import NatalityForm from "@/src/components/reports/NatalityForm";
import GeneralForm from "@/src/components/reports/GeneralForm";
import StandardForm from "@/src/components/reports/StandardForm";
import ReportSavedModal from "@/src/components/modals/ReportSavedModal";

interface Indicator {
  id: string;
  label: string;
  has_gender_split: boolean;
}

interface DataEntry {
  indicator_id: string;
  value_m: number;
  value_f: number;
  [key: string]: any;
}

interface ReportEditorProps {
  reportId: string;
  reportType: string;
  reportMonth: string;
  indicators: Indicator[];
  initialEntries: DataEntry[];
}

type SaveStatus = "All changes saved" | "Saving..." | "";

export default function ReportEditor({
  reportId,
  reportType,
  reportMonth,
  indicators,
  initialEntries,
}: ReportEditorProps) {
  const supabase = createClient();
  const router = useRouter();

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("All changes saved");
  const [showModal, setShowModal] = useState<boolean>(false);

  /* I’m transforming the initial array of entries into a keyed object (dictionary). 
     This makes it much faster for me to look up specific values by their ID 
     later on without having to loop through the whole array every time.
  */
  const [entries, setEntries] = useState<Record<string, DataEntry>>(() => {
    const dict: Record<string, DataEntry> = {};
    initialEntries.forEach((entry) => {
      dict[entry.indicator_id] = entry;
    });
    return dict;
  });

  /* This is the "heart" of the auto-save logic. Whenever a user changes a number, 
     I’m updating the local state immediately so the UI feels snappy, 
     and then I’m firing off an 'upsert' to Supabase to keep the database in sync.
  */
  const handleUpdate = async (
    indicatorId: string,
    gender: "m" | "f",
    newValue: number,
  ): Promise<void> => {
    setSaveStatus("Saving...");

    const currentEntry = entries[indicatorId] || {
      indicator_id: indicatorId,
      value_m: 0,
      value_f: 0,
    };

    const updatedEntry = {
      ...currentEntry,
      [gender === "m" ? "value_m" : "value_f"]: newValue,
    };

    setEntries((prev) => ({ ...prev, [indicatorId]: updatedEntry }));

    await supabase.from("data_entries").upsert(
      {
        report_id: reportId,
        indicator_id: indicatorId,
        value_m: updatedEntry.value_m,
        value_f: updatedEntry.value_f,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "report_id, indicator_id" },
    );

    setSaveStatus("All changes saved");
  };

  /* I’m using this helper to figure out which specific sub-form to display. 
     Instead of cluttering the main return statement with a giant switch case, 
     I grouped the logic here so it's easier for me to maintain as we add new report types.
  */
  const renderForm = (): JSX.Element => {
    if (
      reportType === "TEENAGE PREGNANCY AND POST PARTUM" ||
      reportType === "TEENAGE PREGNANCY"
    ) {
      return (
        <TeenagePregnancyForm
          indicators={indicators}
          entries={entries}
          onUpdate={handleUpdate}
        />
      );
    }

    if (reportType === "DEWORMING AND VITAMIN A") {
      return (
        <DewormingForm
          indicators={indicators}
          entries={entries}
          onUpdate={handleUpdate}
          reportMonth={reportMonth}
        />
      );
    }

    if (reportType === "BCG/HEPA B" || reportType === "BCG / HEPA B") {
      return (
        <BcgHepaBForm
          indicators={indicators}
          entries={entries}
          onUpdate={handleUpdate}
        />
      );
    }

    if (reportType === "NATALITY") {
      return (
        <NatalityForm
          indicators={indicators}
          entries={entries}
          onUpdate={handleUpdate}
        />
      );
    }

    if (reportType === "GENERAL REPORT" || reportType === "GENERAL") {
      return (
        <GeneralForm
          indicators={indicators}
          entries={entries}
          onUpdate={handleUpdate}
        />
      );
    }

    return (
      <StandardForm
        indicators={indicators}
        entries={entries}
        onUpdate={handleUpdate}
      />
    );
  };

  return (
    <div className="w-full space-y-8 pb-24">
      {renderForm()}

      {/* I’m creating a sticky bar at the bottom here. It serves two purposes: 
          1. It gives the user immediate feedback that their changes are saved to the cloud.
          2. It provides a clear "Finish" action that opens up my confirmation modal.
      */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-6xl px-4 z-50 md:pl-64">
        <div className="bg-white border-t border-gray-200 p-4 shadow-lg flex justify-between items-center rounded-t-xl">
          <div className="text-sm font-medium text-gray-500">
            {saveStatus === "Saving..." ? (
              <span className="text-yellow-600 flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="text-green-600 flex items-center gap-1.5">
                <CloudCheck className="w-4 h-4" />
                {saveStatus}
              </span>
            )}
          </div>

          {/* I’m dynamically changing the button color based on the report type 
              to keep the branding consistent across different healthcare categories.
          */}
          <Button
            onClick={() => setShowModal(true)}
            className={`font-bold rounded-xl px-6 text-white ${
              reportType.includes("TEENAGE")
                ? "bg-purple-600 hover:bg-purple-700"
                : reportType === "DEWORMING AND VITAMIN A"
                  ? "bg-teal-600 hover:bg-teal-700"
                  : reportType.includes("GENERAL")
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Done & Close
          </Button>
        </div>
      </div>

      <ReportSavedModal isOpen={showModal} reportType={reportType} />
    </div>
  );
}
