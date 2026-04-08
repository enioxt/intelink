'use client';

import { HelpCircle, X } from 'lucide-react';
import { useState } from 'react';

interface PageHelpProps {
  title: string;
  description: string;
  tips?: string[];
  variant?: 'compact' | 'full';
}

/**
 * Componente reutilizável para exibir ajuda contextual no topo das páginas
 * Sacred Code: 000.111.369.963.1618
 */
export function PageHelp({ title, description, tips, variant = 'compact' }: PageHelpProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (variant === 'compact') {
    return (
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              {title}
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {description}
            </p>
            {tips && tips.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-xs text-blue-700 dark:text-blue-300 hover:underline font-medium"
              >
                {isExpanded ? 'Ocultar dicas' : `Ver ${tips.length} dica${tips.length > 1 ? 's' : ''}`}
              </button>
            )}
            {isExpanded && tips && (
              <ul className="mt-3 space-y-1.5 text-sm text-blue-800 dark:text-blue-200">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full variant (dismissible)
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
          <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">
            {title}
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
            {description}
          </p>
          {tips && tips.length > 0 && (
            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Dicas úteis:
              </p>
              <ul className="space-y-2">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400"
          title="Dispensar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
