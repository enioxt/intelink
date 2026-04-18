/**
 * Quantum Search Page — EGOS Inteligência
 * 
 * [EGOS-MERGE] 🔵 ADAPTED: Busca unificada com Neo4j (merge Intelink + BR-ACC)
 * TARGET: /home/enio/intelink/app/search/page.tsx
 * OWNER: cascade-agent
 * TIMESTAMP: 2026-04-01
 * 
 * Features:
 * - Busca em múltiplos tipos de entidades (CNPJ, PEP, Sanctions)
 * - Normalização de acentos (Intelink feature)
 * - Cross-reference CPF → Empresas
 * - Sugestões em tempo real
 */

'use client';

import { useState, useCallback, useEffect, Suspense, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { neo4jClient, Neo4jNode } from '@/lib/neo4j/client';

// Normalização de acentos (feature do Intelink)
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Detectar tipo de busca
function detectQueryType(query: string): 'cnpj' | 'cpf' | 'name' | 'general' {
  const clean = query.replace(/[^\d]/g, '');

  if (/^\d{14}$/.test(clean)) return 'cnpj';
  if (/^\d{11}$/.test(clean)) return 'cpf';
  if (clean.length === 14 || clean.length === 11) return clean.length === 14 ? 'cnpj' : 'cpf';

  return 'general';
}

interface SearchResult {
  node: Neo4jNode;
  score: number;
  matches: string[];
}

function getEntityHref(node: Neo4jNode): string | null {
  // Person nodes → investigation page with REDS occurrences (FEAT-004)
  // Use CPF for cross-DB lookup (br-acc IDs don't map to local Neo4j elementIds)
  if (node.labels.includes('Person')) {
    const cpf = node.properties.cpf?.replace?.(/\D/g, '');
    if (cpf) return `/pessoa/${cpf}`;
    return null;
  }
  if (node.properties.cnpj) return `/entity/${node.properties.cnpj}`;
  if (node.properties.cpf) return `/entity/${node.properties.cpf}`;
  return null;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const queryType = detectQueryType(searchQuery);

      // Normalizar para busca
      const normalizedQuery = normalizeText(searchQuery);

      // Buscar no Neo4j
      const nodes = await neo4jClient.search(normalizedQuery, {
        limit: 50,
      });

      // Calcular scores e matches
      const scoredResults: SearchResult[] = nodes.map(node => {
        let score = 0;
        const matches: string[] = [];

        const props = node.properties;

        // Score por match exato
        if (props.cnpj && normalizeText(props.cnpj).includes(normalizedQuery)) {
          score += 100;
          matches.push('CNPJ exato');
        }

        if (props.cpf && normalizeText(props.cpf).includes(normalizedQuery)) {
          score += 100;
          matches.push('CPF exato');
        }

        // Score por nome
        if (props.name) {
          const nameNorm = normalizeText(props.name);
          if (nameNorm === normalizedQuery) {
            score += 90;
            matches.push('Nome exato');
          } else if (nameNorm.includes(normalizedQuery)) {
            score += 70;
            matches.push('Nome parcial');
          }
        }

        // Boost por tipo relevante
        if (queryType === 'cnpj' && node.labels.includes('Company')) {
          score += 20;
        }
        if (queryType === 'cpf' && node.labels.includes('Person')) {
          score += 20;
        }

        return { node, score, matches };
      });

      // Ordenar por score
      scoredResults.sort((a, b) => b.score - a.score);

      setResults(scoredResults);
      setTotalCount(nodes.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na busca');
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar ao carregar com query inicial
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const getEntityIcon = (labels: string[]) => {
    if (labels.includes('Company')) return '🏢';
    if (labels.includes('Person')) return '👤';
    if (labels.includes('PEPRecord')) return '⭐';
    if (labels.includes('Sanction')) return '⚠️';
    return '📄';
  };

  const getEntityColor = (labels: string[]) => {
    if (labels.includes('Company')) return 'bg-blue-100 text-blue-800';
    if (labels.includes('Person')) return 'bg-green-100 text-green-800';
    if (labels.includes('PEPRecord')) return 'bg-amber-100 text-amber-800';
    if (labels.includes('Sanction')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Busca Global</h1>
        <p className="text-gray-600">
          Busque em 83+ milhões de registros: CNPJ, PEPs, Sanções, e mais
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busque por CNPJ, CPF, nome de empresa, ou pessoa..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* Dicas de busca */}
        <div className="mt-2 text-sm text-gray-500 flex gap-4 flex-wrap">
          <span>Exemplos:</span>
          <button
            type="button"
            onClick={() => { setQuery('11279741000140'); performSearch('11279741000140'); }}
            className="text-blue-600 hover:underline"
          >
            CNPJ
          </button>
          <button
            type="button"
            onClick={() => { setQuery('João Silva'); performSearch('João Silva'); }}
            className="text-blue-600 hover:underline"
          >
            Nome
          </button>
          <button
            type="button"
            onClick={() => { setQuery('Construtora'); performSearch('Construtora'); }}
            className="text-blue-600 hover:underline"
          >
            Empresa
          </button>
        </div>
      </form>

      {/* Results */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="mb-4 text-gray-600">
          {totalCount} resultado{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
        </div>
      )}

      <div className="space-y-4">
        {results.map(({ node, score, matches }) => {
          const entityHref = getEntityHref(node);

          return (
            <div
              key={node.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{getEntityIcon(node.labels)}</span>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getEntityColor(node.labels)}`}>
                      {node.labels[0] || 'Entity'}
                    </span>

                    {/* Score indicator */}
                    <span className="text-xs text-gray-400">
                      Score: {score}
                    </span>

                    {matches.length > 0 && (
                      <span className="text-xs text-green-600">
                        {matches.join(', ')}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {node.properties.name ||
                      node.properties.company_name ||
                      node.properties.cnpj ||
                      'Sem nome'}
                  </h3>

                  {/* CNPJ/CPF */}
                  {(node.properties.cnpj || node.properties.cpf) && (
                    <p className="text-sm font-mono text-gray-600 mb-2">
                      {node.properties.cnpj || node.properties.cpf}
                    </p>
                  )}

                  {/* Additional info */}
                  <div className="text-sm text-gray-500 space-y-1">
                    {node.properties.status && (
                      <p>Status: {node.properties.status}</p>
                    )}
                    {node.properties.organization && (
                      <p>Órgão: {node.properties.organization}</p>
                    )}
                    {node.properties.position && (
                      <p>Cargo: {node.properties.position}</p>
                    )}
                    {node.properties.source && (
                      <p>Fonte: {node.properties.source}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    {entityHref ? (
                      <a
                        href={entityHref}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        {node.labels.includes('Person') ? 'Ver investigação' : 'Ver detalhes'}
                      </a>
                    ) : (
                      <span className="px-4 py-2 bg-gray-100 text-gray-500 text-sm rounded cursor-not-allowed">
                        Detalhe indisponível
                      </span>
                    )}
                    <a
                      href={`/network/${node.id}`}
                      className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                    >
                      Ver rede
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {!loading && query && results.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Nenhum resultado encontrado</p>
          <p className="text-gray-400 mt-2">Tente uma busca diferente ou verifique a ortografia</p>
        </div>
      )}

      {/* Initial state */}
      {!query && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">Digite sua busca acima</p>
          <p className="text-gray-400 mt-2">Busque por CNPJ, nome de empresa, PEP, ou sanções</p>
        </div>
      )}
    </div>
  );
}

// Loading fallback
function SearchLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-gray-200 rounded mb-8"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main export with Suspense
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}
