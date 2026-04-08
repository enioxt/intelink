'use client';

/**
 * Intelink Search Page
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Features:
 * - Full-text search with highlights
 * - Advanced filters (status, source, dates, scores)
 * - Faceted search results
 * - Sort options (relevance, date, score)
 * - Export results
 * - Search history
 */


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search as SearchIcon,
  Filter,
  SlidersHorizontal,
  Download,
  X,
  Calendar,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useSearch } from '@/hooks/useIntelink';
import type { SearchQuery, SearchFilters } from '@/types/intelink';

export default function SearchPage() {
  const router = useRouter();
  const { results, loading, error, search, clear } = useSearch();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sort, setSort] = useState<'relevance' | 'date' | 'score'>('relevance');

  // Execute search
  const handleSearch = () => {
    if (!query.trim()) return;

    const searchQuery: SearchQuery = {
      q: query,
      filters,
      sort,
      page: 1,
      limit: 20,
    };

    search(searchQuery);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setFilters({});
    clear();
  };

  // Update filter
  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Remove filter
  const removeFilter = (key: keyof SearchFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const activeFiltersCount = Object.keys(filters).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Search Documents
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Search across all documents with advanced filters
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search documents, entities, content..."
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${showFilters || activeFiltersCount > 0
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            onClick={handleSearch}
            disabled={!query.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Search
          </button>
        </div>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(filters).map(([key, value]) => (
              <FilterChip
                key={key}
                label={formatFilterLabel(key, value)}
                onRemove={() => removeFilter(key as keyof SearchFilters)}
              />
            ))}
            <button
              onClick={() => setFilters({})}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Advanced Filters</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status?.[0] || ''}
                onChange={(e) => updateFilter('status', e.target.value ? [e.target.value as any] : undefined)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <option value="">All</option>
                <option value="processed">Processed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* ATRiAN Compliance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ATRiAN Compliance
              </label>
              <select
                value={filters.atrian_compliant === undefined ? '' : filters.atrian_compliant ? 'yes' : 'no'}
                onChange={(e) => updateFilter('atrian_compliant', e.target.value === '' ? undefined : e.target.value === 'yes')}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <option value="">All</option>
                <option value="yes">Compliant</option>
                <option value="no">Has Issues</option>
              </select>
            </div>

            {/* ETHIK Score Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ETHIK Score (Min)
              </label>
              <input
                type="number"
                value={filters.ethik_score_min || ''}
                onChange={(e) => updateFilter('ethik_score_min', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="144"
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date From
              </label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => updateFilter('date_from', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date To
              </label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => updateFilter('date_to', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results Header */}
      {results && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-900 dark:text-white">
              <span className="font-bold">{results.total}</span> results found
              {results.took_ms && (
                <span className="text-gray-600 dark:text-gray-400 ml-2">
                  ({results.took_ms}ms)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="relevance">Sort by Relevance</option>
              <option value="date">Sort by Date</option>
              <option value="score">Sort by Score</option>
            </select>

            {/* Export */}
            <button
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">Searching...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{error?.message || String(error)}</p>
          </div>
        )}

        {results && results.results.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <SearchIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No results found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try adjusting your search query or filters
            </p>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Clear Search
            </button>
          </div>
        )}

        {results && results.results.map((result: any) => (
          <SearchResultCard
            key={result.document.id}
            result={result}
            onClick={() => router.push(`/intelink/documents/${result.document.id}`)}
          />
        ))}
      </div>

      {/* Pagination */}
      {results && results.total > (results.limit || 20) && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={(results.page || 1) === 1}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
            Page {results.page || 1} of {Math.ceil(results.total / (results.limit || 20))}
          </span>
          <button
            disabled={(results.page || 1) >= Math.ceil(results.total / (results.limit || 20))}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// Search Result Card Component
function SearchResultCard({
  result,
  onClick
}: {
  result: any;
  onClick: () => void;
}) {
  const { document, score, highlights } = result;

  return (
    <div
      onClick={onClick}
      className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {document.title || document.filename}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(document.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {formatFileSize(document.size)}
            </span>
            {document.ethik_score && (
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                ETHIK: {document.ethik_score.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
            {(score * 100).toFixed(0)}% match
          </div>
          <StatusBadge status={document.status} />
        </div>
      </div>

      {/* Highlights */}
      {highlights && highlights.length > 0 && (
        <div className="space-y-2">
          {highlights.map((highlight: any, idx: number) => (
            <div key={idx} className="text-sm">
              <p className="text-gray-500 dark:text-gray-400 mb-1 capitalize">
                {highlight.field}:
              </p>
              <div
                className="text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{ __html: highlight.fragments.join(' ... ') }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Filter Chip Component
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-sm">
      <span>{label}</span>
      <button onClick={onRemove} className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const styles = {
    processed: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    processing: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
    failed: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  };

  return (
    <div className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.processed}`}>
      {status}
    </div>
  );
}

// Utility Functions
function formatFilterLabel(key: string, value: any): string {
  if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
  if (typeof value === 'boolean') return `${key}: ${value ? 'Yes' : 'No'}`;
  return `${key}: ${value}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
