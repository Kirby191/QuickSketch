import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../config/api.config';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let service: StatsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StatsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StatsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests leaderboards with the requested limit', () => {
    service.getLeaderboards(20).subscribe();
    const request = http.expectOne(`${API_CONFIG.endpoints.stats}/leaderboards?limit=20`);
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('requests personal and public user statistics', () => {
    service.getMyStats().subscribe();
    const personalRequest = http.expectOne(`${API_CONFIG.endpoints.stats}/me`);
    expect(personalRequest.request.method).toBe('GET');
    personalRequest.flush({});
    service.getUserStats(9).subscribe();
    const publicRequest = http.expectOne(`${API_CONFIG.endpoints.stats}/users/9`);
    expect(publicRequest.request.method).toBe('GET');
    publicRequest.flush({});
  });
});
