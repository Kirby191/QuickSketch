import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sketch, GuessResponse } from '../../models/api.models';
import { API_CONFIG } from '../../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class SketchService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.endpoints.sketches;

  // Costruisce la query mantenendo opzionali categoria e autore.
  // Recupera la galleria con filtri opzionali e paginazione.
  getSketches(
    category?: string,
    authorId?: number,
    limit = 24,
    offset = 0
  ): Observable<Sketch[]> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    if (category && category !== 'Tutte') {
      params = params.set('category', category);
    }
    if (authorId !== undefined && authorId !== null) {
      params = params.set('authorId', authorId.toString());
    }
    return this.http.get<Sketch[]>(this.apiUrl, { params });
  }

  // Recupera il dettaglio di un singolo sketch e il contesto tentativi dell'utente
  getSketchById(id: number): Observable<Sketch> {
    return this.http.get<Sketch>(`${this.apiUrl}/${id}`);
  }

  // Pubblica un nuovo disegno realizzato sulla Canvas
  createSketch(word: string, imageData: string, drawingTime: number): Observable<Sketch> {
    return this.http.post<Sketch>(this.apiUrl, {
      word,
      imageData,
      drawingTime,
    });
  }

  // Elimina uno sketch (Autore o Admin)
  deleteSketch(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // Invia un tentativo per indovinare la parola dello sketch (Max 10 tentativi)
  submitGuess(sketchId: number, guess: string): Observable<GuessResponse> {
    return this.http.post<GuessResponse>(`${this.apiUrl}/${sketchId}/attempts`, {
      guess: guess.trim(),
    });
  }
}
