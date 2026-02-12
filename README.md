# 🎥 YouTube Downloader Professional

A premium, full-stack web application for downloading YouTube videos in high quality (MP4/1080p+) and extracting audio (MP3). built with Next.js, Tailwind CSS, and FFmpeg.

## ✨ Features

- **High Quality 4K/1080p**: Automatically merges high-bitrate video streams with audio using FFmpeg.
- **Audio Extraction**: High-quality MP3 conversion.
- **Premium Design**: Glassmorphism UI with vibrant animated backgrounds and smooth transitions (Framer Motion).
- **No External Dependencies**: Uses `ffmpeg-static` to bundle the required binaries automatically.

## 🚀 Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4, Framer Motion
- **Backend Logic**: `@distube/ytdl-core` (YouTube API), `fluent-ffmpeg` (Processing)
- **Icons**: Lucide React

## 📝 License

This project is for personal educational use only. Respect YouTube's Terms of Service.
