#!/usr/bin/env bun
/**
 * scripts/coord-register.ts
 * Records a cross-repo coordination event to Supabase.
 *
 * Usage:
 *   bun scripts/coord-register.ts \
 *     --id COORD-2026-04-26-D \
 *     --desc "What this coord is about" \
 *     --target intelink \
 *     --task "DATA-005" \
 *     --owner janela-A \
 *     --kernel-sha 2ce5cba \
 *     --leaf-sha bd9e5f5
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from env (.env / VPS env).
 * Idempotent: ON CONFLICT (coord_id) DO UPDATE.
 */

import { createClient } from '@supabase/supabase-js';

function arg(name: string): string | undefined {
    const i = process.argv.findIndex(a => a === `--${name}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
}

const coord_id     = arg('id');
const description  = arg('desc');
const target_repo  = arg('target');
const target_task  = arg('task');
const owner_window = arg('owner');
const kernel_sha   = arg('kernel-sha');
const leaf_sha     = arg('leaf-sha');
const leaf_url     = arg('leaf-url');
const status       = arg('status') ?? (kernel_sha && leaf_sha ? 'done' : 'pending');

if (!coord_id || !description || !target_repo || !owner_window) {
    console.error('Missing required: --id --desc --target --owner');
    process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
    console.error('Missing SUPABASE env vars');
    process.exit(1);
}

const supabase = createClient(url, key);

const { error } = await supabase
    .from('coord_events')
    .upsert({
        coord_id,
        description,
        target_repo,
        target_task,
        status,
        owner_window,
        kernel_sha,
        leaf_sha,
        leaf_repo_url: leaf_url ?? (target_repo === 'intelink' ? 'https://github.com/enioxt/intelink' : null),
        closed_at: status === 'done' ? new Date().toISOString() : null,
    }, { onConflict: 'coord_id' });

if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
}

console.log(`✅ ${coord_id} registered (${status}) — kernel:${kernel_sha ?? 'TBD'} leaf:${leaf_sha ?? 'TBD'}`);
console.log('   See: https://intelink.ia.br/api/coord');
