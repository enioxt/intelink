
import { X, CheckCircle, XCircle } from 'lucide-react';
import { StagedFile } from './types';
import { fileIconByType, bytes } from './helpers';

type Props = {
  staged: StagedFile[];
  setStaged: React.Dispatch<React.SetStateAction<StagedFile[]>>;
  onOpenAll: () => void;
}

export function AttachmentManager({ staged, setStaged, onOpenAll }: Props) {
  if (staged.length === 0) return null;

  return (
    <div className="px-3 pt-3 border-t border-slate-200 dark:border-slate-700">
      <div className="space-y-2">
        {(staged.slice(0, 3)).map((f) => (
          <div key={f.id} className="flex items-start gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div className="mt-0.5 text-slate-600 dark:text-slate-400">{fileIconByType(f.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-900 dark:text-white truncate">{f.name}</span>
                <span className="text-xs text-slate-500">{bytes(f.size)}</span>
                {f.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                {f.status === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                {f.status === 'uploading' && <span className="text-xs text-slate-500">{f.progress}%</span>}
                <button
                  onClick={() => setStaged(prev => prev.filter(sf => sf.id !== f.id))}
                  className="ml-1 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                  title="Remover anexo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {f.status === 'uploading' && (
                <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded mt-1 overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${f.progress}%` }} />
                </div>
              )}
              <input
                type="text"
                value={f.description}
                onChange={(e) => setStaged(prev => prev.map(sf => sf.id === f.id ? { ...sf, description: e.target.value } : sf))}
                placeholder="Descreva o objetivo deste arquivo (opcional)"
                className="mt-2 w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        ))}
        {staged.length > 3 && (
          <button onClick={onOpenAll} className="text-xs px-2 py-1 rounded border bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            Ver todos (+{staged.length - 3})
          </button>
        )}
      </div>
    </div>
  )
}
