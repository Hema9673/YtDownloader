import ytDlp from 'yt-dlp-exec';
import path from 'path';
import execa from 'execa';

const ytArgs = (ytDlp as any).args;
const ytExec = (ytDlp as any).exec;

export const isHianime = (url: string) => 
    /hianime(?:z)?\.(?:to|is|nz|bz|pe|cx|gs|do)/.test(url);

export const runYtDlp = async (url: string, flags: any, opts?: any) => {
    if (isHianime(url)) {
        const pluginDirs = path.join(process.cwd(), 'yt_dlp_plugins');
        const finalFlags = { ...flags, pluginDirs };
        const args = [
            '-m', 'yt_dlp',
            ...ytArgs(url, finalFlags)
        ];
        return execa('python', args, opts);
    }
    return ytExec(url, flags, opts);
};

export const getRawInfo = async (url: string): Promise<unknown> => {
    try {
        const flags = {
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
            noCheckCertificate: true,
        };

        const { stdout } = await runYtDlp(url, flags);
        return JSON.parse(stdout);
    } catch (error) {
        console.error('yt-dlp error:', error);
        throw error;
    }
};
