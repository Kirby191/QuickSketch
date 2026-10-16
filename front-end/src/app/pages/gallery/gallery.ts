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

  // Stato dati e caricamento
  readonly sketches = signal<Sketch[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  // Stato filtri UI
  readonly selectedCategory = signal<string>('Tutte');
  readonly selectedStatus = signal<StatusFilter>('ALL');
  readonly authorSearch = signal<string>('');

  // Stato Modale di conferma eliminazione sketch (sostituisce window.confirm nativo)
  readonly sketchToDelete = signal<Sketch | null>(null);
  readonly isDeleting = signal<boolean>(false);

  constructor() {
    // Ricarica automaticamente la galleria quando cambia lo stato di autenticazione (Login/Logout)
    // o quando l'utente cambia la categoria selezionata
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
      // 1. Filtro per nome autore
      if (search && !sketch.author?.username.toLowerCase().includes(search)) {
        return false;
      }

      // 2. Filtro per stato della sfida (se attivo e utente loggato)
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

  // Verifica se ci sono filtri attivi (utile per mostrare l'Empty State "Azzera filtri")
  readonly hasActiveFilters = computed(
    () =>
      this.selectedCategory() !== 'Tutte' ||
      this.selectedStatus() !== 'ALL' ||
      this.authorSearch().trim().length > 0
  );

  loadSketches(category: string = this.selectedCategory()): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.sketchService.getSketches(category).subscribe({
      next: (data) => {
        this.sketches.set(data);
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

  // Genera un array di indici per disegnare i trattini della parola segreta (_ _ _ _ _)
  getWordSlots(length: number): number[] {
    return Array.from({ length: Math.min(length, 14) }, (_, i) => i);
  }

  // Navigazione verso il tavolo da disegno o apertura modale se ospite
  onStartDrawing(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/draw']);
    } else {
      this.authService.openAuthModal('LOGIN', '/draw');
    }
  }

  // Navigazione verso la sfida dello sketch
  onOpenSketch(sketch: Sketch): void {
    this.router.navigate(['/sketches', sketch.id]);
  }

  // Gestione eliminazione Sketch con modale di conferma
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
          err.error?.description || 'Errore durante l\'eliminazione dello sketch.'
        );
        this.sketchToDelete.set(null);
      },
    });
  }
}