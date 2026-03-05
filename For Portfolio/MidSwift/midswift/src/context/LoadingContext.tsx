"use client";
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  JSX,
} from "react";
import LoadingScreen from "@/src/components/ui/LoadingScreen";

// I'm defining exactly what my custom hook will return so TypeScript can
// catch me if I ever try to call a method that doesn't exist on this context.
interface LoadingContextType {
  readonly startLoading: () => void;
  readonly stopLoading: () => void;
}

// I'm setting up a quick interface for the provider's props. Making the children
// readonly is a great habit to ensure React props aren't accidentally mutated.
interface LoadingProviderProps {
  readonly children: React.ReactNode;
}

// Here I'm creating the actual context. I'm giving it some empty dummy functions
// as a fallback just to satisfy TypeScript's strict null checks initially.
const LoadingContext = createContext<LoadingContextType>({
  startLoading: () => {},
  stopLoading: () => {},
});

// This is my main wrapper component. I'm going to wrap my app (or a specific layout)
// with this so that everything inside it can trigger the loading screen.
export const LoadingProvider = ({
  children,
}: LoadingProviderProps): JSX.Element => {
  // I need two pieces of state here: one to track if the loading screen should be visible,
  // and another to track if that loader has been spinning for way too long.
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTimeout, setIsTimeout] = useState<boolean>(false);

  // I'm using a ref to hold onto my timeout timer. This way, I can easily grab
  // the current timer ID and clear it out when I need to stop the loader.
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // When I call this function, I want to immediately show the loading screen
  // and make sure my timeout state is reset to false for a fresh start.
  const startLoading = (): void => {
    setIsLoading(true);
    setIsTimeout(false);

    // I'm kicking off a 10-second timer right here. If the loader is still running
    // after 10 seconds, this will flip the timeout state to true and show my warning.
    timerRef.current = setTimeout(() => {
      setIsTimeout(true);
    }, 10000);
  };

  // This is my kill switch. I'm hiding the loading screen, resetting the timeout warning,
  // and most importantly, I'm destroying the active timer so it doesn't trigger in the background.
  const stopLoading = (): void => {
    setIsLoading(false);
    setIsTimeout(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // I'm throwing in a quick cleanup effect. If this provider component somehow unmounts,
  // I want to be a good citizen and clear any hanging timers to prevent memory leaks.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    // I'm passing my two control functions down through the provider.
    <LoadingContext.Provider value={{ startLoading, stopLoading }}>
      {/* If my state says we are loading, I render the actual LoadingScreen component 
          right here on top of everything, passing it the timeout status and the close function. */}
      {isLoading && (
        <LoadingScreen isTimeout={isTimeout} onClose={stopLoading} />
      )}
      {/* Finally, I render the rest of the app inside the provider! */}
      {children}
    </LoadingContext.Provider>
  );
};

// I'm exporting this handy little custom hook so I don't have to import useContext
// AND LoadingContext into every single file where I want to trigger a loader.
export const useLoading = (): LoadingContextType => useContext(LoadingContext);
