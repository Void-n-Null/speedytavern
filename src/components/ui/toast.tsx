/**
 * Lightweight toast notification system
 * No external deps - just React + Zustand
 */

import { create } from 'zustand';
import { useEffect } from 'react';
import { cn } from '../../lib/utils';
import { X, Check, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  add: (message: string, type?: ToastType, duration?: number) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type = 'info', duration = 3000) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }));
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Convenience functions
export const toast = {
  success: (msg: string) => useToastStore.getState().add(msg, 'success'),
  error: (msg: string) => useToastStore.getState().add(msg, 'error'),
  warning: (msg: string) => useToastStore.getState().add(msg, 'warning'),
  info: (msg: string) => useToastStore.getState().add(msg, 'info'),
};

const icons: Record<ToastType, typeof Check> = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
};

const colors: Record<ToastType, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: () => void }) {
  const Icon = icons[t.type];
  
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border shadow-lg',
        'animate-in slide-in-from-right-full fade-in duration-200',
        colors[t.type]
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">{t.message}</span>
      <button
        onClick={onRemove}
        className="ml-2 p-0.5 rounded hover:bg-white/10 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore();
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => remove(t.id)} />
      ))}
    </div>
  );
}
