'use client';

/**
 * Intelink Documents List - View All Documents
 * 
 * Features:
 * - List all documents with pagination
 * - Quick filters (status, type, date)
 * - Document preview
 * - Real API integration
 * - Batch actions
 */


import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Filter, 
  Download, 
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  filename: string;
  source: string;
  created_at: string;
  size: number;
  status: 'processed' | 'processing' | 'failed';
  atrian_compliant: boolean;
  ethik_score: number;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'processed' | 'processing' | 'failed'>('all');

  useEffect(() => {
    fetchDocuments();
  }, [filter]);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:8042/api/v1/intelink/docs');
      
      if (!response.ok) {
        console.warn(`API returned ${response.status}, showing empty state`);
        setDocuments([]);
        return;
      }
      
      const data = await response.json();
      
      // Map API response to our interface
      const mappedDocs = data.documents?.map((doc: any) => ({
        id: doc.id,
        title: doc.title || doc.filename || 'Sem título',
        filename: doc.filename || 'unknown',
        source: doc.source || 'upload',
        created_at: doc.created_at || new Date().toISOString(),
        size: doc.size_bytes || doc.size || 0,
        status: doc.status === 'completed' ? 'processed' : doc.status === 'processing' ? 'processing' : 'failed',
        atrian_compliant: doc.atrian_compliant ?? true,
        ethik_score: doc.ethik_score || 0,
      })) || [];
      
      setDocuments(mappedDocs);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredDocuments = documents.filter(doc => 
    filter === 'all' || doc.status === filter
  );

  async function handleDownload(id: string, filename: string) {
    try {
      const response = await fetch(`http://127.0.0.1:8042/api/v1/intelink/docs/${id}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Erro ao baixar documento');
    }
  }

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`Tem certeza que deseja deletar "${filename}"?`)) return;
    
    try {
      const response = await fetch(`http://127.0.0.1:8042/api/v1/intelink/docs/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Delete failed');
      
      // Refresh list
      fetchDocuments();
      alert('Documento deletado com sucesso');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Erro ao deletar documento');
    }
  }

  return (
    <div className="p-8">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Documentos
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 's' : ''} encontrado{filteredDocuments.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filtro:
          </span>
        </div>
        <div className="flex gap-2">
          {(['all', 'processed', 'processing', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {status === 'all' ? 'Todos' : status === 'processed' ? 'Processados' : status === 'processing' ? 'Processando' : 'Falhou'}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Carregando documentos...
            </p>
          </div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum documento encontrado
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Faça upload do seu primeiro documento para começar
          </p>
          <Link
            href="/intelink/upload"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Fazer Upload
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ATRiAN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ETHIK
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {doc.title || doc.filename}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatFileSize(doc.size)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-6 py-4">
                    <ComplianceBadge compliant={doc.atrian_compliant} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {doc.ethik_score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(doc.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/intelink/docs/${doc.id}`}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => handleDownload(doc.id, doc.filename)}
                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Deletar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: Document['status'] }) {
  const styles = {
    processed: {
      icon: <CheckCircle className="w-4 h-4" />,
      bg: 'bg-green-100 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-400',
      label: 'Processed',
    },
    processing: {
      icon: <AlertTriangle className="w-4 h-4" />,
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      text: 'text-yellow-700 dark:text-yellow-400',
      label: 'Processing',
    },
    failed: {
      icon: <XCircle className="w-4 h-4" />,
      bg: 'bg-red-100 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
      label: 'Failed',
    },
  };

  const style = styles[status];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${style.bg} ${style.text}`}>
      {style.icon}
      <span className="text-xs font-medium">{style.label}</span>
    </div>
  );
}

// Compliance Badge Component
function ComplianceBadge({ compliant }: { compliant: boolean }) {
  return compliant ? (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
      <CheckCircle className="w-4 h-4" />
      <span className="text-xs font-medium">Compliant</span>
    </div>
  ) : (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400">
      <XCircle className="w-4 h-4" />
      <span className="text-xs font-medium">Issues</span>
    </div>
  );
}

// Utility Functions
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
