import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LoadingProvider } from "@/src/context/LoadingContext";
import { ToastProvider } from "@/src/context/ToastContext";

// I'm setting up Geist Sans as my primary font.
// Using a CSS variable makes it easy to hook into my Tailwind config later.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// I'm doing the same here for the Mono font for any code or data-heavy sections.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// I’m explicitly defining the viewport settings here to fix mobile scaling.
// I'm disabling userScalable to make sure the UI feels more like a native app
// and doesn't zoom in unexpectedly when someone taps an input.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// This is where I define the SEO basics for the app.
// I want search engines and browser tabs to show the specific name of the portal.
export const metadata: Metadata = {
  title: "MidSwift",
  description: "Labo - RHU Reporting Portal",
};

// I'm defining an interface for my layout props instead of inlining them.
// It keeps the code cleaner and makes it easier to extend if I add more props later.
interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* I’m wrapping the entire app in these providers. 
            I put ToastProvider on the outside so that notifications 
            can show up regardless of what's happening inside the LoadingProvider.
        */}
        <ToastProvider>
          <LoadingProvider>{children}</LoadingProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
