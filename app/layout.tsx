import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteSync — Project coordination",
  description: "Track changes, trace dependencies and coordinate project decisions.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
