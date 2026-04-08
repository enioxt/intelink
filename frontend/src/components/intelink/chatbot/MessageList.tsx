
import { RAGMessage } from '@/hooks/useRAGChatbot';
import { renderAssistant } from './helpers';

type Props = {
  messages: RAGMessage[];
}

export function MessageList({ messages }: Props) {
  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-3">
      {messages.length === 0 ? (
        <div className="text-sm text-slate-600 dark:text-slate-400 text-center">
          Digite uma mensagem para iniciar a conversa.
        </div>
      ) : (
        messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-lg ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600'}`}>
              {m.role === 'assistant' ? renderAssistant(m.content) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
