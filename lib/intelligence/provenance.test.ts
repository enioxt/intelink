import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logToolCall, getProvenance } from './provenance';

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock, select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) })) })) })) })) }));

vi.mock('@/lib/api-utils', () => ({
    getSupabaseAdmin: () => ({ from: fromMock }),
}));

describe('provenance.logToolCall', () => {
    beforeEach(() => {
        insertMock.mockReset().mockResolvedValue({ error: null });
        fromMock.mockClear();
    });

    it('writes action=tool_call with hashed args + result', async () => {
        await logToolCall({
            toolName: 'search_entities',
            args: { query: 'João Silva', limit: 10 },
            result: 'Found 3 entities',
            sessionId: 'sess-abc',
            investigationId: 'inv-123',
            actorId: 'member-1',
            actorName: 'Investigator',
            actorRole: 'investigator',
            durationMs: 42,
        });

        expect(fromMock).toHaveBeenCalledWith('intelink_audit_logs');
        expect(insertMock).toHaveBeenCalledOnce();

        const inserted = insertMock.mock.calls[0]![0];
        expect(inserted.action).toBe('tool_call');
        expect(inserted.actor_id).toBe('member-1');
        expect(inserted.target_type).toBe('chat_session');
        expect(inserted.target_id).toBe('sess-abc');
        expect(inserted.target_name).toBe('search_entities');
        expect(inserted.details.tool).toBe('search_entities');
        expect(inserted.details.args_hash).toMatch(/^[a-f0-9]{64}$/);
        expect(inserted.details.result_hash).toMatch(/^[a-f0-9]{64}$/);
        expect(inserted.details.duration_ms).toBe(42);
        expect(inserted.details.investigation_id).toBe('inv-123');
        expect(inserted.details.error).toBeUndefined();
    });

    it('produces deterministic args_hash regardless of key order', async () => {
        await logToolCall({
            toolName: 'x', args: { b: 2, a: 1, c: 3 }, result: 'r', actorId: 'u', sessionId: 's',
        });
        await logToolCall({
            toolName: 'x', args: { c: 3, a: 1, b: 2 }, result: 'r', actorId: 'u', sessionId: 's',
        });
        const h1 = insertMock.mock.calls[0]![0].details.args_hash;
        const h2 = insertMock.mock.calls[1]![0].details.args_hash;
        expect(h1).toBe(h2);
    });

    it('falls back to investigationId when sessionId missing', async () => {
        await logToolCall({
            toolName: 'x', args: {}, result: 'r', actorId: 'u', investigationId: 'inv-9',
        });
        expect(insertMock.mock.calls[0]![0].target_id).toBe('inv-9');
    });

    it('falls back to "unknown" when no session/investigation', async () => {
        await logToolCall({ toolName: 'x', args: {}, result: 'r', actorId: 'u' });
        expect(insertMock.mock.calls[0]![0].target_id).toBe('unknown');
    });

    it('records error when tool failed', async () => {
        await logToolCall({
            toolName: 'failing_tool', args: { x: 1 }, result: '', actorId: 'u', sessionId: 's',
            error: 'Connection refused',
        });
        const d = insertMock.mock.calls[0]![0].details;
        expect(d.error).toBe('Connection refused');
        expect(d.result_size).toBe(0);
    });

    it('truncates large args_preview to 500 chars + ellipsis', async () => {
        const big = { huge: 'x'.repeat(1000) };
        await logToolCall({ toolName: 't', args: big, result: 'r', actorId: 'u', sessionId: 's' });
        const preview = insertMock.mock.calls[0]![0].details.args_preview;
        expect(preview.length).toBeLessThanOrEqual(501);
        expect(preview.endsWith('…')).toBe(true);
    });

    it('is non-fatal when supabase insert throws', async () => {
        insertMock.mockRejectedValueOnce(new Error('db down'));
        await expect(logToolCall({
            toolName: 't', args: {}, result: 'r', actorId: 'u', sessionId: 's',
        })).resolves.toBeUndefined();
    });
});

describe('provenance.getProvenance', () => {
    it('returns empty array on read error', async () => {
        const result = await getProvenance('nonexistent');
        expect(Array.isArray(result)).toBe(true);
    });
});
