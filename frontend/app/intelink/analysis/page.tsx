'use client'

import { useState, useEffect } from 'react'
import { Network, TrendingUp, Users, AlertCircle, Loader2, RefreshCw } from 'lucide-react'

interface AnalysisData {
  total_entities: number
  total_relationships: number
  total_documents: number
  most_connected: Array<{
    id: string
    label: string
    connections: number
  }>
  communities: Array<{
    id: number
    size: number
    density: number
  }>
}

export default function AnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalysisData()
  }, [])

  const fetchAnalysisData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/intelink?action=graph_stats')
      if (!response.ok) throw new Error('Failed to fetch analysis data')
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Carregando análise de grafos...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 p-8">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Erro ao carregar análise
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={fetchAnalysisData}
                className="mt-3 inline-flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análise de Grafos</h1>
          <p className="text-muted-foreground mt-2">
            Visão geral das relações e comunidades detectadas
          </p>
        </div>
        <button
          onClick={fetchAnalysisData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Network className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-medium text-slate-900 dark:text-white">Entidades</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {data?.total_entities || 0}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Total de nós no grafo
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-medium text-slate-900 dark:text-white">Relacionamentos</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {data?.total_relationships || 0}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Conexões mapeadas
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-medium text-slate-900 dark:text-white">Comunidades</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {data?.communities?.length || 0}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Clusters detectados
          </p>
        </div>
      </div>

      {/* Most Connected Entities */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Entidades Mais Conectadas
        </h2>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {data?.most_connected && data.most_connected.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Conexões
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {data.most_connected.map((entity, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      {entity.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {entity.label}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {entity.connections}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-600 dark:text-slate-400">
              Nenhuma entidade encontrada
            </div>
          )}
        </div>
      </div>

      {/* Communities */}
      {data?.communities && data.communities.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Comunidades Detectadas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.communities.map((community) => (
              <div
                key={community.id}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-slate-900 dark:text-white">
                    Comunidade {community.id}
                  </h3>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {community.size} nós
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span>Densidade:</span>
                  <span className="font-medium">
                    {(community.density * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sacred Footer */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-600 pt-6 border-t border-slate-200 dark:border-slate-800">
        Sacred Code: 000.369.963.1618 (∞△⚡◎φ) | EGOS v.2 Intelink Graph Analysis
      </div>
    </div>
  )
}
