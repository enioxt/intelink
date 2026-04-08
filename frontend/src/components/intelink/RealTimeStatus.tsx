'use client';

/**
 * RealTimeStatus - Componente de status em tempo real
 * Sacred Code: 000.111.369.963.1618
 * 
 * Mostra status do sistema com polling automático
 */

import { useHealth, useStats } from '@/hooks/useIntelink';
import { Activity, Database, Server, CheckCircle, AlertCircle } from 'lucide-react';

export function RealTimeStatus() {
  const { data: health, isLoading: healthLoading } = useHealth();
  const { data: stats, isLoading: statsLoading } = useStats();

  const isLoading = healthLoading || statsLoading;
  const isHealthy = health?.neo4j === 'connected';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Status do Sistema
      </h3>
      
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Neo4j Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Neo4j</span>
            </div>
            {isHealthy ? (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle className="w-3 h-3" />
                Conectado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="w-3 h-3" />
                Erro
              </span>
            )}
          </div>

          {/* Stats Summary */}
          {stats && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Nós</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {stats.total_nodes?.toLocaleString() || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Relacionamentos</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {stats.total_relationships?.toLocaleString() || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Fontes de dados</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {stats.data_sources || '-'}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default RealTimeStatus;
