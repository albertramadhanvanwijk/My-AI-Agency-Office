import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "My AI Agency Office",
    template: "%s | My AI Agency Office",
  },
  description: "Kantor agency generalist virtual berbasis AI — 3D Live Office Isometric Diorama Cozy Creative. Kelola project end-to-end dengan tim AI 30+ role.",
  keywords: [
    "AI agency",
    "virtual office",
    "project management",
    "AI automation",
    "3D office",
    "isometric diorama",
    "team collaboration",
  ],
  authors: [{ name: "My AI Agency Office" }],
  creator: "My AI Agency Office",
  publisher: "My AI Agency Office",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "My AI Agency Office",
    title: "My AI Agency Office - Virtual AI Agency",
    description: "Kantor agency generalist virtual berbasis AI dengan 3D Live Office Isometric Diorama. Kelola project end-to-end dengan tim AI 30+ role.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "My AI Agency Office - 3D Isometric Office View",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "My AI Agency Office",
    description: "Kantor agency generalist virtual berbasis AI dengan 3D Live Office Isometric Diorama.",
    images: ["/og-image.png"],
    creator: "@myaiagency",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon-192.png",
    other: [
      { rel: "manifest", url: "/manifest.json" },
    ],
  },
  manifest: "/manifest.json",
  themeColor: "#1a1a2e",
  colorScheme: "light dark",
};

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background antialiased font-sans">
        {children}
      </body>
    </html>
  );
}