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

const PHOTOS_DIR = process.env.PHOTOS_DIR || '/opt/intelink/photos/photos';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    // Auth: verifica JWT header ou sessão Supabase
    const auth = request.headers.get('authorization');
    let authenticated = false;

    if (auth?.startsWith('Bearer ')) {
        const result = await verifyAccessToken(auth.slice(7));
        if (result.success) authenticated = true;
    }

    if (!authenticated) {
        // Tenta sessão Supabase via cookie
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { cookie: request.headers.get('cookie') || '' } } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        authenticated = !!user;
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
