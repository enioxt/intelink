'use client';

/**
 * Investigation Detail Page
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Full investigation dashboard with:
 * - Case information
 * - Evidence (documents)
 * - Chatbot (RAG)
 * - Graph visualization
 */


import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Network,
  Users,
  Calendar,
  Scale,
  AlertCircle,
  Loader2,
  ExternalLink,
  Plus,
} from 'lucide-react';
import {
  useInvestigation,
  useInvestigationDocuments,
  useLinkDocumentToInvestigation,
} from '@/hooks/useInvestigations';
import { useRAGChatbot } from '@/hooks/useRAGChatbot';

type TabType = 'evidence' | 'chat' | 'graph';

export default function InvestigationDetailPage() {
  const params = useParams();
  const investigationId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('evidence');

  const { data: investigation, isLoading, error } = useInvestigation(investigationId);
  const { data: documentsData } = useInvestigationDocuments(investigationId);

  const documents = documentsData?.documents || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300">
              Erro ao carregar investigação: {error?.message || 'Não encontrada'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/intelink/investigations"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Investigações
        </Link>

        {/* Investigation Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Scale className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {investigation.title}
                </h1>
              </div>
              
              {investigation.case_number && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Caso: <span className="font-mono">{investigation.case_number}</span>
                </p>
              )}

              <p className="text-gray-700 dark:text-gray-300 mt-2">
                {investigation.description}
              </p>
            </div>

            <div className="flex gap-2">
              <StatusBadge status={investigation.status} />
              <PriorityBadge priority={investigation.priority} />
            </div>
          </div>

          {/* Metadata Row */}
          <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{investigation.team_members.length} membros</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>{investigation.document_count} documentos</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Criado em {new Date(investigation.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
            {investigation.template_id && (
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs">
                  Template: {investigation.template_id}
                </span>
              </div>
            )}
          </div>

          {/* Team Members */}
          {investigation.team_members.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Equipe:
              </h3>
              <div className="flex flex-wrap gap-2">
                {investigation.team_members.map((email: string) => (
                  <span
                    key={email}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                  >
                    {email}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <TabButton
              active={activeTab === 'evidence'}
              onClick={() => setActiveTab('evidence')}
              icon={<FileText className="w-5 h-5" />}
            >
              Evidências ({documents.length})
            </TabButton>
            <TabButton
              active={activeTab === 'chat'}
              onClick={() => setActiveTab('chat')}
              icon={<MessageSquare className="w-5 h-5" />}
            >
              Chat (RAG)
            </TabButton>
            <TabButton
              active={activeTab === 'graph'}
              onClick={() => setActiveTab('graph')}
              icon={<Network className="w-5 h-5" />}
            >
              Grafo
            </TabButton>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {activeTab === 'evidence' && (
          <EvidenceTab investigationId={investigationId} documents={documents} />
        )}
        {activeTab === 'chat' && (
          <ChatTab investigationId={investigationId} investigation={investigation} />
        )}
        {activeTab === 'graph' && (
          <GraphTab investigationId={investigationId} />
        )}
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
        ${
          active
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
        }
      `}
    >
      {icon}
      {children}
    </button>
  );
}

// Evidence Tab
function EvidenceTab({
  investigationId,
  documents,
}: {
  investigationId: string;
  documents: any[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Documentos e Evidências
        </h2>
        <Link
          href="/intelink/upload"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar Evidência
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum documento vinculado ainda.</p>
          <p className="text-sm mt-1">Faça upload de evidências e vincule-as a esta investigação.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc: any) => (
            <div
              key={doc.link_id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {doc.filename}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs">
                    {doc.role}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Adicionado por {doc.added_by} em {new Date(doc.added_at).toLocaleDateString('pt-BR')}
                </div>
                {doc.notes && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {doc.notes}
                  </div>
                )}
              </div>
              <Link
                href={`/intelink/documents?id=${doc.document_id}`}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Chat Tab with RAG
function ChatTab({
  investigationId,
  investigation,
}: {
  investigationId: string;
  investigation: any;
}) {
  const { messages, sendMessage, isLoading } = useRAGChatbot();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // Add investigation context to message
    const contextualMessage = `[Investigação: ${investigation.case_number || investigationId}] ${input}`;
    await sendMessage(contextualMessage);
    setInput('');
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Assistente de Investigação (RAG)
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Converse com IA sobre documentos e evidências desta investigação.
        </p>
      </div>

      {/* Chat Messages */}
      <div className="h-96 overflow-y-auto mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-sm mt-1">Faça perguntas sobre os documentos vinculados.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Digite sua pergunta..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
        >
          {isLoading ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}

// Graph Tab (Placeholder)
function GraphTab({ investigationId }: { investigationId: string }) {
  return (
    <div className="text-center py-12">
      <Network className="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Grafo de Relacionamentos
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Visualização de entidades e conexões desta investigação.
      </p>
      <Link
        href={`/intelink/graph?investigation=${investigationId}`}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Abrir Grafo Completo
      </Link>
    </div>
  );
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  const labels: Record<string, string> = {
    active: 'Ativo',
    under_review: 'Em Revisão',
    closed: 'Fechado',
    archived: 'Arquivado',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
      {labels[status] || status}
    </span>
  );
}

// Priority Badge
function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const labels: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[priority] || styles.medium}`}>
      {labels[priority] || priority}
    </span>
  );
}
