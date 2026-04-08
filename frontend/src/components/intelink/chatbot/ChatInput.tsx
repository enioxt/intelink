
import { useRef, useState } from 'react';
import { Mic, Paperclip, Send, FileText } from 'lucide-react';
import { usePoliceHints } from '@/hooks/usePoliceHints';
import { ChatScope } from './types';
import { startMic, stopMic, submitSuggestions } from './helpers';

type Props = {
  message: string;
  setMessage: (arg: string | ((prev: string) => string)) => void;
  isLoading: boolean;
  enhanceBusy: boolean;
  handleSendNow: () => void;
  handleAddFiles: (files: FileList) => void;
  openPicker: () => void;
  autoEnhanceEnabled: boolean;
  setAutoEnhanceEnabled: (enabled: boolean) => void;
  alwaysProceed: boolean;
  setAlwaysProceed: (proceed: boolean) => void;
  scope: ChatScope;
  setScope: (scope: ChatScope) => void;
  selectedDelegacias: string[];
  setSelectedDelegacias: (ids: string[]) => void;
  delegacias: Array<{ id: string; nome: string }>;
}

export function ChatInput({
  message,
  setMessage,
  isLoading,
  enhanceBusy,
  handleSendNow,
  handleAddFiles,
  openPicker,
  autoEnhanceEnabled,
  setAutoEnhanceEnabled,
  alwaysProceed,
  setAlwaysProceed,
  scope,
  setScope,
  selectedDelegacias,
  setSelectedDelegacias,
  delegacias,
}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecRef = useRef<any>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { hints, hasError, hasWarn, applySuggestion } = usePoliceHints(message);

  return (
    <div className="p-3 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 mr-2">
          <label className="text-xs text-slate-600 dark:text-slate-300" title="Defina quais documentos o assistente pode consultar">
            Escopo:
          </label>
          <select
            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
            title="Escopo de dados&#10;&#10;• Toda a base: consulta todos os documentos&#10;• Investigação atual: apenas docs desta investigação&#10;• Delegacias: filtra por unidades policiais&#10;• Personalizado: use anexos ou seletor manual"
          >
            <option value="all" title="Consulta todos os documentos do sistema">Toda a base</option>
            <option value="investigation" title="Apenas documentos vinculados à investigação atual">Investigação atual</option>
            <option value="delegacias" title="Filtra por delegacias específicas">Delegacias selecionadas</option>
            <option value="custom" title="Use o botão Anexar ou Selecionar Docs">Personalizado (use Anexos/Selecionar Docs)</option>
          </select>
          {scope === 'delegacias' && (
            <select multiple value={selectedDelegacias} onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => o.value);
              setSelectedDelegacias(opts);
            }}
              className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 max-w-[220px]"
              title="Selecione uma ou mais delegacias&#10;&#10;Mantenha Ctrl/Cmd pressionado para seleção múltipla.&#10;O assistente consultará apenas documentos dessas unidades."
            >
              {delegacias.map(d => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
          title="Anexar arquivo"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            handleAddFiles(files);
            e.currentTarget.value = '';
          }}
          accept="image/*,application/pdf,audio/*,text/plain,application/zip,application/json"
        />
        <button
          onClick={openPicker}
          className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
          title="Selecionar documentos do repositório"
        >
          <FileText className="h-4 w-4" />
        </button>
        <button
          onMouseDown={() => startMic(setIsRecording, setMessage, mediaRecRef, mediaChunksRef)}
          onMouseUp={() => stopMic(setIsRecording, mediaRecRef)}
          onTouchStart={() => startMic(setIsRecording, setMessage, mediaRecRef, mediaChunksRef)}
          onTouchEnd={() => stopMic(setIsRecording, mediaRecRef)}
          className={`p-2 rounded-lg border ${isRecording ? 'bg-red-50 border-red-300 text-red-600' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
          title="Pressione e segure para ditar"
        >
          <Mic className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          className={`flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm border ${hasError ? 'border-red-400 focus:ring-2 focus:ring-red-400' : hasWarn ? 'border-yellow-400 focus:ring-2 focus:ring-yellow-400' : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500'}`}
          autoCorrect="off" autoCapitalize="off" autoComplete="off" spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && message.trim() && !isLoading && !enhanceBusy) {
              e.preventDefault();
              handleSendNow();
            }
          }}
        />
        <div className="flex items-center gap-3 ml-2">
          <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300" title="Auto-refinar: o agente melhora sua pergunta (clareza e contexto) antes de enviar.">
            <input type="checkbox" className="accent-blue-600" checked={autoEnhanceEnabled} onChange={(e) => setAutoEnhanceEnabled(e.target.checked)} />
            Auto-refinar
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300" title="Prosseguir mesmo com dúvidas: envia mesmo se o agente sugerir perguntas de esclarecimento.">
            <input type="checkbox" className="accent-blue-600" checked={alwaysProceed} onChange={(e) => setAlwaysProceed(e.target.checked)} />
            Prosseguir mesmo com dúvidas
          </label>
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={!message.trim() || isLoading || enhanceBusy}
          onClick={handleSendNow}
        >
          {isLoading || enhanceBusy ? (
            <span className="text-xs">Enviando...</span>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}
