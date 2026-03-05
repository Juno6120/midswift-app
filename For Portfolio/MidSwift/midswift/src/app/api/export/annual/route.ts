import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  exportBCGToWord,
  exportTeenagePregnancyToWord,
  exportDewormingToWord,
  exportNatalityToWord,
  exportGeneralToWord,
} from "@/src/lib/docx";

interface Indicator {
  id: string;
  label: string;
  has_gender_split: boolean;
  section_name: string;
}

interface DataEntry {
  report_id: string;
  indicator_id: string;
  value_m: number | null;
  value_f: number | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const year = searchParams.get("year");

  if (!type || !year) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const cookieStore = await cookies();
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, rhu_station")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
  }

  const preparedBy = userProfile?.full_name ?? "Unknown User";
  const brgy = userProfile?.rhu_station ?? "";

  let indicatorsQuery = supabase
    .from("ref_indicators")
    .select(
      `
      id, 
      label, 
      has_gender_split,
      ref_sections!inner(name)
    `,
    )
    .order("sort_order");

  if (type === "GENERAL" || type === "GENERAL REPORT") {
    indicatorsQuery = indicatorsQuery.in("ref_sections.name", [
      "General Report - Single Value",
      "General Report - Split Value",
    ]);
  } else {
    indicatorsQuery = indicatorsQuery.eq("ref_sections.name", type);
  }

  const { data: rawIndicators, error: indError } = await indicatorsQuery;

  if (indError) {
    console.error("Error fetching indicators:", indError);
    return NextResponse.json(
      { error: "Failed to fetch indicators" },
      { status: 500 },
    );
  }

  const indicators: Indicator[] =
    rawIndicators?.map((ind: any) => ({
      id: ind.id,
      label: ind.label,
      has_gender_split: ind.has_gender_split,
      section_name: ind.ref_sections?.name,
    })) || [];

  let dbReportType = type;
  if (type === "GENERAL" || type === "GENERAL REPORT") {
    dbReportType = "GENERAL REPORT";
  }

  const { data: reports } = await supabase
    .from("reports")
    .select("id, report_month")
    .eq("midwife_id", user.id)
    .eq("report_type", dbReportType)
    .eq("report_year", parseInt(year));

  const reportMonthMap: Record<string, string> = {};
  const reportIds =
    reports?.map((r) => {
      reportMonthMap[r.id] = r.report_month;
      return r.id;
    }) || [];

  let entries: DataEntry[] = [];
  if (reportIds.length > 0) {
    const { data } = await supabase
      .from("data_entries")
      .select("report_id, indicator_id, value_m, value_f")
      .in("report_id", reportIds);

    if (data) entries = data as DataEntry[];
  }

  const dataMap: Record<string, Record<string, { m: number; f: number }>> = {};

  indicators.forEach((ind) => {
    dataMap[ind.id] = {};
  });

  entries.forEach((e) => {
    const month = reportMonthMap[e.report_id];
    if (month && dataMap[e.indicator_id]) {
      dataMap[e.indicator_id][month] = {
        m: e.value_m || 0,
        f: e.value_f || 0,
      };
    }
  });

  let buffer: Buffer | Uint8Array;
  let filename = "";

  const formattedBrgy = brgy.replace(/\s+/g, "").toUpperCase();

  if (type === "BCG/HEPA B") {
    buffer = await exportBCGToWord(
      year,
      indicators,
      entries,
      reportMonthMap,
      preparedBy,
      brgy,
    );
    filename = `${year}_${formattedBrgy}_BCGHEPAB.docx`;
  } else if (type === "TEENAGE PREGNANCY") {
    buffer = await exportTeenagePregnancyToWord(
      year,
      indicators,
      dataMap,
      preparedBy,
      brgy,
    );
    filename = `${year}_${formattedBrgy}_TEENAGEPREGNANCY.docx`;
  } else if (type === "DEWORMING" || type === "DEWORMING AND VITAMIN A") {
    buffer = await exportDewormingToWord(
      year,
      indicators,
      dataMap,
      preparedBy,
      brgy,
    );
    filename = `${year}_${formattedBrgy}_DEWORMINGANDVITAMINA.docx`;
  } else if (type === "NATALITY") {
    buffer = await exportNatalityToWord(
      year,
      indicators,
      entries,
      reportMonthMap,
      preparedBy,
      brgy,
    );
    filename = `${year}_${formattedBrgy}_NATALITY.docx`;
  } else if (type === "GENERAL REPORT" || type === "GENERAL") {
    buffer = await exportGeneralToWord(
      year,
      indicators,
      entries,
      reportMonthMap,
      preparedBy,
      brgy,
      "GENERAL REPORT",
    );
    filename = `${year}_${formattedBrgy}_GENERALREPORT.docx`;
  } else {
    buffer = await exportBCGToWord(
      year,
      indicators,
      entries,
      reportMonthMap,
      preparedBy,
      brgy,
    );
    const safeType = type.replace(/[\/\s]+/g, "").toUpperCase();
    filename = `${year}_${formattedBrgy}_${safeType}.docx`;
  }

  if (searchParams.get("format") === "json") {
    return NextResponse.json({
      type,
      year,
      brgy,
      preparedBy,
      indicators,
      entries,
      reportMonthMap,
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
