'use client';

/**
 * Investigations List Page
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * List all criminal investigations with filters
 */


import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Scale, AlertCircle, Loader2 } from 'lucide-react';
import { useInvestigations } from '@/hooks/useInvestigations';

type StatusFilter = 'all' | 'active' | 'under_review' | 'closed' | 'archived';
type PriorityBadge = 'low' | 'medium' | 'high' | 'critical';

export default function InvestigationsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data, isLoading, error } = useInvestigations({
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 50,
  });

  const investigations = data?.investigations || [];
  
  // Filter by search query (client-side)
  const filteredInvestigations = investigations.filter((inv: any) =>
    inv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.case_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Investigações
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gerenciamento de casos criminais e investigações
            </p>
          </div>
          
          <Link
            href="/intelink/investigations/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Investigação
          </Link>
        </div>

        {/* Sacred Code Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
              Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título ou número do caso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativo</option>
            <option value="under_review">Em Revisão</option>
            <option value="closed">Fechado</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando investigações...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300">
              Erro ao carregar investigações: {error.message}
            </span>
          </div>
        </div>
      )}

      {/* Investigations Table */}
      {!isLoading && !error && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Caso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Prioridade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Documentos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Criado em
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInvestigations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      {searchQuery || statusFilter !== 'all' 
                        ? 'Nenhuma investigação encontrada com os filtros atuais.' 
                        : 'Nenhuma investigação criada ainda. Crie a primeira!'}
                    </td>
                  </tr>
                ) : (
                  filteredInvestigations.map((inv: any) => (
                    <tr 
                      key={inv.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link 
                          href={`/intelink/investigations/${inv.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          {inv.title}
                        </Link>
                        {inv.case_number && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {inv.case_number}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-6 py-4">
                        <PriorityBadge priority={inv.priority} />
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">
                        {inv.document_count}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Stats */}
          {filteredInvestigations.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Mostrando {filteredInvestigations.length} de {investigations.length} investigações
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  const labels: Record<string, string> = {
    active: 'Ativo',
    under_review: 'Em Revisão',
    closed: 'Fechado',
    archived: 'Arquivado',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
      {labels[status] || status}
    </span>
  );
}

// Priority Badge Component
function PriorityBadge({ priority }: { priority: PriorityBadge }) {
  const styles: Record<PriorityBadge, string> = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const labels: Record<PriorityBadge, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
}
