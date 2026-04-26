/**
 * POST /api/coord/register
 *
 * External agent (LLM, dev tool, MCP client) registers itself and receives
 * an ephemeral 24h bearer token to post coord events.
 *
 * Request body:
 *   { name: string, purpose: string, client_kind?: string, public_repo?: string }
 *
 * Response:
 *   200 { id, ephemeral_token, expires_at, coord_post_url, coord_feed_url }
 *
 * Rate limit: 5 registrations per IP per hour (basic abuse defense).
 *
 * Companion: /api/coord/bootstrap (GET) for protocol manifest.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';

interface RegisterBody {
    name?: string;
    purpose?: string;
    client_kind?: string;
    public_repo?: string;
}

const ALLOWED_KINDS = ['claude', 'gpt', 'gemini', 'cursor', 'aider', 'mcp', 'continue', 'cline', 'devin', 'other'];

// Simple in-memory rate limiter (resets on container restart, OK for first version)
const rateMap = new Map<string, { count: number; reset: number }>();
function rateLimited(ip: string, max = 5, windowMs = 3600_000): boolean {
    const now = Date.now();
    const entry = rateMap.get(ip);
    if (!entry || entry.reset < now) {
        rateMap.set(ip, { count: 1, reset: now + windowMs });
        return false;
    }
    if (entry.count >= max) return true;
    entry.count += 1;
    return false;
}

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        ?? req.headers.get('x-real-ip')
        ?? 'unknown';
    const userAgent = req.headers.get('user-agent') ?? '';

    if (rateLimited(ip)) {
        return NextResponse.json(
            { error: 'Rate limit exceeded. Max 5 registrations per IP per hour.' },
            { status: 429, headers: { 'Retry-After': '3600' } }
        );
    }

    let body: RegisterBody;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
    }

    const name = (body.name ?? '').trim();
    const purpose = (body.purpose ?? '').trim();
    const clientKind = (body.client_kind ?? 'other').trim().toLowerCase();
    const publicRepo = (body.public_repo ?? '').trim() || null;

    if (name.length < 3 || name.length > 80) {
        return NextResponse.json({ error: 'name must be 3-80 chars' }, { status: 400 });
    }
    if (purpose.length < 10 || purpose.length > 500) {
        return NextResponse.json({ error: 'purpose must be 10-500 chars (be specific)' }, { status: 400 });
    }
    if (!ALLOWED_KINDS.includes(clientKind)) {
        return NextResponse.json({
            error: `client_kind must be one of: ${ALLOWED_KINDS.join(', ')}`,
        }, { status: 400 });
    }
    if (publicRepo && !/^https:\/\/(github|gitlab|codeberg)\.[\w.-]+\/[^\s]+/.test(publicRepo)) {
        return NextResponse.json({ error: 'public_repo must be valid public git URL' }, { status: 400 });
    }

    // Generate cryptographically secure token (32 bytes = 64 hex chars)
    const token = `egos_${randomBytes(32).toString('hex')}`;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
        .from('agent_registrations')
        .insert({
            name,
            purpose,
            client_kind: clientKind,
            public_repo: publicRepo,
            ephemeral_token: token,
            ip_origin: ip,
            user_agent: userAgent.slice(0, 500),
        })
        .select('id, expires_at')
        .single();

    if (error || !data) {
        console.error('[register]', error);
        return NextResponse.json({ error: 'Registration failed' }, { status: 503 });
    }

    return NextResponse.json({
        id: data.id,
        ephemeral_token: token,
        expires_at: data.expires_at,
        coord_post_url:  'https://intelink.ia.br/api/coord',
        coord_feed_url:  'https://intelink.ia.br/api/coord',
        bootstrap_url:   'https://intelink.ia.br/api/coord/bootstrap',
        canonical_rules: 'https://raw.githubusercontent.com/enioxt/egos/main/AGENTS.md',
        next: 'Use ephemeral_token in Authorization: Bearer header to post coord events. Token expires in 24h. Be a good citizen — apply 6 stop rules.',
    }, { status: 201 });
}

/**
 * DELETE /api/coord/register?token=<ephemeral_token>
 * Revoke own token before expiry.
 */
export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'token query param required' }, { status: 400 });

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
        .from('agent_registrations')
        .update({ revoked_at: new Date().toISOString() })
        .eq('ephemeral_token', token);

    if (error) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ ok: true, revoked: true });
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
