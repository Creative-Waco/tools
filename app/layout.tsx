import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";

import { AppShellGate } from "@/components/AppShellGate";
import { TooltipProvider } from "@/components/ui/tooltip";
import { clerkAppearance } from "@/lib/clerk-appearance";

import "./globals.css";

export const metadata: Metadata = {
  title: "Creative Waco Tools",
  description: "Internal tools for newsletter, events, and membership workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider
          appearance={clerkAppearance}
          signInUrl="/sign-in/"
          signUpUrl="/sign-up/"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
        >
          <TooltipProvider>
            <AppShellGate>{children}</AppShellGate>
          </TooltipProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
