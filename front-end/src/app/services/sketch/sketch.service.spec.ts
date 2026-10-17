import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../config/api.config';
import { SketchService } from './sketch.service';

describe('SketchService', () => {
  let service: SketchService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [SketchService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SketchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads sketches with pagination and optional filters', () => {
    service.getSketches('Animali', 7, 12, 24).subscribe();
    const request = http.expectOne((req) => req.url === API_CONFIG.endpoints.sketches);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.toString()).toBe('limit=12&offset=24&category=Animali&authorId=7');
    request.flush([]);
  });

  it('omits the category for the all-categories filter', () => {
    service.getSketches('Tutte').subscribe();
    const request = http.expectOne((req) => req.url === API_CONFIG.endpoints.sketches);
    expect(request.request.params.get('category')).toBeNull();
    expect(request.request.params.get('limit')).toBe('24');
    request.flush([]);
  });

  it('gets, creates and deletes sketches', () => {
    service.getSketchById(3).subscribe();
    expect(http.expectOne(`${API_CONFIG.endpoints.sketches}/3`).request.method).toBe('GET');

    service.createSketch('gatto', 'data:image/png;base64,x', 18).subscribe();
    const create = http.expectOne(API_CONFIG.endpoints.sketches);
    expect(create.request.body).toEqual({ word: 'gatto', imageData: 'data:image/png;base64,x', drawingTime: 18 });
    create.flush({});

    service.deleteSketch(3).subscribe();
    expect(http.expectOne(`${API_CONFIG.endpoints.sketches}/3`).request.method).toBe('DELETE');
  });

  it('trims guesses before submitting them', () => {
    service.submitGuess(3, '  gatto  ').subscribe();
    const request = http.expectOne(`${API_CONFIG.endpoints.sketches}/3/attempts`);
    expect(request.request.body).toEqual({ guess: 'gatto' });
    request.flush({});
  });
});
