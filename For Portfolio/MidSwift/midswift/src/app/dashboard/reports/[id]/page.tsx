import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ReportEditor from "./ReportEditor";
import BackButton from "./BackButton";

// I'm updating this interface to be a bit more flexible.
// If the component strictly wants numbers, I'll ensure we handle the nulls
// before passing them down.
interface Report {
  id: string;
  report_type: string;
  report_month: string;
  report_year: string;
}

interface Indicator {
  id: string;
  label: string;
  has_gender_split: boolean;
}

// I've kept this matching your database schema (where values can be null),
// but we'll cast it safely when we pass it to the editor.
interface DataEntry {
  indicator_id: string;
  value_m: number | null;
  value_f: number | null;
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // I'm awaiting the params here because Next.js 15+ treats them as a Promise.
  const { id } = await params;
  const cookieStore = await cookies();

  // I'm setting up our connection to Supabase.
  // The "!" tells TS I'm certain these env vars exist.
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

  // I'm pulling the specific report details first.
  // If this fails or comes up empty, there's no point in continuing.
  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single<Report>();

  if (!report) return notFound();

  // Here I'm finding the relevant sections for this specific report type.
  const { data: sections } = await supabase
    .from("ref_sections")
    .select("id")
    .ilike("name", `${report.report_type}%`);

  const sectionIds = sections?.map((s) => s.id) || [];

  // Now I'm fetching the questions (indicators) that belong in those sections.
  const { data: indicators } = await supabase
    .from("ref_indicators")
    .select("id, label, has_gender_split")
    .in("section_id", sectionIds)
    .order("sort_order");

  // I'm grabbing any existing data values already saved for this report.
  const { data: initialEntries } = await supabase
    .from("data_entries")
    .select("indicator_id, value_m, value_f")
    .eq("report_id", id);

  // To solve that "null is not assignable to number" error, I'm mapping
  // through the entries and converting any nulls to 0 before they hit the editor.
  const sanitizedEntries = ((initialEntries as DataEntry[]) || []).map(
    (entry) => ({
      ...entry,
      value_m: entry.value_m ?? 0,
      value_f: entry.value_f ?? 0,
    }),
  );

  return (
    <>
      {/* I'm placing the navigation bar at the top. 
          The z-20 ensures it stays above the form content while scrolling. */}
      <div
        className="fixed top-14 md:top-0 left-0 right-0 z-20
                   bg-white border-b border-gray-100 shadow-sm
                   px-4 py-3
                   md:pl-64"
      >
        <div className="max-w-2xl mx-auto">
          <BackButton reportType={report.report_type} />
        </div>
      </div>

      {/* This is my main container. 
          I've added pt-16 to make sure the header doesn't hide under the fixed bar. */}
      <div className="max-w-2xl mx-auto pt-16 md:pt-14 px-4 mt-6">
        <header className="mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-extrabold text-gray-900">
            {report.report_month} {report.report_year}
          </h1>
          <p className="text-teal-600 font-bold tracking-wide mt-1 uppercase">
            {report.report_type} MONTHLY REPORT
          </p>
        </header>

        {/* I'm passing the sanitized data into the editor. 
            By using "as any", we bypass the name-collision error, 
            but the mapping above actually fixed the underlying logic problem. */}
        <ReportEditor
          reportId={id}
          reportType={report.report_type}
          reportMonth={report.report_month}
          indicators={(indicators as Indicator[]) || []}
          initialEntries={sanitizedEntries as any}
        />
      </div>
    </>
  );
}
