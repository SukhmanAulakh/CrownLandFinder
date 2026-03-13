import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ontario Crown Land Open Terrain Finder",
  description: "Web GIS platform for preliminary terrain and land-status candidate screening.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full">{children}</body>
    </html>
  );
}
