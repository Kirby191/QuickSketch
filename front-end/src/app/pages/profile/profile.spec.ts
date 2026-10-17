import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';
import { StatsService } from '../../services/stats/stats.service';
import { WordService } from '../../services/word/word.service';
import { ProfileComponent } from './profile';

// Verifica statistiche personali, gestione dizionario admin e navigazione del profilo.
describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let stats: Record<string, ReturnType<typeof vi.fn>>;
  let words: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    stats = {
      getMyStats: vi.fn(() => of({
        user: { id: 1, username: 'Ada', memberSince: '2026-01-01' },
        playerStats: {
          wordsGuessedCount: 4, wordsNotGuessedCount: 1, gamesInProgressCount: 0,
          totalAttemptsUsed: 7, attemptsUsedForWins: 5, avgAttemptsPerWin: 1.75, winRatePercentage: 80,
        },
        artistStats: {
          sketchesCreatedCount: 3, sketchesSolvedByAtLeastOne: 2, totalPlayersOnMySketches: 8,
          successfulGuessesOnMySketches: 6, artistSuccessRate: 75, avgDrawingTime: 24,
        },
        recentGames: [{
          attemptId: 1, sketchId: 2, category: 'Animali', author: 'Bob',
          status: 'WON', attemptsCount: 2, word: 'gatto', updatedAt: '2026-01-02',
        }],
      })) };
    words = {
      addWord: vi.fn(() => of({ message: 'aggiunta' })),
      deleteWord: vi.fn(() => of({ message: 'rimossa' })),
    };
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        { provide: StatsService, useValue: stats },
        { provide: WordService, useValue: words },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            isAdmin: signal(true),
            currentUser: signal({ username: 'Ada' }),
          },
        },
        provideRouter([]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  // Le statistiche e la validazione client-side precedono l'inserimento della parola.
  it('loads personal stats and validates admin word actions', () => {
    expect(component.stats()?.user.id).toBe(1);
    expect(component.canAddWord()).toBe(false);
    component.newWordText.set('  Gatto ');
    expect(component.canAddWord()).toBe(true);
    component.onAddWord();
    expect(words['addWord']).toHaveBeenCalledWith('gatto', 'Oggetti', 'MEDIUM');
    expect(component.adminFeedback()?.message).toBe('aggiunta');
  });

  // La cancellazione normalizza il testo e presenta gli errori del servizio.
  it('deletes normalized words and handles errors', () => {
    component.wordToDeleteText.set('  Cane ');
    component.onDeleteWord();
    expect(words['deleteWord']).toHaveBeenCalledWith('cane');
    words['deleteWord'].mockReturnValue(throwError(() => ({ error: { description: 'missing' } })));
    component.wordToDeleteText.set('Gatto');
    component.onDeleteWord();
    expect(component.adminFeedback()).toEqual({ type: 'ERROR', message: 'missing' });
  });

  // I comandi rapidi del profilo portano a galleria e area di disegno.
  it('navigates to gallery and drawing', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.goToGallery();
    component.goToDraw();
    expect(router.navigate).toHaveBeenNthCalledWith(1, ['/']);
    expect(router.navigate).toHaveBeenNthCalledWith(2, ['/draw']);
  });

  // Il template rende metriche, partite recenti e pannello admin per il ruolo corretto.
  it('renders profile metrics, recent games and the admin panel', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-username"]').textContent).toContain('Ada');
    expect(fixture.nativeElement.querySelector('[data-testid="stat-card-sketches-created"]').textContent).toContain('3');
    expect(fixture.nativeElement.querySelector('[data-testid="stat-card-words-guessed"]').textContent).toContain('4');
    expect(fixture.nativeElement.querySelector('[data-testid="recent-games-list"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="admin-words-panel"]')).toBeTruthy();
  });
});
