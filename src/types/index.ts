export interface VideoFormat {
    itag: number;
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

export interface VideoInfo {
    title: string;
    thumbnail: string;
    duration: string | number;
    formats: VideoFormat[];
    url: string;
}
