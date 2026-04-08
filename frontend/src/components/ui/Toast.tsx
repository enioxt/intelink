'use client';

import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onClose(toast.id), 300);
      }, toast.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onClose]);

  const styles = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />,
      text: 'text-green-900 dark:text-green-100',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
      text: 'text-red-900 dark:text-red-100',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      text: 'text-blue-900 dark:text-blue-100',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
      text: 'text-yellow-900 dark:text-yellow-100',
    },
  };

  const style = styles[toast.type];

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-lg p-4 shadow-lg transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
    >
      <div className="flex items-start gap-3">
        {style.icon}
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${style.text}`}>{toast.title}</p>
          {toast.message && (
            <p className={`text-sm mt-1 ${style.text} opacity-90`}>{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => onClose(toast.id), 300);
          }}
          className={`${style.text} opacity-60 hover:opacity-100 transition-opacity`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Global toast state management
let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

export function showToast(type: ToastType, title: string, message?: string, duration?: number) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const newToast: Toast = { id, type, title, message, duration };
  toasts = [...toasts, newToast];
  toastListeners.forEach(listener => listener(toasts));
}

export function ToastContainer() {
  const [activeToasts, setActiveToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setActiveToasts(newToasts);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const removeToast = (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    setActiveToasts(toasts);
  };

  if (activeToasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <div className="pointer-events-auto space-y-2">
        {activeToasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
}
