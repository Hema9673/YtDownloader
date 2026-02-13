export interface VideoFormat {
    itag: string;
    url: string;
    mimeType?: string;
    qualityLabel?: string;
    bitrate?: number;
    audioBitrate?: number;
    width?: number;
    height?: number;
    container?: string;
    hasVideo: boolean;
    hasAudio: boolean;
    contentLength?: string;
}

export interface SubtitleTrack {
    lang: string;
    label: string;
    source: 'manual' | 'auto';
    ext?: string;
}

export type SubtitleMode = 'none' | 'embedded' | 'external';

export interface VideoInfo {
    title: string;
    thumbnail: string;
    duration: string | number;
    formats: VideoFormat[];
    url: string;
    provider: string;
    subtitles: SubtitleTrack[];
}
