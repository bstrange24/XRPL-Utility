import { Injectable, signal } from '@angular/core';

export interface Toast {
     id: number;
     message: string;
     type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
     private id = 0;
     toasts = signal<Toast[]>([]);
     private isShowing = signal<boolean>(false);

     constructor() {
          console.log('🔥 ToastService instance created', Math.random());
     }

     success(message: string, duration = 2000) {
          this.show({ message, type: 'success' }, duration);
     }

     error(message: string, duration = 3000) {
          this.show({ message, type: 'error' }, duration);
     }

     info(message: string, duration = 2000) {
          this.show({ message, type: 'info' }, duration);
     }

     public show(toast: Omit<Toast, 'id'>, duration: number) {
          const id = ++this.id;
          this.toasts.update(t => [...t, { ...toast, id }]);

          setTimeout(() => {
               this.toasts.update(t => t.filter(x => x.id !== id));
          }, duration);
     }

     clear() {
          this.toasts.set([]);
     }

     removeToast(id: number) {
          // Trigger leave animation first, then remove after it finishes
          setTimeout(() => {
               this.toasts.update(toasts => toasts.filter(t => t.id !== id));
          }, 200);
     }
}
