import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "./DashboardLayoutClient";

/**
 * I'm defining this interface to describe the specific shape of the profile
 * data I'm expecting from my database. This keeps things type-safe.
 */
interface Profile {
  full_name: string | null;
  rhu_station: string | null;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * I'm grabbing the cookies from the request headers here.
   * I need these so Supabase can verify if the user has an active session.
   */
  const cookieStore = await cookies();

  /**
   * I'm initializing the Supabase client for the server side.
   * I'm using the "!" because I've already confirmed these environment
   * variables exist in my project setup.
   */
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

  /**
   * I'm checking with Supabase to see who the currently logged-in user is.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /**
   * If I don't find a user, I'm cutting the process short and
   * redirecting them straight to the login page.
   */
  if (!user) {
    redirect("/login");
  }

  /**
   * Now that I know the user is legit, I'm fetching their specific profile
   * details from the 'profiles' table using their unique ID.
   * I'm using .single<Profile>() to tell TypeScript exactly what the result looks like.
   */
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, rhu_station")
    .eq("id", user.id)
    .single<Profile>();

  /**
   * [NEW FIX]
   * TypeScript knows `profile` might be null if the database row doesn't exist yet.
   * By checking for null and redirecting, we guarantee `profile` is valid past this point.
   */
  if (!profile) {
    // Redirecting to a setup page if they don't have a profile yet.
    // Adjust this route to whatever makes sense for your app!
    redirect("/setup-profile");
  }

  /**
   * Finally, I'm passing that profile data into the Client Component
   * so it can render the interactive parts of the dashboard for the user.
   */
  return (
    <DashboardLayoutClient profile={profile}>{children}</DashboardLayoutClient>
  );
}
