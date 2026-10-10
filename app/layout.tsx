import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My AI Agency Office",
  description: "Kantor agency generalist virtual berbasis AI — 3D Live Office Isometric Diorama",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
