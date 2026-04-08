'use client';
import { Trash2 } from 'lucide-react';

interface DeleteButtonProps {
  onDelete: () => void;
  label?: string;
  disabled?: boolean;
}

export function DeleteButton({ onDelete, label = 'Excluir', disabled = false }: DeleteButtonProps) {
  return (
    <button
      onClick={onDelete}
      disabled={disabled}
      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
    >
      <Trash2 className="w-4 h-4" />
      {label}
    </button>
  );
}

export default DeleteButton;
