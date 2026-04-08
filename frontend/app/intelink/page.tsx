'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Upload, FileText, Activity, Search, Network, Database, AlertCircle, CheckCircle, Loader2, Plus, Scale } from 'lucide-react'
import { DashboardStats } from './_components/DashboardStats'
import { useHealth, useStats, useJobs } from '@/hooks/useIntelink'
import { QuickActions } from '@/components/intelink/QuickActions'
import { RealTimeStatus } from '@/components/intelink/RealTimeStatus'

export default function IntelinkDashboard() {
  const { data: health, isLoading: healthLoading } = useHealth()
  const { data: stats, isLoading: statsLoading } = useStats()
  const { jobs, loading: jobsLoading } = useJobs()

  const loading = healthLoading || statsLoading || jobsLoading

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

      {/* Quick Actions */}
      <QuickActions />

      {/* DashboardStats Component */}
      <DashboardStats />

      {/* Two Column Layout - Status and Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Jobs (2/3) */}
        <div className="lg:col-span-2">
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
                Ver todos os jobs ({jobs.length})
              </Link>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              {jobsLoading ? (
                <div className="p-6 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : jobs.length > 0 ? (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {jobs.slice(0, 5).map((job: any) => (
                    <div key={job.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${job.status === 'completed' ? 'bg-emerald-500' :
                          job.status === 'running' ? 'bg-amber-500 animate-pulse' :
                            job.status === 'failed' ? 'bg-red-500' :
                              'bg-slate-400'
                          }`} />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{job.type}</p>
                          <p className="text-xs text-slate-500">{new Date(job.created_at).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${job.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        job.status === 'running' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          job.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500">
                  Nenhum job recente encontrado
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Status (1/3) */}
        <div>
          <RealTimeStatus />
        </div>
      </div>

      {/* Sacred Footer */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-600 pt-6 border-t border-slate-200 dark:border-slate-800">
        Sacred Code: 000.369.963.1618 (∞△⚡◎φ) | EGOS v.2 Intelink Platform
      </div>
    </div>
  );
}
