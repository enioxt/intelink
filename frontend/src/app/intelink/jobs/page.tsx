'use client';

/**
 * Intelink Jobs Monitoring Page
 * 
 * Features:
 * - Background job monitoring
 * - Real-time status updates
 * - Progress tracking
 * - Job history
 * - Error logs
 */


import { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  RefreshCw,
  AlertCircle,
  Eye,
  Trash2,
  PlayCircle
} from 'lucide-react';
import { useJobs } from '@/hooks/useIntelink';
import type { Job, JobStatus } from '@/types/intelink';

export default function JobsPage() {
  const { jobs: rawJobs, loading, error, refetch } = useJobs();
  const jobs: Job[] = rawJobs ?? [];
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const filteredJobs = filter === 'all'
    ? jobs
    : jobs.filter(job => job.status === filter);

  const stats = {
    pending: jobs.filter(j => j.status === 'pending').length,
    running: jobs.filter(j => j.status === 'running').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Background Jobs
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and manage background processing tasks
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Auto-refresh (5s)
            </span>
          </label>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={<Clock className="w-5 h-5" />}
          color="gray"
        />
        <StatCard
          label="Running"
          value={stats.running}
          icon={<Loader className="w-5 h-5 animate-spin" />}
          color="blue"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          icon={<XCircle className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled}
          icon={<AlertCircle className="w-5 h-5" />}
          color="yellow"
        />
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2">
        {(['all', 'pending', 'running', 'completed', 'failed', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && stats[status] > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {stats[status]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {loading && jobs.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading jobs...</p>
          </div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No {filter !== 'all' ? filter : ''} jobs found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Jobs will appear here when background processing is active
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onView={() => setSelectedJob(job)}
            />
          ))}
        </div>
      )}

      {/* Job Details Modal */}
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  color
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'gray' | 'blue' | 'green' | 'red' | 'yellow';
}) {
  const colorClasses = {
    gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

// Job Card Component
function JobCard({
  job,
  onView
}: {
  job: Job;
  onView: () => void;
}) {
  const progress = (job.total ?? 0) > 0 ? ((job.progress ?? 0) / job.total!) * 100 : 0;

  return (
    <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <StatusIcon status={job.status} />
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">
                {formatJobType(job.type)}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ID: {job.id.substring(0, 8)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={job.status} />
          <button
            onClick={onView}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {job.status === 'running' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">
              Progress: {job.progress}/{job.total}
            </span>
            <span className="font-mono text-gray-900 dark:text-white">
              {progress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <span>Created: {formatTimestamp(job.created_at)}</span>
        {job.started_at && (
          <span>Started: {formatTimestamp(job.started_at)}</span>
        )}
        {job.completed_at && (
          <span>Completed: {formatTimestamp(job.completed_at)}</span>
        )}
        {job.started_at && job.completed_at && (
          <span className="font-medium text-blue-600 dark:text-blue-400">
            Duration: {calculateDuration(job.started_at, job.completed_at)}
          </span>
        )}
      </div>

      {/* Error Message */}
      {job.error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
          <strong>Error:</strong> {job.error}
        </div>
      )}
    </div>
  );
}

// Job Details Modal
function JobDetailsModal({
  job,
  onClose
}: {
  job: Job;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Job Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          <div className="space-y-4">
            <DetailRow label="Job ID" value={job.id} />
            <DetailRow label="Type" value={formatJobType(job.type)} />
            <DetailRow
              label="Status"
              value={<StatusBadge status={job.status} />}
            />
            <DetailRow
              label="Progress"
              value={`${job.progress ?? 0}/${job.total ?? 0} (${(((job.progress ?? 0) / (job.total || 1)) * 100).toFixed(1)}%)`}
            />
            <DetailRow label="Created" value={new Date(job.created_at).toLocaleString()} />
            {job.started_at && (
              <DetailRow label="Started" value={new Date(job.started_at).toLocaleString()} />
            )}
            {job.completed_at && (
              <DetailRow label="Completed" value={new Date(job.completed_at).toLocaleString()} />
            )}
            {job.started_at && job.completed_at && (
              <DetailRow
                label="Duration"
                value={calculateDuration(job.started_at, job.completed_at)}
              />
            )}

            {job.error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 className="font-bold text-red-900 dark:text-red-100 mb-2">Error</h4>
                <p className="text-sm text-red-700 dark:text-red-400 font-mono whitespace-pre-wrap">
                  {job.error}
                </p>
              </div>
            )}

            {job.result && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <h4 className="font-bold text-green-900 dark:text-green-100 mb-2">Result</h4>
                <pre className="text-sm text-green-700 dark:text-green-400 font-mono whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(job.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Detail Row Component
function DetailRow({
  label,
  value
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {label}:
      </span>
      <span className="text-sm text-gray-900 dark:text-white text-right">
        {value}
      </span>
    </div>
  );
}

// Status Icon Component
function StatusIcon({ status }: { status: JobStatus }) {
  const icons = {
    pending: <Clock className="w-5 h-5 text-gray-500" />,
    running: <Loader className="w-5 h-5 text-blue-500 animate-spin" />,
    completed: <CheckCircle className="w-5 h-5 text-green-500" />,
    failed: <XCircle className="w-5 h-5 text-red-500" />,
    cancelled: <AlertCircle className="w-5 h-5 text-yellow-500" />,
  };
  return icons[status];
}

// Status Badge Component
function StatusBadge({ status }: { status: JobStatus }) {
  const styles = {
    pending: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    running: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    completed: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    failed: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    cancelled: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
  };

  return (
    <div className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </div>
  );
}

// Utility Functions
function formatJobType(type: string): string {
  return type.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return date.toLocaleDateString();
}

function calculateDuration(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
