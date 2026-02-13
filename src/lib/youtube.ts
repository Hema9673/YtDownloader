import ytDlp from 'yt-dlp-exec';
import path from 'path';
import execa from 'execa';

const isHianime = (url: string) => 
    url.includes('hianime.to') || 
    url.includes('hianimez.to') || 
    url.includes('hianime.is') || 
    url.includes('hianime.nz');

export const runYtDlp = async (url: string, flags: any, opts?: any) => {
    if (isHianime(url)) {
        const pluginDirs = path.join(process.cwd(), 'yt_dlp_plugins');
        const finalFlags = { ...flags, pluginDirs };
        const args = [
            '-m', 'yt_dlp',
            ...ytDlp.args(url, finalFlags)
        ];
        return execa('python', args, opts);
    }
    return ytDlp.exec(url, flags, opts);
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
