/**
 * GET  /api/coord — public read of coord events
 * POST /api/coord — external agent posts new coord event (requires ephemeral_token)
 *
 * Pairs with egos/docs/COORDINATION_PATTERN.md (CRC-PATTERN-v1).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ─── GET — public feed ─────────────────────────────────────────────────────
export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
        .from('coord_events')
        .select('coord_id, description, target_repo, target_task, status, owner_window, kernel_sha, leaf_sha, leaf_repo_url, error_log, source_token, created_at, closed_at')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 503 });
    }

    // Mask source_token in public response — show only that it was external, not the actual token
    const masked = (data ?? []).map(e => ({
        ...e,
        source_token: undefined,
        external: !!e.source_token,
    }));

    return NextResponse.json({
        protocol: 'CRC-PATTERN-v1',
        canonical_doc: 'https://github.com/enioxt/egos/blob/main/docs/COORDINATION_PATTERN.md',
        kernel_repo: 'https://github.com/enioxt/egos',
        bootstrap: 'https://intelink.ia.br/api/coord/bootstrap',
        active_count: masked.filter(e => e.status === 'pending').length,
        closed_count: masked.filter(e => e.status === 'done').length,
        external_count: masked.filter(e => e.external).length,
        events: masked,
    }, {
        headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

// ─── POST — external agent inserts coord event ─────────────────────────────
interface PostBody {
    coord_id?: string;
    description?: string;
    target_repo?: string;
    target_task?: string;
    owner_window?: string;
    kernel_sha?: string;
    leaf_sha?: string;
    leaf_repo_url?: string;
    status?: 'pending' | 'done';
}

export async function POST(req: NextRequest) {
    // Validate Bearer token
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ')) {
        return NextResponse.json(
            { error: 'Missing Authorization: Bearer <ephemeral_token>. Get one from POST /api/coord/register.' },
            { status: 401 }
        );
    }
    const token = auth.slice(7).trim();
    if (!token.startsWith('egos_') || token.length < 40) {
        return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify token is active
    const { data: reg, error: regErr } = await supabase
        .from('agent_registrations')
        .select('id, name, expires_at, revoked_at, request_count')
        .eq('ephemeral_token', token)
        .single();

    if (regErr || !reg) {
        return NextResponse.json({ error: 'Token not recognized' }, { status: 403 });
    }
    if (reg.revoked_at) {
        return NextResponse.json({ error: 'Token revoked' }, { status: 403 });
    }
    if (new Date(reg.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Token expired. Register again at /api/coord/register' }, { status: 403 });
    }

    let body: PostBody;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 }); }

    // Validate required fields
    const required = ['coord_id', 'description', 'target_repo', 'owner_window'] as const;
    for (const f of required) {
        if (!body[f] || typeof body[f] !== 'string' || (body[f] as string).length < 2) {
            return NextResponse.json({ error: `Field '${f}' required and must be non-empty string` }, { status: 400 });
        }
    }
    if (!/^COORD-\d{4}-\d{2}-\d{2}-[A-Z0-9-]{1,20}$/.test(body.coord_id!)) {
        return NextResponse.json({ error: 'coord_id must match COORD-YYYY-MM-DD-X format' }, { status: 400 });
    }

    // Force owner_window to be tagged with token name to prevent identity spoofing
    const ownerWindow = `external:${reg.name}`;

    const { data, error } = await supabase
        .from('coord_events')
        .insert({
            coord_id: body.coord_id!,
            description: (body.description ?? '').slice(0, 500),
            target_repo: body.target_repo!,
            target_task: body.target_task ?? null,
            owner_window: ownerWindow,
            kernel_sha: body.kernel_sha ?? null,
            leaf_sha: body.leaf_sha ?? null,
            leaf_repo_url: body.leaf_repo_url ?? null,
            status: body.status === 'done' ? 'done' : 'pending',
            source_token: token,
            closed_at: body.status === 'done' ? new Date().toISOString() : null,
        })
        .select('coord_id, status, created_at')
        .single();

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json({ error: `coord_id '${body.coord_id}' already exists. Use a unique ID.` }, { status: 409 });
        }
        console.error('[coord-post]', error);
        return NextResponse.json({ error: 'Insert failed' }, { status: 503 });
    }

    // Update last_used_at + counter
    await supabase
        .from('agent_registrations')
        .update({ last_used_at: new Date().toISOString(), request_count: reg.request_count + 1 })
        .eq('ephemeral_token', token);

    return NextResponse.json({
        ok: true,
        coord_id: data.coord_id,
        status: data.status,
        created_at: data.created_at,
        public_url: 'https://intelink.ia.br/api/coord',
    }, { status: 201 });
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
