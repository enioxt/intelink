import { describe, it, expect, vi } from 'vitest';
import { FallbackProvider, type LLMProvider, type ChatMessage } from './llm-provider';

function fakeProvider(name: string, opts: { available?: boolean; chatFn?: () => Promise<any>; streamFn?: () => AsyncGenerator<string> }): LLMProvider {
    return {
        name,
        isAvailable: async () => opts.available ?? true,
        chat: opts.chatFn ?? (async () => ({ content: `${name}-response`, model: name })),
        streamChat: opts.streamFn,
    };
}

describe('FallbackProvider', () => {
    it('uses primary when it succeeds', async () => {
        const primary = fakeProvider('p', {});
        const fallback = fakeProvider('f', { chatFn: vi.fn() });
        const fb = new FallbackProvider(primary, [fallback]);
        const result = await fb.chat([{ role: 'user', content: 'hi' }]);
        expect(result.content).toBe('p-response');
        expect(fallback.chat).not.toHaveBeenCalled();
    });

    it('falls back to next provider on chat failure', async () => {
        const primary = fakeProvider('p', { chatFn: async () => { throw new Error('upstream 503'); } });
        const fallback = fakeProvider('f', {});
        const fb = new FallbackProvider(primary, [fallback]);
        const result = await fb.chat([{ role: 'user', content: 'hi' }]);
        expect(result.content).toBe('f-response');
    });

    it('throws aggregated error when all providers fail', async () => {
        const p1 = fakeProvider('p1', { chatFn: async () => { throw new Error('p1 fail'); } });
        const p2 = fakeProvider('p2', { chatFn: async () => { throw new Error('p2 fail'); } });
        const fb = new FallbackProvider(p1, [p2]);
        await expect(fb.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow(/p1 fail.*p2 fail/);
    });

    it('isAvailable returns true if any provider is up', async () => {
        const p1 = fakeProvider('p1', { available: false });
        const p2 = fakeProvider('p2', { available: true });
        const fb = new FallbackProvider(p1, [p2]);
        expect(await fb.isAvailable()).toBe(true);
    });

    it('isAvailable returns false if all are down', async () => {
        const p1 = fakeProvider('p1', { available: false });
        const p2 = fakeProvider('p2', { available: false });
        const fb = new FallbackProvider(p1, [p2]);
        expect(await fb.isAvailable()).toBe(false);
    });

    it('name reflects chain', () => {
        const p1 = fakeProvider('openrouter', {});
        const p2 = fakeProvider('groq', {});
        const p3 = fakeProvider('llama', {});
        const fb = new FallbackProvider(p1, [p2, p3]);
        expect(fb.name).toBe('fallback(openrouter→groq→llama)');
    });

    it('streamChat falls back when primary stream throws', async () => {
        const failingStream = async function* () {
            throw new Error('stream broke');
            yield ''; // unreachable, satisfies generator type
        };
        const goodStream = async function* () {
            yield 'a'; yield 'b';
        };
        const p1 = fakeProvider('p1', { streamFn: failingStream });
        const p2 = fakeProvider('p2', { streamFn: goodStream });
        const fb = new FallbackProvider(p1, [p2]);
        const collected: string[] = [];
        for await (const chunk of fb.streamChat([{ role: 'user', content: 'hi' } as ChatMessage])) {
            collected.push(chunk);
        }
        expect(collected).toEqual(['a', 'b']);
    });
});
