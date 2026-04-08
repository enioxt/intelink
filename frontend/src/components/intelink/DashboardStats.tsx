'use client';

import { useEffect, useState } from 'react';
import { FileText, Users, Activity, Scale, Building2 } from 'lucide-react';

interface Stats {
  documents: number;
  entities: number;
  cross_refs: number;
  investigations?: {
    total: number;
    by_source: Record<string, number>;
  };
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('http://localhost:8042/api/v1/intelink/stats');
        const result = await response.json();
        if (result.ok && result.stats) {
          setStats(result.stats);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, []);
  
  if (loading) {
    return <div className="text-slate-600">Carregando estatísticas...</div>;
  }
  
  const statCards = [
    {
      title: 'Investigações',
      value: stats?.investigations?.total || 0,
      icon: Scale,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950',
    },
    {
      title: 'Documentos',
      value: stats?.documents || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Entidades',
      value: stats?.entities || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      title: 'Referências Cruzadas',
      value: stats?.cross_refs || 0,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
  ];
  
  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold mt-2 text-slate-900 dark:text-slate-100">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Investigations by Source */}
      {stats?.investigations?.by_source && Object.keys(stats.investigations.by_source).length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Investigações por Origem
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.investigations.by_source).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {source}
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
