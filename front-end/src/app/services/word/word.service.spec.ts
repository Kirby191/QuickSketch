import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../config/api.config';
import { WordService } from './word.service';

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

  it('requests the default random words', () => {
    service.getRandomWords().subscribe();
    const request = http.expectOne(`${API_CONFIG.endpoints.words}/random?count=3`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('serializes excluded words and custom count', () => {
    service.getRandomWords(2, ['gatto', 'cane']).subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/random'));
    expect(request.request.params.get('count')).toBe('2');
    expect(request.request.params.get('exclude')).toBe('gatto,cane');
    request.flush([]);
  });

  it('adds words with the selected difficulty', () => {
    service.addWord('gatto', 'Animali', 'HARD').subscribe();
    const request = http.expectOne(API_CONFIG.endpoints.words);
    expect(request.request.body).toEqual({ text: 'gatto', category: 'Animali', difficulty: 'HARD' });
    request.flush({});
  });

  it('normalizes and encodes words before deletion', () => {
    service.deleteWord('  Cane nero ').subscribe();
    const request = http.expectOne(`${API_CONFIG.endpoints.words}/cane%20nero`);
    expect(request.request.method).toBe('DELETE');
    request.flush({});
  });
});
