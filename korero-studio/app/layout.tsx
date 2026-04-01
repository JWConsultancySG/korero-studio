import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProviders } from "@/components/providers";
import "./globals.css";

/** Runs before paint — keeps `html` class in sync with localStorage (no `<script>` from React / next-themes). */
const THEME_INIT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem("theme");var r;if(t==="dark"||t==="light")r=t;else if(t==="system"||!t)r=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";else r="light";d.classList.remove("light","dark");d.classList.add(r);d.style.colorScheme=r;}catch(e){}})();`;

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Korero Studio",
  description: "K-pop dance & singing studio — book classes, join song classes, and slay.",
  icons: {
    icon: "/white_icon_color1_background.png",
    apple: "/white_icon_color1_background.png",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="relative" suppressHydrationWarning>
      <head>
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className={`${geistSans.variable} ${geistSans.className} relative antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppProviders>{children}</AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
