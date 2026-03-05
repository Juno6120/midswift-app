import { createBrowserClient } from "@supabase/ssr";

/* I'm setting up our Supabase client here specifically for the browser environment.
  
  By using 'createBrowserClient' from the SSR package instead of the standard 
  Supabase package, I'm ensuring that our authentication cookies are automatically 
  parsed and handled behind the scenes whenever this runs on the client side.

  I also added the exclamation marks (!) at the end of the environment variables. 
  This is my way of strictly telling TypeScript, "Don't worry, I guarantee these 
  variables will definitely exist at runtime," so it stops warning us that they 
  might be undefined.
*/
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
