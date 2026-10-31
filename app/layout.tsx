import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SerwistProvider } from "@serwist/turbopack/react";
import { Providers } from "@/client/providers";
import { ServiceWorkerCleanup } from "@/client/components/ServiceWorkerCleanup";
import "@/index.css";

// The service worker only belongs to the deployed PWA. In `next dev` it caches
// dev chunks and RSC payloads that are invalidated on every edit, so client-side
// navigations hang. Serwist recommends disabling it in development.
const serviceWorkerDisabled = process.env.NODE_ENV === "development";

// Self-hosted variable font instead of `next/font/google`: fetching Inter from
// Google at startup stalls the first dev request (and Turbopack fails with
// "Can't resolve '@vercel/turbopack-next/internal/font/google/font'" whenever
// that fetch did not go through cleanly).
const inter = localFont({
  src: "../assets/fonts/inter-latin-var.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-inter",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Alble - Allein-Bleib-Training",
  description: "Trainingstagebuch fuer Allein-Bleib-Training",
  applicationName: "Alble",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Alble",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#fbf0ef",
};

const themeScript = `
  (function(){try{
    var t=localStorage.getItem("theme");
    if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches))
      document.documentElement.classList.add("dark");
  }catch(e){}})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="de"
      className={inter.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SerwistProvider swUrl="/serwist/sw.js" disable={serviceWorkerDisabled}>
          {serviceWorkerDisabled && <ServiceWorkerCleanup />}
          <Providers>{children}</Providers>
        </SerwistProvider>
      </body>
    </html>
  );
}
