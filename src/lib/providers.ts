import { VideoInfo, VideoFormat, SubtitleTrack } from '@/types';

interface ProviderMatchResult {
    id: string;
}

interface YtDlpFormat {
    format_id?: string | number;
    url?: string;
    ext?: string;
    format_note?: string;
    resolution?: string;
    tbr?: number;
    width?: number;
    height?: number;
    vcodec?: string;
    acodec?: string;
    filesize?: number | string;
    language?: string;
}

interface YtDlpSubtitleEntry {
    ext?: string;
    name?: string;
}

interface YtDlpInfo {
    title?: string;
    thumbnail?: string;
    duration?: string | number;
    webpage_url?: string;
    formats?: YtDlpFormat[];
    subtitles?: Record<string, YtDlpSubtitleEntry[]>;
    automatic_captions?: Record<string, YtDlpSubtitleEntry[]>;
}

const providers = [
    {
        id: 'hianime',
        match: (url: string): ProviderMatchResult | null => {
            if (/hianime(?:z)?\.(?:to|is|nz|bz|pe|cx|gs|do)/.test(url)) {
                return { id: 'hianime' };
            }
            return null;
        },
    },
    {
        id: 'yt-dlp-generic',
        match: (): ProviderMatchResult => ({ id: 'yt-dlp-generic' }),
    },
];

export const resolveProvider = (url: string): ProviderMatchResult => {
    for (const provider of providers) {
        const match = provider.match(url);
        if (match) return match;
    }
    return { id: 'yt-dlp-generic' };
};

const normalizeFormats = (formats: YtDlpFormat[]): VideoFormat[] => {
    return formats.map((format) => ({
        itag: String(format.format_id ?? ''),
        url: format.url ?? '',
        mimeType: format.ext,
        qualityLabel: format.format_note || format.resolution,
        bitrate: format.tbr,
        width: format.width,
        height: format.height,
        container: format.ext,
        hasVideo: format.vcodec !== 'none',
        hasAudio: format.acodec !== 'none',
        contentLength:
            format.filesize === undefined ? undefined : String(format.filesize),
        language: format.language,
    }));
};

const collectSubtitleTracks = (
    captions: Record<string, YtDlpSubtitleEntry[]> | undefined,
    source: SubtitleTrack['source'],
    map: Map<string, SubtitleTrack>,
) => {
    if (!captions) return;

    for (const [lang, entries] of Object.entries(captions)) {
        if (!entries || entries.length === 0) continue;

        const current = map.get(lang);
        const entry = entries[0];
        const label = entry?.name || lang;
        const ext = entry?.ext;

        if (!current || (current.source === 'auto' && source === 'manual')) {
            map.set(lang, { lang, label, source, ext });
        }
    }
};

export const mapInfoToVideoInfo = (
    rawInfo: YtDlpInfo,
    providerId: string,
): VideoInfo => {
    const subtitleMap = new Map<string, SubtitleTrack>();
    collectSubtitleTracks(rawInfo.automatic_captions, 'auto', subtitleMap);
    collectSubtitleTracks(rawInfo.subtitles, 'manual', subtitleMap);

    const subtitles = Array.from(subtitleMap.values()).sort((a, b) =>
        a.lang.localeCompare(b.lang),
    );

    return {
        title: rawInfo.title ?? 'Untitled',
        thumbnail: rawInfo.thumbnail ?? '',
        duration: rawInfo.duration ?? 0,
        formats: normalizeFormats(rawInfo.formats ?? []),
        url: rawInfo.webpage_url ?? '',
        provider: providerId,
        subtitles,
    };
};
