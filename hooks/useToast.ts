import { toast as showToast } from '@/components/intelink/Toast';

export function useToast() {
  return {
    success: (title: string, message?: string, duration?: number) => 
      showToast('success', title, message, duration),
    error: (title: string, message?: string, duration?: number) => 
      showToast('error', title, message, duration),
    info: (title: string, message?: string, duration?: number) => 
      showToast('info', title, message, duration),
    warning: (title: string, message?: string, duration?: number) => 
      showToast('warning', title, message, duration),
  };
}
