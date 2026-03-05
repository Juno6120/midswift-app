"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * I'm defining this interface so we have a consistent way to talk back to
 * the UI. It ensures I always send a 'success' flag and a 'message'.
 */
interface ServerActionResponse {
  success: boolean;
  message: string;
}

/**
 * I created this helper because I don't want to copy-paste the Supabase
 * config every time I need to talk to the database. It handles the
 * cookie handshakes for me.
 */
async function getSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch (error) {
            // I'm catching this because sometimes Next.js gets grumpy
            // if you try to set cookies in a Server Component context.
          }
        },
      },
    },
  );
}

export async function deleteReport(
  reportId: string,
): Promise<ServerActionResponse> {
  const supabase = await getSupabaseClient();

  // First, I'm clearing out the data entries linked to this report.
  // I do this to keep the database tidy and avoid any foreign key issues.
  const { error: entriesError } = await supabase
    .from("data_entries")
    .delete()
    .eq("report_id", reportId);

  if (entriesError) {
    throw new Error("Failed to delete report data.");
  }

  // Now that the entries are gone, I can safely remove the report itself.
  const { error: reportError } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId);

  if (reportError) {
    throw new Error("Failed to delete the report.");
  }

  // I'm telling Next.js to refresh the dashboard data so the user
  // sees the report disappear immediately.
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Successfully deleted 1 report.",
  };
}

export async function deleteReportsBatch(
  reportIds: string[],
): Promise<ServerActionResponse> {
  // If the user didn't actually select anything, I'm just going to
  // exit early rather than bugging the database.
  if (!reportIds || reportIds.length === 0) {
    return { success: false, message: "No reports selected." };
  }

  const supabase = await getSupabaseClient();

  // Here, I'm using the '.in' filter to wipe out all the entries
  // belonging to the whole list of IDs at once.
  const { error: entriesError } = await supabase
    .from("data_entries")
    .delete()
    .in("report_id", reportIds);

  if (entriesError) {
    throw new Error("Failed to batch delete entries.");
  }

  // Now I'm doing the same for the reports themselves.
  const { error: reportError } = await supabase
    .from("reports")
    .delete()
    .in("id", reportIds);

  if (reportError) {
    throw new Error("Failed to batch delete reports.");
  }

  // Again, I'll trigger a refresh so the UI stays in sync with our DB.
  revalidatePath("/dashboard");

  return {
    success: true,
    message: `Successfully deleted ${reportIds.length} reports.`,
  };
}
