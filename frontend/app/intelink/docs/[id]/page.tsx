'use client';

/**
 * Intelink Document Details Page
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Features:
 * - Full document content display
 * - ATRiAN issues breakdown
 * - ETHIK score details
 * - Entity and relationship viewer
 * - Download and delete actions
 */


import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Users,
  Network,
  TrendingUp
} from 'lucide-react';
import { useDocuments } from '@/hooks/useIntelink';
import type { Document, ATRiANIssue } from '@/types/intelink';

export default function DocumentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { getDocument, deleteDocument } = useDocuments();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [params.id]);

  async function loadDocument() {
    if (typeof params.id !== 'string') return;

    setLoading(true);
    const doc = await getDocument(params.id);
    setDocument(doc);
    setLoading(false);
  }

  async function handleDelete() {
    if (!document || !confirm('Are you sure you want to delete this document?')) return;

    setDeleting(true);
    const success = await deleteDocument(document.id);
    if (success) {
      router.push('/intelink/documents');
    }
    setDeleting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Document not found
          </h3>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {document.title || document.filename}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {formatDate(document.created_at)} • {document.size ? formatFileSize(document.size) : 'Unknown size'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Content
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {document.content}
              </p>
            </div>
          </div>

          {/* ATRiAN Issues */}
          {document.atrian_issues && document.atrian_issues.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                ATRiAN Issues
              </h2>
              <div className="space-y-3">
                {document.atrian_issues.map((issue, index) => (
                  <IssueCard key={index} issue={issue} />
                ))}
              </div>
            </div>
          )}

          {/* Entities */}
          {document.entities && document.entities.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Entities ({document.entities.length})
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {document.entities.map((entity) => (
                  <div
                    key={entity.id}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {entity.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {entity.type} • {entity.confidence ? (entity.confidence * 100).toFixed(0) : 0}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Status</h3>
            <div className="space-y-4">
              <StatusRow label="Processing" value={document.status || 'unknown'} status={document.status || 'unknown'} />
              <StatusRow
                label="ATRiAN"
                value={document.atrian_compliant ? 'Compliant' : 'Issues'}
                status={document.atrian_compliant ? 'processed' : 'failed'}
              />
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Source</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {document.source}
                </p>
              </div>
            </div>
          </div>

          {/* ETHIK Score Card */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              ETHIK Score
            </h3>
            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                {document.ethik_score ? document.ethik_score.toFixed(1) : 'N/A'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Baseline: F₁₂ = {document.ethik_baseline || 144}
              </p>
            </div>
            <div className="space-y-2">
              <ScoreRow
                label="Current"
                value={document.ethik_score || 0}
                color="green"
              />
              <ScoreRow
                label="Baseline"
                value={document.ethik_baseline || 144}
                color="gray"
              />
              <ScoreRow
                label="Delta"
                value={document.ethik_delta || 0}
                color={(document.ethik_delta || 0) >= 0 ? 'green' : 'red'}
              />
            </div>
          </div>

          {/* Metadata */}
          {document.metadata && Object.keys(document.metadata).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Metadata</h3>
              <div className="space-y-2">
                {Object.entries(document.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Issue Card Component
function IssueCard({ issue }: { issue: ATRiANIssue }) {
  const styles = {
    critical: {
      icon: <XCircle className="w-5 h-5" />,
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-400',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-700 dark:text-yellow-400',
    },
    info: {
      icon: <CheckCircle className="w-5 h-5" />,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-400',
    },
  };

  // Map severity to style key
  const severityMap: Record<string, keyof typeof styles> = {
    critical: 'critical',
    high: 'warning',
    medium: 'warning',
    low: 'info',
  };

  const style = styles[severityMap[issue.severity] || 'info'];

  return (
    <div className={`p-4 rounded-lg border ${style.bg} ${style.border}`}>
      <div className="flex items-start gap-3">
        <div className={style.text}>{style.icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className={`font-medium ${style.text}`}>
              {(issue.rule || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
            <span className={`text-xs px-2 py-1 rounded ${style.bg} ${style.text}`}>
              {issue.severity}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {issue.message || 'No message'}
          </p>
          {issue.suggestion && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              💡 {issue.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Status Row Component
function StatusRow({
  label,
  value,
  status
}: {
  label: string;
  value: string;
  status: string;
}) {
  const statusColors = {
    processed: 'text-green-600 dark:text-green-400',
    processing: 'text-yellow-600 dark:text-yellow-400',
    failed: 'text-red-600 dark:text-red-400',
    pending: 'text-gray-600 dark:text-gray-400',
  };

  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`font-medium capitalize ${statusColors[status as keyof typeof statusColors] || statusColors.pending}`}>
        {value}
      </span>
    </div>
  );
}

// Score Row Component
function ScoreRow({
  label,
  value,
  color
}: {
  label: string;
  value: number;
  color: 'green' | 'gray' | 'red';
}) {
  const colors = {
    green: 'text-green-600 dark:text-green-400',
    gray: 'text-gray-600 dark:text-gray-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`font-mono font-bold ${colors[color]}`}>
        {value >= 0 ? '+' : ''}{value.toFixed(1)}
      </span>
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
