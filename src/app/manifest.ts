import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ANSEM Airdrop Web",
    short_name: "ANSEM Web",
    theme_color: "#b11226",
    background_color: "#050506",
    display: "standalone",
    icons: [{ src: "/icon.png", sizes: "any", type: "image/png" }],
  };
}
