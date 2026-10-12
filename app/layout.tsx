import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexu AI — CV Screening",
  description: "AI that screens and ranks CVs against a job, with a written reason for every score.",
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
