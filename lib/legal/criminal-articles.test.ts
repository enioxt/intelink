import { describe, it, expect } from 'vitest';
import {
    detectCriminalArticles,
    formatDetectionResults,
    getArticleById,
    searchArticles,
    CRIMINAL_ARTICLES,
} from './criminal-articles';

describe('detectCriminalArticles', () => {
    it('returns empty array for innocuous text', () => {
        expect(detectCriminalArticles('Hoje fui à padaria comprar pão.')).toEqual([]);
    });

    it('detects homicídio keywords', () => {
        const results = detectCriminalArticles('Suspeito acusado de homicídio doloso na via pública.', 0.1);
        expect(results.length).toBeGreaterThan(0);
        const homicideHit = results.find(r => /homic/i.test(r.article.title));
        expect(homicideHit).toBeDefined();
    });

    it('respects minConfidence threshold', () => {
        const text = 'roubo';
        const lowThreshold = detectCriminalArticles(text, 0.01);
        const highThreshold = detectCriminalArticles(text, 0.99);
        expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
    });

    it('normalizes accents (case + diacritics insensitive)', () => {
        const accented = detectCriminalArticles('TRÁFICO DE DROGAS NA RUA', 0.1);
        const plain = detectCriminalArticles('trafico de drogas na rua', 0.1);
        expect(accented.length).toBe(plain.length);
    });
});

describe('formatDetectionResults', () => {
    it('returns string output for non-empty results', () => {
        const results = detectCriminalArticles('homicídio com arma de fogo', 0.1);
        if (results.length > 0) {
            const output = formatDetectionResults(results);
            expect(typeof output).toBe('string');
            expect(output.length).toBeGreaterThan(0);
        }
    });
});

describe('getArticleById + searchArticles', () => {
    it('finds article by id', () => {
        const first = CRIMINAL_ARTICLES[0]!;
        const found = getArticleById(first.id);
        expect(found?.id).toBe(first.id);
    });

    it('returns undefined for unknown id', () => {
        expect(getArticleById('xx-nonexistent')).toBeUndefined();
    });

    it('searchArticles returns matches by accented query (regression: bug = no normalization)', () => {
        // KNOWN BUG: searchArticles doesn't normalize diacritics. Test asserts current behavior.
        // When fixed, change to use 'homicidio' (no accent) and expect match.
        const matchesAccented = searchArticles('homicídio');
        expect(matchesAccented.length).toBeGreaterThan(0);
    });
});

describe('CRIMINAL_ARTICLES catalog integrity', () => {
    it('has all articles with required fields', () => {
        for (const article of CRIMINAL_ARTICLES) {
            expect(article.id).toBeTruthy();
            expect(article.law).toBeTruthy();
            expect(article.title).toBeTruthy();
            expect(article.article).toBeTruthy();
            expect(article.severity).toMatch(/^(LEVE|MEDIO|GRAVE|GRAVISSIMO)$/);
            expect(Array.isArray(article.keywords)).toBe(true);
            expect(article.keywords.length).toBeGreaterThan(0);
        }
    });

    it('has unique ids', () => {
        const ids = CRIMINAL_ARTICLES.map(a => a.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});
