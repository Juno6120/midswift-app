"use client";

import { useEffect } from "react";
import { useLoading } from "@/src/context/LoadingContext";

// I'm creating this utility component so I can drop it anywhere in my app
// to instantly kill the global loading state when a page or section finishes rendering.
export default function LoaderStopper(): null {
  // I'm pulling the stopLoading function from my custom context so I have
  // a direct line to update the global loading state.
  const { stopLoading } = useLoading();

  // I'm setting up an effect that fires the moment this component hits the DOM.
  // Since my goal is just to stop the loader immediately, I call stopLoading right here.
  useEffect(() => {
    stopLoading();
  }, [stopLoading]);

  // I'm returning null because this is strictly a logical component.
  // I don't want it taking up any actual space or rendering anything visible on the page.
  return null;
}
