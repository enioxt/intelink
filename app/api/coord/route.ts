/**
 * GET /api/coord
 * Public read-only feed of cross-repo coordination events.
 * Pairs with egos/docs/COORDINATION_PATTERN.md (CRC-PATTERN-v1).
 *
 * No auth required — coord events are designed to be transparent.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // cache 1 min

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
        .from('coord_events')
        .select('coord_id, description, target_repo, target_task, status, owner_window, kernel_sha, leaf_sha, leaf_repo_url, error_log, created_at, closed_at')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json({
        protocol: 'CRC-PATTERN-v1',
        canonical_doc: 'https://github.com/enioxt/egos/blob/main/docs/COORDINATION_PATTERN.md',
        kernel_repo: 'https://github.com/enioxt/egos',
        active_count: (data ?? []).filter(e => e.status === 'pending').length,
        closed_count: (data ?? []).filter(e => e.status === 'done').length,
        events: data ?? [],
    }, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
}
