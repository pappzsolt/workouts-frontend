import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CompletedProgramHistoryService } from './completed-program-history.service';
import { API_ENDPOINTS } from '../../api-endpoints';

describe('Completed program history read-only API', () => {
  let api: CompletedProgramHistoryService;
  let http: HttpTestingController;
  const endpoint = API_ENDPOINTS.completedProgramHistory;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(CompletedProgramHistoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the archive with a GET request', () => {
    api.getCompletedPrograms('hu').subscribe(response => expect(response.data).toEqual([]));
    const request = http.expectOne(req => req.url === endpoint && req.params.get('language') === 'hu');
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, data: [], message: null });
  });

  it('only reads historical workouts and lets the server authorize ownership', () => {
    api.getWorkouts(42, 'en').subscribe(response => expect(response.data).toEqual([]));
    const request = http.expectOne(req => req.url === API_ENDPOINTS.completedProgramHistoryWorkouts(42) && req.params.get('language') === 'en');
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, data: [], message: null });
  });
});
