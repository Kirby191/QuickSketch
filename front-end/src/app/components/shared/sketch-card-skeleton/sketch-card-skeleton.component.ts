import { Component, input, computed } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-sketch-card-skeleton',
  standalone: true,
  styleUrl: './sketch-card-skeleton.component.scss',
  templateUrl: './sketch-card-skeleton.component.html',
})
export class SketchCardSkeletonComponent {
  readonly count = input<number>(6);
  readonly itemsArray = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
