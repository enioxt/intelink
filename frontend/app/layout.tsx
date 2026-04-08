import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Intelink - Sistema de Inteligência',
  description: 'Sistema de Inteligência Policial e Análise de Vínculos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white antialiased">
        {children}
      </body>
    </html>
  )
}
