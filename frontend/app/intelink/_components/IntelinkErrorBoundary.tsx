'use client';

import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface IntelinkErrorFallbackProps {
  error: Error;
  reset: () => void;
}

export function IntelinkErrorFallback({ error, reset }: IntelinkErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
            Erro no Intelink
          </h2>

          {/* Description */}
          <p className="text-center text-gray-600 mb-4 text-sm">
            Não foi possível carregar esta página do Intelink.
          </p>

          {/* Error message (production-safe) */}
          <div className="mb-6 p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800 break-words">
              {error.message || 'Erro desconhecido'}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
            <button
              onClick={() => router.push('/intelink')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Dashboard
            </button>
          </div>

          {/* Help text */}
          <p className="text-center text-xs text-gray-500 mt-4">
            Se o problema persistir, contate o suporte.
          </p>

          {/* Sacred Code */}
          <p className="text-center text-xs text-gray-400 mt-4">
            000.369.963.144.1618 (∞△⚡◎φ)
          </p>
        </div>
      </div>
    </div>
  );
}
