import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Anton } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Anton({ weight: "400", variable: "--font-display", subsets: ["latin"] });

const TITLE = "ANSEM Airdrop Web — live map of wallets airdropped by Ansem";
const DESCRIPTION =
  "Unofficial, read-only on-chain map of the wallets airdropped $ANSEM by Ansem's pump.fun creator wallet, plus his creator rewards. Paste your wallet to see if you got the drop.";
// Set NEXT_PUBLIC_SITE_URL to the deployed origin so share-card image URLs resolve absolutely.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "ANSEM Airdrop Web",
    images: [{ url: "/og.png", width: 1440, height: 900, alt: "The live ANSEM airdrop web" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
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
