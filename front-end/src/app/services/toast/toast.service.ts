import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  type: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private nextId = 1;
  private readonly toastsSignal = signal<ToastMessage[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();

  show(text: string, type: ToastMessage['type'] = 'SUCCESS', durationMs = 3800): void {
    const id = this.nextId++;
    this.toastsSignal.update((list) => [...list, { id, type, text }]);

    setTimeout(() => {
      this.dismiss(id);
    }, durationMs);
  }

  dismiss(id: number): void {
    this.toastsSignal.update((list) => list.filter((t) => t.id !== id));
  }
}