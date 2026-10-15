import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WordItem } from '../../models/api.models';
import { API_CONFIG } from '../../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class WordService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.endpoints.words;

  // Estrae N parole casuali per il disegnatore (default: 3)
  getRandomWords(count = 3): Observable<WordItem[]> {
    const params = new HttpParams().set('count', count.toString());
    return this.http.get<WordItem[]>(`${this.apiUrl}/random`, { params });
  }

  // Aggiunge una parola al dizionario (Solo ADMIN)
  addWord(
    text: string,
    category: string,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'
  ): Observable<{ message: string; word: WordItem }> {
    return this.http.post<{ message: string; word: WordItem }>(this.apiUrl, {
      text,
      category,
      difficulty,
    });
  }

  // Rimuove una parola dal dizionario tramite il nome (Solo ADMIN)
  deleteWord(text: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/${encodeURIComponent(text.trim().toLowerCase())}`
    );
  }
}