import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
