import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "did ansem drop?",
    short_name: "ansem drop?",
    theme_color: "#b11226",
    background_color: "#050506",
    display: "standalone",
    icons: [{ src: "/icon.png", sizes: "any", type: "image/png" }],
  };
}
