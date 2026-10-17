import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StatsService } from '../../services/stats/stats.service';
import { AuthService } from '../../services/auth/auth.service';
import {
  LeaderboardPlayer,
  LeaderboardArtist,
  UserStatsResponse,
} from '../../models/api.models';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state.component';
import { ModalComponent } from '../../components/shared/modal/modal.component';

export type LeaderboardTab = 'PLAYERS' | 'ARTISTS';

@Component({
  selector: 'app-leaderboards',
  standalone: true,
  imports: [EmptyStateComponent, ModalComponent],
  templateUrl: './leaderboards.html',
})
export class LeaderboardsComponent implements OnInit {
  private readonly statsService = inject(StatsService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Tab attivo: Migliori Giocatori vs Migliori Disegnatori
  readonly activeTab = signal<LeaderboardTab>('PLAYERS');

  // Dati provenienti dal Back-End
  readonly bestPlayers = signal<LeaderboardPlayer[]>([]);
  readonly bestArtists = signal<LeaderboardArtist[]>([]);

  // Stato UI
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  // Stato Modale Profilo Pubblico Utente (GET /api/stats/users/:id)
  readonly isUserModalOpen = signal<boolean>(false);
  readonly isLoadingUserStats = signal<boolean>(false);
  readonly selectedUserStats = signal<UserStatsResponse | null>(null);
  readonly userStatsError = signal<string | null>(null);

  // Selettori derivati per il Podio Top 3
  readonly topThreePlayers = computed(() => this.bestPlayers().slice(0, 3));
  readonly topThreeArtists = computed(() => this.bestArtists().slice(0, 3));

  ngOnInit(): void {
    this.loadLeaderboards();
  }

  loadLeaderboards(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.statsService.getLeaderboards(20).subscribe({
      next: (res) => {
        this.bestPlayers.set(res.bestPlayers);
        this.bestArtists.set(res.bestArtists);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.description ||
            'Impossibile caricare le classifiche dal server.'
        );
      },
    });
  }

  // Apre il modale con le statistiche pubbliche di uno specifico giocatore/disegnatore
  openPublicProfile(userId: number): void {
    this.isUserModalOpen.set(true);
    this.isLoadingUserStats.set(true);
    this.selectedUserStats.set(null);
    this.userStatsError.set(null);

    this.statsService.getUserStats(userId).subscribe({
      next: (stats) => {
        this.selectedUserStats.set(stats);
        this.isLoadingUserStats.set(false);
      },
      error: (err) => {
        this.isLoadingUserStats.set(false);
        this.userStatsError.set(
          err.error?.description || 'Impossibile caricare le statistiche di questo utente.'
        );
      },
    });
  }

  closePublicProfile(): void {
    this.isUserModalOpen.set(false);
    this.selectedUserStats.set(null);
    this.userStatsError.set(null);
  }

  openSketchFromProfile(sketchId: number): void {
    this.closePublicProfile();
    this.router.navigate(['/sketches', sketchId]);
  }

  switchTab(tab: LeaderboardTab): void {
    this.activeTab.set(tab);
  }

  isCurrentUser(userId: number): boolean {
    return this.authService.currentUser()?.id === userId;
  }

  getMedalEmoji(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  }

  goToGallery(): void {
    this.router.navigate(['/']);
  }

  goToDraw(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/draw']);
    } else {
      this.authService.openAuthModal('LOGIN', '/draw');
    }
  }
}