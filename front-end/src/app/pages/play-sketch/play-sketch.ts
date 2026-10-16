import {
  Component,
  inject,
  input,
  signal,
  computed,
  effect,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SketchService } from '../../services/sketch/sketch.service';
import { AuthService } from '../../services/auth/auth.service';
import { Sketch } from '../../models/api.models';
import { ModalComponent } from '../../components/shared/modal/modal.component';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state.component';

@Component({
  selector: 'app-play-sketch',
  standalone: true,
  imports: [FormsModule, RouterLink, ModalComponent, EmptyStateComponent],
  templateUrl: './play-sketch.html',
  styleUrl: './play-sketch.scss',
})
export class PlaySketchComponent {
  private readonly sketchService = inject(SketchService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Parametro :id letto dalla rotta /sketches/:id grazie a withComponentInputBinding()
  readonly id = input.required<string>();

  readonly MAX_ATTEMPTS = 10;

  // Stato dello Sketch e caricamento
  readonly sketch = signal<Sketch | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  // Stato del form di tentativo
  readonly currentGuess = signal<string>('');
  readonly isSubmitting = signal<boolean>(false);
  readonly feedbackBanner = signal<{
    type: 'SUCCESS' | 'WARNING' | 'ERROR';
    text: string;
  } | null>(null);

  // Memorizza quali parole tentate in questa sessione sono andate "molto vicine" alla soluzione
  readonly closeWordsSet = signal<Set<string>>(new Set());

  // Stato Modale di Fine Partita (Vittoria o Esaurimento dei 10 tentativi)
  readonly isResultModalOpen = signal<boolean>(false);

  constructor() {
    // Ricarica lo sketch quando cambia l'ID nell'URL o quando cambia lo stato di autenticazione
    effect(() => {
      const rawId = this.id();
      const _isAuth = this.authService.isAuthenticated();
      const numericId = Number.parseInt(rawId, 10);

      if (!Number.isNaN(numericId)) {
        this.loadSketch(numericId);
      } else {
        this.isLoading.set(false);
        this.errorMessage.set('ID dello sketch non valido.');
      }
    });
  }

  // Segmenti da 1 a 10 per la barra visiva dei tentativi
  readonly attemptSegments = computed(() =>
    Array.from({ length: this.MAX_ATTEMPTS }, (_, i) => i + 1)
  );

   // Array delle caselle lettere (mostra le lettere reali se la parola è svelata, altrimenti '?')
  readonly wordCharacters = computed(() => {
    const s = this.sketch();
    if (!s) return [];
    if (s.word) {
      return s.word.toUpperCase().split('');
    }
    const typed = this.currentGuess().trim().toUpperCase();
    return Array.from({ length: s.wordLength }, (_, idx) => typed[idx] || '?');
  });
  
  // Validazione Client-Side in tempo reale per guidare l'utente senza sprecare tentativi
  readonly clientHint = computed(() => {
    const raw = this.currentGuess().trim().toLowerCase();
    const s = this.sketch();
    if (!raw || !s) return null;

    const alreadyTried = s.userContext?.guessedWords || [];
    if (alreadyTried.includes(raw)) {
      return {
        isBlocking: true,
        text: `Hai già provato la parola "${raw}" su questo sketch.`,
      };
    }

    if (raw.length !== s.wordLength) {
      return {
        isBlocking: false,
        text: `Suggerimento: la parola segreta è composta da ${s.wordLength} lettere (ne hai inserite ${raw.length}).`,
      };
    }

    return null;
  });

  readonly canSubmitGuess = computed(() => {
    const s = this.sketch();
    const raw = this.currentGuess().trim().toLowerCase();
    if (!s || !s.userContext?.canPlay || this.isSubmitting()) return false;
    if (raw.length === 0) return false;
    if (s.userContext.guessedWords.includes(raw)) return false;
    return true;
  });

  loadSketch(sketchId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.sketchService.getSketchById(sketchId).subscribe({
      next: (data) => {
        this.sketch.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.description || 'Sketch non trovato o rimosso.'
        );
      },
    });
  }

  isCloseWord(word: string): boolean {
    return this.closeWordsSet().has(word.toLowerCase());
  }

  onSubmitGuess(): void {
    const s = this.sketch();
    const guessText = this.currentGuess().trim();
    if (!s || !this.canSubmitGuess()) return;

    this.isSubmitting.set(true);
    this.feedbackBanner.set(null);

    this.sketchService.submitGuess(s.id, guessText).subscribe({
      next: (res) => {
        if (res.isCloseGuess) {
          this.closeWordsSet.update((prevSet) => {
            const next = new Set(prevSet);
            next.add(guessText.toLowerCase());
            return next;
          });
        }
        
        this.isSubmitting.set(false);
        this.currentGuess.set('');

        // Aggiorna reattivamente i dati dello sketch e dei tentativi
        this.sketch.update((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            word: res.solution ?? prev.word,
            stats: {
              totalPlayers:
                prev.userContext?.attemptsCount === 0
                  ? prev.stats.totalPlayers + 1
                  : prev.stats.totalPlayers,
              solvedCount: res.isCorrect
                ? prev.stats.solvedCount + 1
                : prev.stats.solvedCount,
            },
            userContext: {
              isAuthor: false,
              canPlay: res.status === 'IN_PROGRESS',
              status: res.status,
              attemptsCount: res.attemptsCount,
              remainingAttempts: res.remainingAttempts,
              guessedWords: res.guessedWords,
            },
          };
        });

        if (res.status === 'WON') {
          this.feedbackBanner.set({ type: 'SUCCESS', text: res.message });
          this.isResultModalOpen.set(true);
        } else if (res.status === 'LOST') {
          this.feedbackBanner.set({ type: 'ERROR', text: res.message });
          this.isResultModalOpen.set(true);
        } else {
          this.feedbackBanner.set({ type: 'WARNING', text: res.message });
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.feedbackBanner.set({
          type: 'ERROR',
          text:
            err.error?.description ||
            'Errore durante la verifica del tentativo.',
        });
      },
    });
  }

  openLoginToPlay(): void {
    const s = this.sketch();
    this.authService.openAuthModal('LOGIN', s ? `/sketches/${s.id}` : '/');
  }

  goBackToGallery(): void {
    this.isResultModalOpen.set(false);
    this.router.navigate(['/']);
  }
}
