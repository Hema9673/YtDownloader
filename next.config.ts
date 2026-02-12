import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native/binary wrappers external so runtime paths resolve correctly.
  serverExternalPackages: ["yt-dlp-exec", "ffmpeg-static", "fluent-ffmpeg"],
};

export default nextConfig;
