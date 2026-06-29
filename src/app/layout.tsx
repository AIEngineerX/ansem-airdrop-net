import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Anton } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Anton({ weight: "400", variable: "--font-display", subsets: ["latin"] });

const TITLE = "did ansem airdrop me? — live map of Ansem's $ANSEM airdrop";
const DESCRIPTION =
  "Paste your wallet to see if you caught Ansem's $ANSEM airdrop. A live, read-only on-chain map of every wallet The Black Bull dropped to — plus his creator rewards.";
// Set NEXT_PUBLIC_SITE_URL to the deployed origin so share-card image URLs resolve absolutely.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://didansemdrop.me";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "did ansem airdrop me?",
  alternates: { canonical: "/" },
  keywords: [
    "did ansem airdrop me",
    "ansem airdrop",
    "ansem airdrop checker",
    "$ANSEM",
    "ANSEM token",
    "Ansem",
    "blknoiz06",
    "The Black Bull",
    "Solana airdrop",
    "creator rewards",
    "on-chain airdrop tracker",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "did ansem airdrop me?",
    // Share image is provided by the app/opengraph-image.tsx file convention
    // (a generated 1200×630 branded card), so no manual images array here.
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    // twitter image likewise comes from app/twitter-image.tsx (re-exports the OG card).
  },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// JSON-LD structured data — honest, unofficial, read-only. Helps search engines
// understand the site name, URL and purpose for a richer result entry.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "did ansem airdrop me?",
  url: SITE_URL,
  description: DESCRIPTION,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="grain min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
