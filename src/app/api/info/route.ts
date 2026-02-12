import { NextRequest, NextResponse } from 'next/server';
import { getRawInfo } from '@/lib/youtube';
import ytDlp from 'yt-dlp-exec';
import { VideoInfo } from '@/types';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing logic' }, { status: 400 });
    }

    try {
        const info = await getRawInfo(url) as any;

        // Transform yt-dlp format objects
        const formats: any[] = info.formats || [];

        // We want unique resolutions for UI
        // yt-dlp formats have `aspect_ratio`, `resolution`, `filesize`, `format_id`
        // We should filter for mp4/webm with video codec

        const mappedFormats = formats.map(f => ({
            itag: f.format_id, // Important: using format_id here instead of itag number
            url: f.url,
            mimeType: f.ext,
            qualityLabel: f.format_note || f.resolution,
            bitrate: f.tbr,
            width: f.width,
            height: f.height,
            container: f.ext,
            hasVideo: f.vcodec !== 'none',
            hasAudio: f.acodec !== 'none',
            contentLength: f.filesize
        }));

        // For YouTube, high quality formats (1080p+) are video-only usually.
        // yt-dlp lists "format_id" like "137" (1080p video only) or "22" (720p mixed).
        // The UI needs to know if audio is present?
        // Actually, our download route will just take "quality height" and merge automatically.
        // So for UI, we just need to list available heights.

        const responseInfo: VideoInfo = {
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            formats: mappedFormats,
            url: info.webpage_url,
        };

        return NextResponse.json(responseInfo);
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch video info.' },
            { status: 500 }
        );
    }
}
