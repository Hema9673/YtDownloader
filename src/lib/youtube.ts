import ytDlp from 'yt-dlp-exec';
import { VideoInfo } from '@/types';

export const getRawInfo = async (url: string): Promise<any> => {
    try {
        const output = await ytDlp(url, {
            dumpSingleJson: true, // Use dumpSingleJson to get JSON object directly
            noWarnings: true,
            noCallHome: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true,
        } as any);
        return output;
    } catch (error) {
        console.error('yt-dlp error:', error);
        throw error;
    }
};

export const getStream = async (url: string, options: any) => {
    throw new Error('Use processDownload directly');
};
