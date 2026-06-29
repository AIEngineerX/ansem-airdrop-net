import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Anton } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Anton({ weight: "400", variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ANSEM Airdrop Web — live map of wallets Ansem airdropped",
  description:
    "Unofficial, read-only on-chain map of the wallets airdropped $ANSEM by Ansem's pump.fun creator wallet, plus his creator rewards. Not affiliated with Ansem.",
};

export const viewport: Viewport = {
  themeColor: "#050506",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="grain min-h-full flex flex-col">{children}</body>
    </html>
  );
}
