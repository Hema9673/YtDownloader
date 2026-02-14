import { NextRequest, NextResponse } from 'next/server';
import { runYtDlp, isHianime } from '@/lib/youtube';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpegPath from 'ffmpeg-static';
import { SubtitleMode } from '@/types';
import { normalizeYtDlpError } from '@/lib/errors';

type DownloadType = 'mp4' | 'mp3';
type DownloadArtifact = 'video' | 'subtitle';

const readType = (value: string | null): DownloadType | null => {
    if (value === 'mp4' || value === 'mp3') return value;
    return null;
};

const readSubtitleMode = (value: string | null): SubtitleMode => {
    if (value === 'embedded' || value === 'external') return value;
    return 'none';
};

const streamFile = (filePath: string, onDone: () => void): ReadableStream => {
    const fileStream = fs.createReadStream(filePath);

    return new ReadableStream({
        start(controller) {
            fileStream.on('data', (chunk) => controller.enqueue(chunk));
            fileStream.on('end', () => {
                controller.close();
                onDone();
            });
            fileStream.on('error', (err) => {
                controller.error(err);
                onDone();
            });
        },
        cancel() {
            fileStream.destroy();
            onDone();
        },
    });
};

const cleanupByPrefix = (dir: string, prefix: string) => {
    try {
        for (const file of fs.readdirSync(dir)) {
            if (!file.startsWith(prefix)) continue;
            fs.unlink(path.join(dir, file), () => {});
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
};

const findOutputFile = (
    tempDir: string,
    filePrefix: string,
    artifact: DownloadArtifact,
): string | null => {
    const files = fs
        .readdirSync(tempDir)
        .filter((file) => file.startsWith(filePrefix))
        .sort();

    if (artifact === 'subtitle') {
        const subtitleFile = files.find((file) =>
            /\.(srt|vtt|ass|ssa|ttml)$/i.test(file),
        );
        return subtitleFile ? path.join(tempDir, subtitleFile) : null;
    }

    const mp4File = files.find((file) => /\.mp4$/i.test(file));
    if (mp4File) return path.join(tempDir, mp4File);

    const audioFile = files.find((file) => /\.mp3$/i.test(file));
    if (audioFile) return path.join(tempDir, audioFile);

    const videoFile = files.find((file) => /\.(mkv|webm|mov)$/i.test(file));
    return videoFile ? path.join(tempDir, videoFile) : null;
};

const contentTypeForExtension = (extension: string): string => {
    switch (extension.toLowerCase()) {
        case 'mp3':
            return 'audio/mpeg';
        case 'mp4':
            return 'video/mp4';
        case 'mkv':
            return 'video/x-matroska';
        case 'webm':
            return 'video/webm';
        case 'srt':
            return 'application/x-subrip';
        case 'vtt':
            return 'text/vtt';
        case 'ass':
        case 'ssa':
            return 'text/plain';
        default:
            return 'application/octet-stream';
    }
};

const getErrorMessage = (error: unknown): string => {
    return normalizeYtDlpError(error, 'Download failed');
};

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');
    const type = readType(req.nextUrl.searchParams.get('type'));
    const formatId = req.nextUrl.searchParams.get('itag');
    const subtitleMode = readSubtitleMode(req.nextUrl.searchParams.get('subtitleMode'));
    const subtitleLang = req.nextUrl.searchParams.get('subtitleLang') || 'en';
    const artifact =
        req.nextUrl.searchParams.get('artifact') === 'subtitle'
            ? 'subtitle'
            : 'video';

    if (!url || !type) {
        return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }

    if (type === 'mp3' && artifact === 'subtitle') {
        return NextResponse.json({ error: 'Subtitle artifact requires mp4 mode' }, { status: 400 });
    }

    const tempDir = os.tmpdir();
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const filePrefix = `ytdl-${uniqueId}`;
    const outputTemplate = path.join(tempDir, `${filePrefix}.%(ext)s`);

    try {
        const flags: Record<string, string | boolean | number> = {
            noWarnings: true,
            noCheckCertificate: true,
            output: outputTemplate,
            restrictFilenames: true,
        };

        if (ffmpegPath) {
            flags.ffmpegLocation = ffmpegPath;
        }

        if (type === 'mp3') {
            flags.extractAudio = true;
            flags.audioFormat = 'mp3';
            flags.audioQuality = '0';
            if (formatId) {
                flags.format = formatId;
            }
        } else if (artifact === 'subtitle') {
            flags.skipDownload = true;
            flags.writeSub = true;
            flags.writeAutoSub = true;
            flags.subLang = subtitleLang;
            flags.subFormat = 'srt/best';
            flags.convertSubs = 'srt';
        } else {
            flags.mergeOutputFormat = 'mp4';
            
            if (isHianime(url) && formatId) {
                flags.format = formatId;
            } else {
                flags.format = formatId ? `${formatId}+bestaudio/best` : 'bestvideo+bestaudio/best';
            }

            if (subtitleMode === 'embedded') {
                flags.writeSub = true;
                flags.writeAutoSub = true;
                flags.embedSubs = true;
                flags.subLang = subtitleLang;
                flags.subFormat = 'srt/best';
                flags.convertSubs = 'srt';
            }
        }

        await runYtDlp(url, flags);

        const outputPath = findOutputFile(tempDir, filePrefix, artifact);
        if (!outputPath || !fs.existsSync(outputPath)) {
            throw new Error(
                artifact === 'subtitle'
                    ? 'Subtitle file was not generated for the selected language.'
                    : 'Downloaded file not found after completion.',
            );
        }

        const stat = fs.statSync(outputPath);
        const extension = path.extname(outputPath).replace('.', '').toLowerCase();
        const stream = streamFile(outputPath, () => cleanupByPrefix(tempDir, filePrefix));
        const filenamePrefix = artifact === 'subtitle' ? 'subtitle' : type === 'mp3' ? 'audio' : 'video';

        return new NextResponse(stream, {
            headers: {
                'Content-Disposition': `attachment; filename="${filenamePrefix}_${uniqueId}.${extension}"`,
                'Content-Type': contentTypeForExtension(extension),
                'Content-Length': stat.size.toString(),
            },
        });
    } catch (error: unknown) {
        cleanupByPrefix(tempDir, filePrefix);
        console.error('Download error:', error);
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
