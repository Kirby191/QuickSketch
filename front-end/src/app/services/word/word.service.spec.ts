import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../config/api.config';
import { WordService } from './word.service';

// Verifica richieste di estrazione, inserimento e rimozione dal dizionario.
describe('WordService', () => {
  let service: WordService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WordService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WordService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // Senza parametri il servizio richiede il numero standard di parole casuali.
  it('requests the default random words', () => {
    service.getRandomWords().subscribe();
    const request = http.expectOne(`${API_CONFIG.endpoints.words}/random?count=3`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  // Conteggio ed esclusioni vengono serializzati nella query string.
  it('serializes excluded words and custom count', () => {
    service.getRandomWords(2, ['gatto', 'cane']).subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/random'));
    expect(request.request.params.get('count')).toBe('2');
    expect(request.request.params.get('exclude')).toBe('gatto,cane');
    request.flush([]);
  });

  // L'inserimento inoltra testo, categoria e difficoltà selezionata.
  it('adds words with the selected difficulty', () => {
    service.addWord('gatto', 'Animali', 'HARD').subscribe();
    const request = http.expectOne(API_CONFIG.endpoints.words);
    expect(request.request.body).toEqual({ text: 'gatto', category: 'Animali', difficulty: 'HARD' });
    request.flush({});
  });

  // Il testo viene normalizzato e codificato prima della cancellazione.
  it('normalizes and encodes words before deletion', () => {
    service.deleteWord('  Cane nero ').subscribe();
    const request = http.expectOne(`${API_CONFIG.endpoints.words}/cane%20nero`);
    expect(request.request.method).toBe('DELETE');
    request.flush({});
  });
});
