
import { useState } from 'react';
import { X } from 'lucide-react';

type Document = {
  id: string;
  title?: string;
  filename?: string;
  mime_type?: string;
  [key: string]: any;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  docs: Document[];
  onSearch: (query: string) => void;
  onConfirm: (selected: Record<string, boolean>) => void;
}

export function DocumentPickerModal({ isOpen, onClose, isLoading, docs, onSearch, onConfirm }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const handleConfirm = () => {
    onConfirm(selected);
    setSelected({});
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl w-[min(680px,90vw)] max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h4 className="font-semibold text-slate-900 dark:text-white">Selecionar Documentos</h4>
          <button className="text-slate-500 hover:text-slate-900" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 flex items-center gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por título" className="flex-1 px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          <button onClick={() => onSearch(query)} className="px-3 py-2 text-sm rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600">Buscar</button>
          <label className="ml-2 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <input type="checkbox" onChange={(e) => {
              const checked = e.target.checked; if (!checked) { setSelected({}); return; }
              const all: Record<string, boolean> = {}; docs.forEach((d: any) => { all[d.id] = true; }); setSelected(all);
            }} /> Selecionar todos
          </label>
        </div>
        <div className="px-3 pb-3 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-slate-500">Carregando...</div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {docs.map((d: any) => (
                <label key={d.id} className="flex items-center gap-3 py-2">
                  <input type="checkbox" checked={!!selected[d.id]} onChange={(e) => setSelected(prev => ({ ...prev, [d.id]: e.target.checked }))} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-900 dark:text-white truncate">{d.title || d.filename || d.id}</div>
                    <div className="text-xs text-slate-500">{d.mime_type || 'arquivo'}</div>
                  </div>
                </label>
              ))}
              {docs.length === 0 && <div className="p-6 text-center text-sm text-slate-500">Sem resultados</div>}
            </div>
          )}
        </div>
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded border">Cancelar</button>
          <button onClick={handleConfirm} className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Adicionar</button>
        </div>
      </div>
    </div>
  )
}
