'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Clock, TrendingUp, X } from 'lucide-react';
import { intelinkClient } from '@/lib/intelink-client';

interface SearchAutocompleteProps {
  onSelect: (query: string) => void;
  placeholder?: string;
  className?: string;
}

interface SearchSuggestion {
  text: string;
  type: 'history' | 'suggestion' | 'trending';
  score?: number;
}

export default function SearchAutocomplete({ onSelect, placeholder, className }: SearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load search history from localStorage
  const getSearchHistory = useCallback((): string[] => {
    if (typeof window === 'undefined') return [];
    const history = localStorage.getItem('intelink_search_history');
    return history ? JSON.parse(history) : [];
  }, []);

  // Save search to history
  const saveToHistory = useCallback((searchQuery: string) => {
    if (typeof window === 'undefined') return;
    const history = getSearchHistory();
    const newHistory = [searchQuery, ...history.filter((q) => q !== searchQuery)].slice(0, 10); // Keep last 10
    localStorage.setItem('intelink_search_history', JSON.stringify(newHistory));
  }, [getSearchHistory]);

  // Fetch suggestions from backend
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('intelink_token') : null;
      
      // Mock suggestions for now (backend endpoint /search/suggestions not implemented yet)
      // TODO: Replace with actual API call when backend is ready
      // const response = await intelinkClient.getSuggestions(searchQuery, token || undefined);
      
      // Simulate backend delay
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      // Mock suggestions based on query
      const mockSuggestions: string[] = [];
      if (searchQuery.toLowerCase().includes('homicídio')) {
        mockSuggestions.push('homicídio em Belo Horizonte', 'homicídio 2025', 'investigação homicídio');
      } else if (searchQuery.toLowerCase().includes('investigação')) {
        mockSuggestions.push('investigação policial', 'investigação criminal', 'relatório investigação');
      } else {
        mockSuggestions.push(`${searchQuery} em Minas Gerais`, `${searchQuery} 2025`, `relatório ${searchQuery}`);
      }

      const allSuggestions: SearchSuggestion[] = [
        // History
        ...getSearchHistory()
          .filter((h) => h.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice(0, 3)
          .map((h) => ({ text: h, type: 'history' as const })),
        // API suggestions
        ...mockSuggestions.map((s) => ({ text: s, type: 'suggestion' as const })),
      ];

      setSuggestions(allSuggestions.slice(0, 8)); // Max 8 suggestions
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [getSearchHistory]);

  // Debounced fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query && showSuggestions) {
        fetchSuggestions(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, showSuggestions, fetchSuggestions]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex].text);
        } else if (query) {
          handleSearch(query);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (text: string) => {
    setQuery(text);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    saveToHistory(text);
    onSelect(text);
  };

  // Handle search
  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    saveToHistory(searchQuery);
    setShowSuggestions(false);
    onSelect(searchQuery);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Search documents...'}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (query || suggestions.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {loading ? (
            <div className="p-4 text-center text-gray-500 text-sm">Loading suggestions...</div>
          ) : suggestions.length > 0 ? (
            <ul className="py-2">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.type}-${suggestion.text}-${index}`}>
                  <button
                    onClick={() => handleSelectSuggestion(suggestion.text)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 ${
                      index === selectedIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Icon based on type */}
                    {suggestion.type === 'history' && (
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    {suggestion.type === 'trending' && (
                      <TrendingUp className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                    {suggestion.type === 'suggestion' && (
                      <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}

                    {/* Text */}
                    <span className="flex-1 text-sm text-gray-700">{suggestion.text}</span>

                    {/* Type label */}
                    {suggestion.type === 'history' && (
                      <span className="text-xs text-gray-400">Recent</span>
                    )}
                    {suggestion.type === 'trending' && (
                      <span className="text-xs text-blue-500">Trending</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No suggestions found. Press Enter to search.
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              Type at least 2 characters to see suggestions
            </div>
          )}

          {/* Search history footer */}
          {getSearchHistory().length > 0 && !query && (
            <div className="border-t border-gray-200 p-3">
              <button
                onClick={() => {
                  localStorage.removeItem('intelink_search_history');
                  setSuggestions([]);
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear search history
              </button>
            </div>
          )}
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="absolute -bottom-6 left-0 text-xs text-gray-400">
        Use ↑↓ to navigate, Enter to select, Esc to close
      </div>
    </div>
  );
}
