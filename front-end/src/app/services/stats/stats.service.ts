import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LeaderboardsResponse, UserStatsResponse } from '../../models/api.models';
import { API_CONFIG } from '../../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.endpoints.stats;

  // Recupera le classifiche Migliori Giocatori e Migliori Disegnatori
  getLeaderboards(limit = 10): Observable<LeaderboardsResponse> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<LeaderboardsResponse>(`${this.apiUrl}/leaderboards`, { params });
  }

  // Recupera le statistiche personali dell'utente autenticato
  getMyStats(): Observable<UserStatsResponse> {
    return this.http.get<UserStatsResponse>(`${this.apiUrl}/me`);
  }

  // Recupera le statistiche pubbliche di un utente tramite ID
  getUserStats(userId: number): Observable<UserStatsResponse> {
    return this.http.get<UserStatsResponse>(`${this.apiUrl}/users/${userId}`);
  }
}