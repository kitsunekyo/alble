import type { Metadata, Viewport } from "next";
import { Providers } from "@/client/providers";
import "@/index.css";

export const metadata: Metadata = {
  title: "Alble - Allein-Bleib-Training",
  description: "Trainingstagebuch fuer Allein-Bleib-Training",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
