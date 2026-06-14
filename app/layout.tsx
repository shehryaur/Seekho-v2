import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "katex/dist/katex.min.css";
import "./globals.css";
import { CursorSpotlight } from "@/components/effects/CursorSpotlight";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Seekho Engine",
  description:
    "Hyper-local AI lesson planning and curriculum support for Pakistani teachers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans antialiased">
        <CursorSpotlight />
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "border border-emerald-700/30 bg-cream/95 backdrop-blur-lg shadow-xl",
            },
          }}
        />
      </body>
    </html>
  );
}
