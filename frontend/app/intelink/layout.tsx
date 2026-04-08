'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { FileText, Upload, Activity, Settings, LayoutDashboard, Scale, ChevronLeft, ChevronRight, Network, MessageSquare } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntelinkChatbot } from '@/components/intelink/IntelinkChatbot';

const navigation = [
  { name: 'Dashboard', href: '/intelink', icon: LayoutDashboard },
  { name: 'Investigations', href: '/intelink/investigations', icon: Scale },
  { name: 'Chat IA', href: '/intelink/chat', icon: MessageSquare },
  { name: 'Documentos', href: '/intelink/docs', icon: FileText },
  { name: 'Vínculos', href: '/intelink/vinculos', icon: Network },
  { name: 'Upload', href: '/intelink/upload', icon: Upload },
  { name: 'Jobs', href: '/intelink/jobs', icon: Activity },
  { name: 'Configurações', href: '/intelink/settings', icon: Settings },
];

export default function IntelinkLayout({ children }: { children: ReactNode }) {
  // QueryClient instance (per-component to avoid sharing between requests)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  // Sidebar collapse state with localStorage
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('intelink.sidebar.collapsed');
      return saved === 'true';
    }
    return false;
  });

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('intelink.sidebar.collapsed', String(newState));
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      {/* Test Mode Banner */}
      <div className="bg-yellow-100 dark:bg-yellow-900 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 text-center text-sm">
        ⚠️ <strong>Modo Teste</strong> - Autenticação desabilitada temporariamente
      </div>

      <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
        {/* Sidebar */}
        <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 relative flex flex-col`}>
          {/* Logo */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            {!collapsed && (
              <>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Intelink
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Sistema de Inteligência
                </p>
              </>
            )}
            {collapsed && (
              <div className="text-center">
                <Scale className="h-6 w-6 text-slate-900 dark:text-white mx-auto" />
              </div>
            )}
          </div>

          {/* Toggle Button */}
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors z-10 shadow-md"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            )}
          </button>

          {/* Navigation */}
          <nav className="p-4 space-y-1 flex-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 mt-auto">
            {!collapsed && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Intelink v2.0 • Sistema de Inteligência Policial
              </p>
            )}
            {collapsed && (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                IL
              </p>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Chatbot */}
      <IntelinkChatbot />
    </QueryClientProvider>
  );
}
