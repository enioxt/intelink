import { describe, it, expect } from 'vitest';
import { parseSlashCommand, helpMessage } from './chat-slash-commands';

describe('parseSlashCommand', () => {
    it('returns none for non-slash text', () => {
        expect(parseSlashCommand('hello world')).toEqual({ kind: 'none' });
        expect(parseSlashCommand('')).toEqual({ kind: 'none' });
        expect(parseSlashCommand(null)).toEqual({ kind: 'none' });
        expect(parseSlashCommand(undefined)).toEqual({ kind: 'none' });
    });

    it('parses /help and aliases', () => {
        expect(parseSlashCommand('/help')).toEqual({ kind: 'help' });
        expect(parseSlashCommand('  /HELP  ')).toEqual({ kind: 'help' });
        expect(parseSlashCommand('/ajuda')).toEqual({ kind: 'help' });
    });

    it('parses /unlink and aliases', () => {
        expect(parseSlashCommand('/unlink')).toEqual({ kind: 'unlink' });
        expect(parseSlashCommand('/desvincular')).toEqual({ kind: 'unlink' });
    });

    it('parses /link with UUID', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        expect(parseSlashCommand(`/link ${uuid}`)).toEqual({ kind: 'link', investigationId: uuid });
        expect(parseSlashCommand(`/link investigation:${uuid}`)).toEqual({ kind: 'link', investigationId: uuid });
        expect(parseSlashCommand(`/vincular ${uuid.toUpperCase()}`)).toEqual({ kind: 'link', investigationId: uuid });
    });

    it('returns none for /link without valid UUID', () => {
        expect(parseSlashCommand('/link foo bar')).toEqual({ kind: 'none' });
        expect(parseSlashCommand('/link 12345')).toEqual({ kind: 'none' });
    });

    it('ignores commands embedded mid-message', () => {
        expect(parseSlashCommand('please /link 550e8400-e29b-41d4-a716-446655440000')).toEqual({ kind: 'none' });
    });
});

describe('helpMessage', () => {
    it('contains command names', () => {
        const msg = helpMessage();
        expect(msg).toContain('/link');
        expect(msg).toContain('/unlink');
        expect(msg).toContain('/help');
        expect(msg).toContain('investigação');
    });
});
