"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  JSX,
} from "react";
import { CheckCircle2, XCircle } from "lucide-react";

// I'm extracting this literal type so I can reuse it cleanly
// across my interfaces without typing out the strings every time.
type ToastVariant = "success" | "error";

// I'm defining the exact shape of my toast state object. I like to make these
// properties readonly so I don't accidentally mutate my state directly later on.
interface Toast {
  readonly type: ToastVariant;
  readonly message: string;
}

// Here is the contract for what my context will provide to the rest of the app.
interface ToastContextType {
  readonly showToast: (type: ToastVariant, message: string) => void;
}

// I'm setting up a quick interface for the provider's props. Making the children
// readonly is a great habit for React components.
interface ToastProviderProps {
  readonly children: ReactNode;
}

// I'm creating the context here and starting it off as undefined.
// This helps me enforce that it's only used inside the provider.
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// This is the main provider component. I'm going to wrap my layout with this
// so any component inside my app can pop up a toast notification.
export function ToastProvider({ children }: ToastProviderProps): JSX.Element {
  // I'm using state to hold the current toast. If it's null, nothing shows on screen.
  const [toast, setToast] = useState<Toast | null>(null);

  // Whenever I want to show a message, I call this function. It drops the toast
  // data into state, and then sets a quick 3-second timer to automatically clear it.
  const showToast = (type: ToastVariant, message: string): void => {
    setToast({ type, message });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  return (
    // I'm wrapping my app with the context provider and passing down my showToast function.
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* If I have an active toast sitting in state, I render this floating UI right 
          at the bottom of the screen with a nice slide-in animation. */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-200 animate-in slide-in-from-bottom-5 fade-in duration-300">
          {/* I'm dynamically swapping the background and border colors based on 
              whether the toast is a success or an error. */}
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
              toast.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {/* I'm also swapping the icon out here to match the type of toast. */}
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <p className="text-sm font-semibold">{toast.message}</p>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

// I'm creating this custom hook so I can easily grab the showToast function
// anywhere in my app without having to import useContext every single time.
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);

  // I'm throwing a helpful error here just in case I ever try to use this hook
  // in a component that isn't safely wrapped by the ToastProvider.
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
