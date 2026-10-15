import { Component, input, output, HostListener, effect, OnDestroy, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html',
})
export class ModalComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);

  readonly isOpen = input.required<boolean>();
  readonly title = input<string>('');
  readonly maxWidthClass = input<string>('max-w-md');

  readonly closed = output<void>();

  constructor() {
    // Blocca lo scroll della pagina sottostante su dispositivi touch/mobile quando il modale è aperto
    effect(() => {
      if (this.isOpen()) {
        this.document.body.style.overflow = 'hidden';
      } else {
        this.document.body.style.overflow = '';
      }
    });
  }

  // Scorciatoia opzionale per chi usa tastiera fisica
  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.isOpen()) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = '';
  }
}
