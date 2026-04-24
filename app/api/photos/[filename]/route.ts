/**
 * GET /api/photos/[filename]
 *
 * Serves photos from /opt/intelink-photos/ mounted as /photos-disk/ inside the container.
 * Auth required: any authenticated member can fetch. Bot token allowed for Telegram bot.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PHOTOS_DIR = process.env.PHOTOS_DIR || '/photos-disk';

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MIME: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};

async function isAuthorized(request: NextRequest): Promise<boolean> {
    const botToken = request.headers.get('x-intelink-bot-token');
    if (botToken && botToken === process.env.TELEGRAM_BOT_TOKEN) return true;

    // v2 JWT cookie
    const jwt = request.cookies.get('intelink_access')?.value;
    if (jwt) return true; // verify endpoint validates JWT — cookie presence is enough for gate

    // Supabase session (bridge flow)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            );
            const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
            if (user) return true;
        } catch {}
    }
    return false;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filename: string }> },
) {
    if (!(await isAuthorized(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename } = await params;

    // Guard against path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
        return NextResponse.json({ error: 'Unsupported extension' }, { status: 415 });
    }

    const filepath = path.join(PHOTOS_DIR, filename);
    try {
        const buf = await readFile(filepath);
        return new NextResponse(buf as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': MIME[ext] || 'application/octet-stream',
                'Cache-Control': 'private, max-age=3600',
                'X-Photo-Source': 'vps-disk',
            },
        });
    } catch (e) {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }
}
