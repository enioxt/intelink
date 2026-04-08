'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Upload, FileText, Activity, Search, Network, Database, AlertCircle, CheckCircle, Loader2, Plus, Scale } from 'lucide-react'
import { DashboardStats } from '@/components/intelink/DashboardStats'

interface IntelinkHealth {
  status: string
  bridge_status?: string
  fallback_mode?: boolean
  profile_enabled?: boolean
  database?: {
    status: string
    connected: boolean
  }
  jobs?: {
    status: string
    queue_size: number
  }
}

export default function IntelinkDashboard() {
  const [health, setHealth] = useState<IntelinkHealth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHealth()
  }, [])

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/intelink?action=health')
      const result = await response.json()
      setHealth(result.data)
    } catch (error) {
      console.error('Failed to fetch Intelink health:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Intelink</h1>
          <p className="text-muted-foreground mt-2">
            Visão geral do sistema de inteligência operacional
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </div>
        )}
      </div>

      {/* Primary CTA - Create Investigation */}
      <Link
        href="/intelink/investigations/new"
        className="block w-full sm:w-auto"
      >
        <button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group">
          <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
          <span>Nova Investigação</span>
          <Scale className="w-5 h-5 opacity-75" />
        </button>
      </Link>
      <p className="text-sm text-slate-600 dark:text-slate-400 -mt-2">
        Inicie uma nova investigação criminal com NER (BERTimbau) + Behavioral Profiling automático
      </p>

      {/* DashboardStats Component */}
      <DashboardStats />

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/intelink/upload"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
          >
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Novo Upload</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Enviar documentos</p>
            </div>
          </Link>

          <Link
            href="/intelink/docs/search"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-400 transition-colors"
          >
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <Search className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Buscar</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Busca avançada</p>
            </div>
          </Link>

          <Link
            href="/intelink/docs"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
          >
            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Documentos</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Ver todos</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Atividade Recente
          </h2>
          <Link
            href="/intelink/jobs"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Ver todos os jobs
          </Link>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Jobs recentes aparecerão aqui...
          </p>
        </div>
      </div>

      {/* Sacred Footer */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-600 pt-6 border-t border-slate-200 dark:border-slate-800">
        Sacred Code: 000.369.963.1618 (∞△⚡◎φ) | EGOS v.2 Intelink Platform
      </div>
    </div>
  );
}
