import { Component, input, output } from '@angular/core';

@Component({
  imports: [],
  standalone: true,
  selector: 'app-empty-state',
  styleUrl: './empty-state.component.scss',
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent {
  readonly icon = input<string>('🎨');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input<string>('');
  readonly secondaryActionLabel = input<string>('');

  readonly actionClicked = output<void>();
  readonly secondaryActionClicked = output<void>();
}
