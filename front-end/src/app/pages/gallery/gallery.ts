import { Component, inject, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Servizi
import { SketchService } from '../../services/sketch/sketch.service';
import { AuthService } from '../../services/auth/auth.service';

// Modelli
import { Sketch } from '../../models/api.models';

// Componenti
import { SketchCardSkeletonComponent } from '../../components/shared/sketch-card-skeleton/sketch-card-skeleton.component';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state.component';
import { ModalComponent } from '../../components/shared/modal/modal.component';

export type StatusFilter = 'ALL' | 'PLAYABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'MINE';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    FormsModule,
    SketchCardSkeletonComponent,
    EmptyStateComponent,
    ModalComponent,
  ],
  templateUrl: './gallery.html',
})
export class GalleryComponent {
  readonly sketchService = inject(SketchService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly PAGE_SIZE = 24;

  // Categorie del pool di parole
  readonly categories = [
    'Tutte',
    'Animali',
    'Oggetti',
    'Cibo',
    'Natura',
    'Luoghi',
    'Trasporti',
  ];

  // Stato dati, paginazione e caricamento
  readonly sketches = signal<Sketch[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isLoadingMore = signal<boolean>(false);
  readonly hasMorePages = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Stato filtri UI
  readonly selectedCategory = signal<string>('Tutte');
  readonly selectedStatus = signal<StatusFilter>('ALL');
  readonly authorSearch = signal<string>('');

  // Stato Modale di conferma eliminazione sketch
  readonly sketchToDelete = signal<Sketch | null>(null);
  readonly isDeleting = signal<boolean>(false);

  constructor() {
    // Ricarica automaticamente la prima pagina della galleria quando cambia Login/Logout o categoria
    effect(() => {
      const _isAuth = this.authService.isAuthenticated();
      const category = this.selectedCategory();
      this.loadSketches(category);
    });
  }

  // Filtraggio client-side istantaneo per Stato Partita e Ricerca Autore
  readonly filteredSketches = computed(() => {
    const all = this.sketches();
    const statusFilter = this.selectedStatus();
    const search = this.authorSearch().trim().toLowerCase();

    return all.filter((sketch) => {
      if (search && !sketch.author?.username.toLowerCase().includes(search)) {
        return false;
      }
      if (statusFilter === 'ALL' || !sketch.userContext) {
        return true;
      }
      if (statusFilter === 'PLAYABLE') {
        return sketch.userContext.canPlay;
      }
      if (statusFilter === 'IN_PROGRESS') {
        return sketch.userContext.status === 'IN_PROGRESS';
      }
      if (statusFilter === 'COMPLETED') {
        return sketch.userContext.status === 'WON' || sketch.userContext.status === 'LOST';
      }
      if (statusFilter === 'MINE') {
        return sketch.userContext.isAuthor;
      }
      return true;
    });
  });

  readonly hasActiveFilters = computed(
    () =>
      this.selectedCategory() !== 'Tutte' ||
      this.selectedStatus() !== 'ALL' ||
      this.authorSearch().trim().length > 0
  );

  loadSketches(category: string = this.selectedCategory()): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.sketchService.getSketches(category, undefined, this.PAGE_SIZE, 0).subscribe({
      next: (data) => {
        this.sketches.set(data);
        this.hasMorePages.set(data.length === this.PAGE_SIZE);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.description ||
            'Impossibile connettersi al server per caricare la galleria degli sketch.'
        );
      },
    });
  }

  // Carica il blocco successivo di 24 sketch (Paginazione incrementale)
  loadMoreSketches(): void {
    if (this.isLoadingMore() || !this.hasMorePages()) return;

    this.isLoadingMore.set(true);
    const currentOffset = this.sketches().length;

    this.sketchService
      .getSketches(this.selectedCategory(), undefined, this.PAGE_SIZE, currentOffset)
      .subscribe({
        next: (moreData) => {
          this.sketches.update((prev) => [...prev, ...moreData]);
          this.hasMorePages.set(moreData.length === this.PAGE_SIZE);
          this.isLoadingMore.set(false);
        },
        error: () => {
          this.isLoadingMore.set(false);
        },
      });
  }

  selectCategory(category: string): void {
    if (this.selectedCategory() !== category) {
      this.selectedCategory.set(category);
    }
  }

  setStatusFilter(status: StatusFilter): void {
    this.selectedStatus.set(status);
  }

  resetAllFilters(): void {
    this.selectedStatus.set('ALL');
    this.authorSearch.set('');
    if (this.selectedCategory() !== 'Tutte') {
      this.selectedCategory.set('Tutte');
    } else {
      this.loadSketches('Tutte');
    }
  }

  getWordSlots(length: number): number[] {
    return Array.from({ length: Math.min(length, 14) }, (_, i) => i);
  }

  onStartDrawing(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/draw']);
    } else {
      this.authService.openAuthModal('LOGIN', '/draw');
    }
  }

  onOpenSketch(sketch: Sketch): void {
    this.router.navigate(['/sketches', sketch.id]);
  }

  confirmDelete(sketch: Sketch, event: Event): void {
    event.stopPropagation();
    this.sketchToDelete.set(sketch);
  }

  cancelDelete(): void {
    this.sketchToDelete.set(null);
    this.isDeleting.set(false);
  }

  executeDelete(): void {
    const target = this.sketchToDelete();
    if (!target || this.isDeleting()) return;

    this.isDeleting.set(true);

    this.sketchService.deleteSketch(target.id).subscribe({
      next: () => {
        this.sketches.update((list) => list.filter((s) => s.id !== target.id));
        this.cancelDelete();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.errorMessage.set(
          err.error?.description || "Errore durante l'eliminazione dello sketch."
        );
        this.sketchToDelete.set(null);
      },
    });
  }
}