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

const themeScript = `
  (function(){try{
    var t=localStorage.getItem("theme");
    if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches))
      document.documentElement.classList.add("dark");
  }catch(e){}})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
