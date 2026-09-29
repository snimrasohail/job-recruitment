import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hireflow — Nowshera Digital",
  description: "A focused applicant tracking workspace for modern hiring teams.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
