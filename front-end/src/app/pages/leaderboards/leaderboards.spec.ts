import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';
import { StatsService } from '../../services/stats/stats.service';
import { LeaderboardsComponent } from './leaderboards';

// Verifica caricamento classifiche, profili pubblici e stati vuoti.
describe('LeaderboardsComponent', () => {
  let fixture: ComponentFixture<LeaderboardsComponent>;
  let component: LeaderboardsComponent;
  let stats: Record<string, ReturnType<typeof vi.fn>>;
  let auth: Record<string, unknown>;

  beforeEach(async () => {
    stats = {
      getLeaderboards: vi.fn(() => of({
        bestPlayers: [{
          rank: 1, userId: 5, username: 'Ada', wordsGuessedCount: 12,
          wordsNotGuessedCount: 2, totalAttemptsUsed: 15, avgAttemptsPerWin: 1.25,
        }],
        bestArtists: [{
          rank: 1, userId: 6, username: 'Bob', sketchesCreatedCount: 8,
          solvedSketchesCount: 6, totalWinsReceived: 9, totalAttemptsReceived: 20, successRate: 45,
        }],
      })),
      getUserStats: vi.fn(() => of({ user: { id: 5 } })),
    };
    auth = { currentUser: () => ({ id: 5 }), isAuthenticated: () => false, openAuthModal: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [LeaderboardsComponent],
      providers: [{ provide: StatsService, useValue: stats }, { provide: AuthService, useValue: auth }, provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(LeaderboardsComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  // I dati ricevuti alimentano entrambe le classifiche e i relativi podi.
  it('loads both leaderboards and derives podiums', () => {
    expect(stats['getLeaderboards']).toHaveBeenCalledWith(20);
    expect(component.topThreePlayers().length).toBe(1);
    expect(component.topThreeArtists().length).toBe(1);
    expect(component.getMedalEmoji(1)).toBe('🥇');
    expect(component.getMedalEmoji(4)).toBe('#4');
  });

  // Il profilo pubblico può essere aperto e chiuso dal contesto della classifica.
  it('loads and closes a public profile', () => {
    component.openPublicProfile(5);
    expect(component.selectedUserStats()).toEqual({ user: { id: 5 } });
    component.closePublicProfile();
    expect(component.isUserModalOpen()).toBe(false);
  });

  // Gli errori del profilo vengono esposti e i link agli sketch navigano correttamente.
  it('reports loading errors and navigates to a sketch', () => {
    stats['getUserStats'].mockReturnValue(throwError(() => ({ error: { description: 'errore' } })));
    component.openPublicProfile(8);
    expect(component.userStatsError()).toBe('errore');
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.openSketchFromProfile(3);
    expect(router.navigate).toHaveBeenCalledWith(['/sketches', 3]);
  });

  // Le tab mostrano alternativamente classifiche giocatori e artisti.
  it('renders player and artist tables and switches between them', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="leaderboard-players-table"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="podium-player-1"]').textContent).toContain('Ada');
    fixture.nativeElement.querySelector('[data-testid="leaderboard-tab-artists"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="leaderboard-artists-table"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Bob');
  });

  // Una classifica senza dati usa lo stato vuoto condiviso.
  it('renders the empty-state action when a leaderboard has no players', () => {
    stats['getLeaderboards'].mockReturnValue(of({ bestPlayers: [], bestArtists: [] }));
    component.loadLeaderboards();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="empty-state-primary-btn"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('ancora vuota');
  });
});
