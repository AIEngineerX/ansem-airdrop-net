import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "did ansem airdrop me?",
    short_name: "ansem drop?",
    description:
      "Unofficial, read-only on-chain map of every wallet Ansem's $ANSEM airdropped to.",
    id: "/",
    start_url: "/",
    theme_color: "#b11226",
    background_color: "#050506",
    display: "standalone",
    icons: [
      { src: "/icon.png", sizes: "160x160", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "160x160", type: "image/png" },
    ],
  };
}
