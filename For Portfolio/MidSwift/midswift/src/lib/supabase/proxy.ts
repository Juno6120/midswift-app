import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  /* First, I need to create a baseline response object. 
    I'm just passing along the headers from the incoming request so I have 
    something to attach my updated cookies to later.
  */
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  /* Here, I'm spinning up the server-side Supabase client. 
    Because we are intercepting a request on the server, we don't have direct 
    access to the browser's cookie jar. So, I have to explicitly tell Supabase 
    how to get and set cookies during this request lifecycle.
  */
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          /* When Supabase tells me it needs to update a cookie (like when a 
            session token refreshes), I first update the incoming request cookies 
            so the rest of my server code sees the fresh data.
          */
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          /* Then, I update my actual outgoing response object. This ensures 
            the new cookie actually gets sent back down to the user's browser 
            to be saved.
          */
          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  /* Now I'm asking Supabase who the current user is. 
    This is super important: calling 'getUser()' here does the heavy lifting 
    of validating the token and automatically refreshing it if it has expired.
  */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  /* This is my main route protection logic. 
    If there is no user logged in, and they are trying to access a protected 
    page (meaning they aren't already on the login or signup page), I immediately 
    reroute them back to the login page.
  */
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/signup")
  ) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  /* On the flip side, if the user IS logged in, they shouldn't be looking 
    at the login or signup pages anymore. Unless they explicitly clicked a 
    "switch account" button (which I track via search params), I'm going to 
    bounce them straight into their dashboard.
  */
  if (
    user &&
    (request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/signup")) &&
    request.nextUrl.searchParams.get("switch") !== "true"
  ) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  /* If they passed all the checks above, they are good to go. 
    I just return the response object so the server can continue loading the page.
  */
  return supabaseResponse;
}
