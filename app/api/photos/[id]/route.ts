/**
 * GET /api/photos/[id] — serve foto policial com auth check
 * PHOTO-006: só usuários autenticados (JWT ou sessão Supabase) acessam.
 * [id] = filename sem extensão ou com extensão (ex: photo_1234_567.jpg)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { verifyAccessToken } from '@/lib/auth/jwt';

const PHOTOS_DIR = process.env.PHOTOS_DIR || '/photos-disk';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    let authenticated = false;

    // Priority 1: Bot token (Telegram bot / CLI)
    const botToken = request.headers.get('x-intelink-bot-token');
    if (botToken && botToken === process.env.TELEGRAM_BOT_TOKEN) authenticated = true;

    // Priority 2: v2 JWT cookie (primary web flow)
    if (!authenticated) {
        const cookieJwt = request.cookies.get('intelink_access')?.value;
        if (cookieJwt) {
            const result = await verifyAccessToken(cookieJwt);
            if (result.success) authenticated = true;
        }
    }

    // Priority 3: Bearer header (API clients)
    if (!authenticated) {
        const auth = request.headers.get('authorization');
        if (auth?.startsWith('Bearer ')) {
            const result = await verifyAccessToken(auth.slice(7));
            if (result.success) authenticated = true;
        }
    }

    if (!authenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sanitiza filename — só permite caracteres seguros
    const { id } = await params;
    const rawId = id.replace(/[^a-zA-Z0-9_.-]/g, '');
    const filename = rawId.endsWith('.jpg') || rawId.endsWith('.jpeg') || rawId.endsWith('.png')
        ? rawId
        : `${rawId}.jpg`;

    try {
        const filepath = join(PHOTOS_DIR, filename);
        const buf = await readFile(filepath);
        const ext = filename.split('.').pop()?.toLowerCase();
        const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

        return new NextResponse(buf, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'private, max-age=3600',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }
}
