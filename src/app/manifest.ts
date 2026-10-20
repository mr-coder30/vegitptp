import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VegItPTP",
    short_name: "VegItPTP",
    description: "Fresh vegetables delivered in Pithapuram",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF9EF",
    theme_color: "#285A43",
    icons: [
      {
        src: "/vegitptp-icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/vegitptp-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
