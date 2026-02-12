import { NextRequest, NextResponse } from 'next/server';
import ytDlp from 'yt-dlp-exec';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpegPath from 'ffmpeg-static';

// Helper to stream file deletion
function streamFile(filePath: string): ReadableStream {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error('File download failed (file not found)');
    }

    const fileStream = fs.createReadStream(filePath);

    return new ReadableStream({
        start(controller) {
            fileStream.on('data', (chunk) => controller.enqueue(chunk));
            fileStream.on('end', () => {
                controller.close();
                // File is sent, delete it
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting temp file:', err);
                });
            });
            fileStream.on('error', (err) => {
                controller.error(err);
                fs.unlink(filePath, () => { }); // Try cleanup
            });
        },
        cancel() {
            fileStream.destroy();
            fs.unlink(filePath, () => { });
        }
    });
}

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');
    const type = req.nextUrl.searchParams.get('type') as 'mp4' | 'mp3';
    const formatId = req.nextUrl.searchParams.get('itag'); // Format ID from info

    if (!url || !type) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const tempDir = os.tmpdir();
    // Unique ID for this download
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    try {
        // We use a fixed filename pattern to ensure we can find it reliably
        // yt-dlp will replace %(ext)s with actual extension (mp4/mp3/mkv)
        const outputTemplate = path.join(tempDir, `ytdl-${uniqueId}.%(ext)s`);

        const flags: any = {
            noWarnings: true,
            noCallHome: true,
            noCheckCertificate: true,
            output: outputTemplate,
            restrictFilenames: true,
            ffmpegLocation: ffmpegPath // Critical for merging!
        };

        if (type === 'mp3') {
            flags.extractAudio = true;
            flags.audioFormat = 'mp3';
            flags.audioQuality = '0'; // Best
        } else {
            // Video MP4
            // Force mp4 container. yt-dlp will merge video+audio and convert if needed.
            flags.mergeOutputFormat = 'mp4';

            if (formatId) {
                // If specific format ID provided (e.g. 137 for 1080p)
                // merge with best audio
                flags.format = `${formatId}+bestaudio/best`;
            } else {
                // Default best
                flags.format = 'bestvideo+bestaudio/best';
            }
        }

        console.log(`Starting download for ${url} (Flags: ${JSON.stringify(flags)})`);

        // Execute download
        await ytDlp(url, flags);

        // Find the file
        // If output template was `ytdl-ID.%(ext)s`.
        // We expect .mp3 or .mp4.
        let extension = type === 'mp3' ? 'mp3' : 'mp4';
        let finalPath = path.join(tempDir, `ytdl-${uniqueId}.${extension}`);

        if (!fs.existsSync(finalPath)) {
            // Fallback: check directory for matching ID if extension differed (e.g. mkv)
            // Note: mergeOutputFormat should force mp4, but if it failed, maybe mkv left?
            const files = fs.readdirSync(tempDir);
            const match = files.find(f => f.startsWith(`ytdl-${uniqueId}.`));
            if (match) {
                finalPath = path.join(tempDir, match);
                extension = match.split('.').pop() || extension;
            } else {
                console.error('File not found in temp dir:', tempDir, 'Pattern:', `ytdl-${uniqueId}`);
                throw new Error('Downloaded file not found on execution completion.');
            }
        }

        const stat = fs.statSync(finalPath);
        const stream = streamFile(finalPath);

        return new NextResponse(stream, {
            headers: {
                // We give a generic name + timestamp usually, or could fetch title again.
                // But better to just call it "video.mp4" or "audio.mp3" to avoid header unicode issues,
                // or use the title passed in params if we had it? 
                // We can just use "download" for now.
                'Content-Disposition': `attachment; filename="download_${uniqueId}.${extension}"`,
                'Content-Type': type === 'mp3' ? 'audio/mpeg' : 'video/mp4',
                'Content-Length': stat.size.toString(),
            }
        });

    } catch (error: any) {
        console.error('Download error:', error);
        // Cleanup if possible? (Hard to know partial files)
        return NextResponse.json({ error: error.message || 'Download failed' }, { status: 500 });
    }
}
