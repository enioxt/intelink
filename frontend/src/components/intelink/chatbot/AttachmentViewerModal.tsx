
import { X, CheckCircle, XCircle } from 'lucide-react';
import { StagedFile } from './types';
import { fileIconByType, bytes } from './helpers';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  staged: StagedFile[];
  setStaged: React.Dispatch<React.SetStateAction<StagedFile[]>>;
}

export function AttachmentViewerModal({ isOpen, onClose, staged, setStaged }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl w-[min(720px,92vw)] max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h4 className="font-semibold text-slate-900 dark:text-white">Anexos ({staged.length})</h4>
          <button className="text-slate-500 hover:text-slate-900" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 overflow-y-auto flex-1 space-y-2">
          {staged.map((f) => (
            <div key={f.id} className="flex items-start gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div className="mt-0.5 text-slate-600 dark:text-slate-400">{fileIconByType(f.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white truncate">{f.name}</span>
                  <span className="text-xs text-slate-500">{bytes(f.size)}</span>
                  {f.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {f.status === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
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
              <button onClick={() => setStaged(prev => prev.filter(sf => sf.id !== f.id))} className="ml-1 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Remover">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Fechar</button>
        </div>
      </div>
    </div>
  )
}
