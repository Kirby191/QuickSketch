import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StatsService } from '../../services/stats/stats.service';
import { WordService } from '../../services/word/word.service';
import { AuthService } from '../../services/auth/auth.service';
import { UserStatsResponse } from '../../models/api.models';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, RouterLink, EmptyStateComponent],
  templateUrl: './profile.html',
})
export class ProfileComponent implements OnInit {
  private readonly statsService = inject(StatsService);
  private readonly wordService = inject(WordService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Stato Dati Statistiche Personali
  readonly stats = signal<UserStatsResponse | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  // Stato Pannello Admin (Aggiunta / Rimozione Parole dal Pool)
  readonly categories = [
    'Animali',
    'Oggetti',
    'Cibo',
    'Natura',
    'Luoghi',
    'Trasporti',
    'Generale',
  ];
  readonly newWordText = signal<string>('');
  readonly newWordCategory = signal<string>('Oggetti');
  readonly newWordDifficulty = signal<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  readonly wordToDeleteText = signal<string>('');

  readonly isAdminSubmitting = signal<boolean>(false);
  readonly adminFeedback = signal<{
    type: 'SUCCESS' | 'ERROR';
    message: string;
  } | null>(null);

  readonly canAddWord = computed(
    () =>
      this.newWordText().trim().length >= 2 && !this.isAdminSubmitting()
  );
  readonly canDeleteWord = computed(
    () =>
      this.wordToDeleteText().trim().length >= 2 && !this.isAdminSubmitting()
  );

  ngOnInit(): void {
    this.loadMyStats();
  }

  loadMyStats(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.statsService.getMyStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.description ||
            'Impossibile caricare le tue statistiche personali.'
        );
      },
    });
  }

  // Azione Admin 1: Aggiunge una nuova parola al pool
  onAddWord(): void {
    if (!this.canAddWord()) return;

    this.isAdminSubmitting.set(true);
    this.adminFeedback.set(null);

    const text = this.newWordText().trim().toLowerCase();
    const category = this.newWordCategory();
    const difficulty = this.newWordDifficulty();

    this.wordService.addWord(text, category, difficulty).subscribe({
      next: (res) => {
        this.isAdminSubmitting.set(false);
        this.newWordText.set('');
        this.adminFeedback.set({
          type: 'SUCCESS',
          message:
            res.message ||
            `Parola "${text}" (${category}) aggiunta con successo al dizionario!`,
        });
      },
      error: (err) => {
        this.isAdminSubmitting.set(false);
        this.adminFeedback.set({
          type: 'ERROR',
          message:
            err.error?.description ||
            err.error?.error ||
            'Errore durante l\'aggiunta della parola.',
        });
      },
    });
  }

  // Azione Admin 2: Rimuove una parola dal pool tramite il suo nome
  onDeleteWord(): void {
    if (!this.canDeleteWord()) return;

    this.isAdminSubmitting.set(true);
    this.adminFeedback.set(null);

    const targetWord = this.wordToDeleteText().trim().toLowerCase();

    this.wordService.deleteWord(targetWord).subscribe({
      next: (res) => {
        this.isAdminSubmitting.set(false);
        this.wordToDeleteText.set('');
        this.adminFeedback.set({
          type: 'SUCCESS',
          message:
            res.message ||
            `Parola "${targetWord}" rimossa dal dizionario.`,
        });
      },
      error: (err) => {
        this.isAdminSubmitting.set(false);
        this.adminFeedback.set({
          type: 'ERROR',
          message:
            err.error?.description ||
            err.error?.error ||
            'Parola non trovata nel dizionario.',
        });
      },
    });
  }

  goToGallery(): void {
    this.router.navigate(['/']);
  }

  goToDraw(): void {
    this.router.navigate(['/draw']);
  }
}
