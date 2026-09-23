import { useState, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  variant?: 'destructive' | 'default';
}

let memoryState: Toast[] = [];
let listeners: Array<(state: Toast[]) => void> = [];

function notify() {
  listeners.forEach((listener) => listener(memoryState));
}

export function toast({ title, description, type = 'info', variant }: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).substring(2, 9);
  const actualType = variant === 'destructive' ? 'error' : type;
  const newToast = { id, title, description, type: actualType, variant };
  memoryState = [...memoryState, newToast];
  notify();

  setTimeout(() => {
    memoryState = memoryState.filter((t) => t.id !== id);
    notify();
  }, 3000);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryState);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  return { toasts, toast };
}
