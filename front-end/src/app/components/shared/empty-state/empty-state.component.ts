import { Component, input, output } from '@angular/core';

@Component({
  imports: [],
  standalone: true,
  selector: 'app-empty-state',
  styleUrl: './empty-state.component.scss',
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent {
  // Contenuto configurabile dello stato vuoto mostrato nelle diverse pagine.
  readonly icon = input<string>('🎨');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input<string>('');
  readonly secondaryActionLabel = input<string>('');

  // Eventi separati permettono al contenitore di gestire le azioni disponibili.
  readonly actionClicked = output<void>();
  readonly secondaryActionClicked = output<void>();
}
