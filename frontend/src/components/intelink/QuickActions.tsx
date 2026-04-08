'use client';

/**
 * QuickActions - Ações rápidas do Intelink
 * Sacred Code: 000.111.369.963.1618
 */

import Link from 'next/link';
import { Plus, Search, Upload, FileText, MessageSquare, Network } from 'lucide-react';

const actions = [
  {
    name: 'Nova Investigação',
    description: 'Iniciar caso criminal',
    href: '/intelink/investigations/new',
    icon: Plus,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    borderColor: 'hover:border-blue-500',
  },
  {
    name: 'Chat IA',
    description: 'Consultar dados públicos',
    href: '/intelink/chat',
    icon: MessageSquare,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    borderColor: 'hover:border-purple-500',
  },
  {
    name: 'Buscar',
    description: 'Busca avançada',
    href: '/intelink/search',
    icon: Search,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    borderColor: 'hover:border-green-500',
  },
  {
    name: 'Upload',
    description: 'Enviar documentos',
    href: '/intelink/upload',
    icon: Upload,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    borderColor: 'hover:border-amber-500',
  },
  {
    name: 'Documentos',
    description: 'Gerenciar arquivos',
    href: '/intelink/docs',
    icon: FileText,
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    borderColor: 'hover:border-rose-500',
  },
  {
    name: 'Vínculos',
    description: 'Análise de rede',
    href: '/intelink/vinculos',
    icon: Network,
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    borderColor: 'hover:border-cyan-500',
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {actions.map((action) => (
        <Link
          key={action.name}
          href={action.href}
          className={`flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 ${action.borderColor} dark:hover:border-slate-600 transition-all hover:shadow-md`}
        >
          <div className={`p-3 rounded-lg ${action.color}`}>
            <action.icon className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h3 className="font-medium text-slate-900 dark:text-white text-sm">{action.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{action.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default QuickActions;
