'use client';

/**
 * Intelink Document List Component
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * List of analyzed documents with filtering and sorting
 */

import { useState } from 'react';
import { FileText, AlertCircle, Search, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Document {
  id: string;
  filename: string;
  size_bytes: number;
  created_at: string;
  risk_level: string;
  entities_count: number;
  patterns_count: number;
  status: 'completed' | 'processing' | 'failed';
}

interface DocumentListProps {
  documents: Document[];
  onDocumentClick?: (doc: Document) => void;
}

export default function DocumentList({ documents, onDocumentClick }: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<string | null>(null);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = !riskFilter || doc.risk_level === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-gray-900';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={riskFilter || ''}
            onChange={(e) => setRiskFilter(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os níveis</option>
            <option value="critical">Crítico</option>
            <option value="high">Alto</option>
            <option value="medium">Médio</option>
            <option value="low">Baixo</option>
          </select>
        </div>
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum documento encontrado</p>
            {searchQuery && (
              <p className="text-sm mt-1">Tente ajustar os filtros de busca</p>
            )}
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onDocumentClick && onDocumentClick(doc)}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {doc.filename}
                    </h3>
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>{(doc.size_bytes / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{doc.entities_count} entidades</span>
                      <span>•</span>
                      <span>{doc.patterns_count} padrões</span>
                      <span>•</span>
                      <span className={getStatusColor(doc.status)}>
                        {doc.status === 'completed' ? 'Concluído' : doc.status === 'processing' ? 'Processando' : 'Erro'}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                </div>

                <div className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getRiskColor(doc.risk_level)}`}>
                  {doc.risk_level.toUpperCase()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      {filteredDocuments.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {filteredDocuments.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Documentos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {filteredDocuments.reduce((sum, doc) => sum + doc.entities_count, 0)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Entidades</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {filteredDocuments.reduce((sum, doc) => sum + doc.patterns_count, 0)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Padrões</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {filteredDocuments.filter(d => d.risk_level === 'high' || d.risk_level === 'critical').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Alto Risco</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
