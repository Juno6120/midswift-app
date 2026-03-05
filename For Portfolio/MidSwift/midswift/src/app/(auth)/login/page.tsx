import { Suspense, type ReactElement } from "react";
import LoginPageContent from "./LoginPageContent";

// Hey again! I'm tweaking my previous approach. Since TypeScript was
// complaining about the global JSX namespace, I'm explicitly importing
// `ReactElement` right from React itself. It does the exact same thing
// (tells TS this function returns a rendered React component), but it's
// much more robust and works beautifully across all build tools!
export default function LoginPage(): ReactElement {
  // Here, I'm returning our component tree to the DOM.
  return (
    // I'm wrapping our page content inside a Suspense boundary.
    // I'm doing this because if `LoginPageContent` is doing anything asynchronous
    // behind the scenes (like lazy-loading chunks or fetching data), Suspense
    // will catch that "pausing" state automatically.
    <Suspense>
      {/* And here I'm rendering the actual meat of the login page. */}
      <LoginPageContent />
    </Suspense>
  );
}
