import { NextRequest, NextResponse } from 'next/server';
import { getRawInfo } from '@/lib/youtube';
import { mapInfoToVideoInfo, resolveProvider } from '@/lib/providers';
import { normalizeYtDlpError } from '@/lib/errors';

const getErrorMessage = (error: unknown): string => {
    return normalizeYtDlpError(error, 'Failed to fetch video info.');
};

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
    }

    try {
        const provider = resolveProvider(url);
        const rawInfo = await getRawInfo(url) as Parameters<typeof mapInfoToVideoInfo>[0];
        const responseInfo = mapInfoToVideoInfo(rawInfo, provider.id);

        return NextResponse.json(responseInfo);
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: getErrorMessage(error) },
            { status: 500 }
        );
    }
}
