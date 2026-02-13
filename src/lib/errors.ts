export const normalizeYtDlpError = (
    error: unknown,
    fallback: string,
): string => {
    if (!(error instanceof Error) || !error.message) return fallback;

    const message = error.message;

    if (message.includes('Unsupported URL')) {
        return 'This URL is not supported by the current yt-dlp extractor.';
    }

    return message;
};
