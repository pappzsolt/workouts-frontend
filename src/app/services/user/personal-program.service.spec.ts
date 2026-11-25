import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PersonalProgramService } from './personal-program.service';
import { LanguageService } from '../shared/language.service';
import { API_ENDPOINTS } from '../../api-endpoints';
import { PersonalProgramRequest } from '../../models/personal-program.model';

describe('PersonalProgramService', () => {
  let service: PersonalProgramService;
  let http: HttpTestingController;
  const request: PersonalProgramRequest = {
    name: 'Saját',
    description: null,
    durationDays: 7,
    startDate: null,
    difficultyLevel: null,
    languageCode: 'hu',
    expectedVersion: 1,
    workouts: [],
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LanguageService, useValue: { getCurrentLanguage: () => 'de' } },
      ],
    });
    service = TestBed.inject(PersonalProgramService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends bounded pagination, type and literal search to the server', () => {
    service.listPage(2, 12, true, '%_!').subscribe((page) => expect(page.totalElements).toBe(30));
    const call = http.expectOne((request) => request.url === API_ENDPOINTS.personalPrograms + '/page');
    expect(call.request.params.get('languageCode')).toBe('de');
    expect(call.request.params.get('page')).toBe('2');
    expect(call.request.params.get('size')).toBe('12');
    expect(call.request.params.get('standalone')).toBe('true');
    expect(call.request.params.get('search')).toBe('%_!');
    call.flush({ success: true, data: { content: [], page: 2, size: 12, totalElements: 30, totalPages: 3 } });
  });
  it('requests grouped standalone workouts with server pagination, search and status', () => {
    service.listWorkoutGroups(1, 12, '%_!', 'done').subscribe(page => expect(page.totalElements).toBe(13));
    const call = http.expectOne(request => request.url === API_ENDPOINTS.personalPrograms + '/standalone/groups');
    expect(call.request.method).toBe('GET');
    expect(call.request.params.get('languageCode')).toBe('de');
    expect(call.request.params.get('page')).toBe('1');
    expect(call.request.params.get('size')).toBe('12');
    expect(call.request.params.get('search')).toBe('%_!');
    expect(call.request.params.get('status')).toBe('done');
    expect(call.request.params.has('userId')).toBeFalse();
    call.flush({ success: true, data: { content: [], page: 1, size: 12, totalElements: 13, totalPages: 2 } });
    service.listWorkoutGroups().subscribe();
    const all = http.expectOne(request => request.url === API_ENDPOINTS.personalPrograms + '/standalone/groups');
    expect(all.request.params.has('status')).toBeFalse();
    all.flush({ success: true, data: { content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 } });
  });
  it('requests group summaries and scoped occasion pages separately with the same filters', () => {
    service.listWorkoutGroupSummaries(1, 12, '%_!', 'done').subscribe();
    const summary = http.expectOne(request => request.url === API_ENDPOINTS.personalPrograms + '/standalone/group-summaries');
    expect(summary.request.params.get('status')).toBe('done');
    expect(summary.request.params.get('search')).toBe('%_!');
    expect(summary.request.params.get('page')).toBe('1');
    summary.flush({ success: true, data: { content: [], page: 1, size: 12, totalElements: 0, totalPages: 0 } });
    service.listWorkoutGroupOccasions(45, 2, 12, '%_!', 'done').subscribe();
    const occasions = http.expectOne(request => request.url === API_ENDPOINTS.personalPrograms + '/standalone/groups/45/occasions');
    expect(occasions.request.params.get('languageCode')).toBe('de');
    expect(occasions.request.params.get('status')).toBe('done');
    expect(occasions.request.params.get('search')).toBe('%_!');
    expect(occasions.request.params.get('page')).toBe('2');
    expect(occasions.request.params.get('size')).toBe('12');
    expect(occasions.request.params.has('userId')).toBeFalse();
    occasions.flush({ success: true, data: { content: [], page: 2, size: 12, totalElements: 0, totalPages: 0 } });
  });
  it('uses the private API and current language for lists and details', () => {
    service.list().subscribe((result) => expect(result).toEqual([]));
    http
      .expectOne(API_ENDPOINTS.personalPrograms + '?languageCode=de')
      .flush({ success: true, data: [] });
    service.get(9).subscribe((detail) => expect(detail.id).toBe(9));
    http
      .expectOne(API_ENDPOINTS.personalPrograms + '/9?languageCode=de')
      .flush({ success: true, data: { id: 9 } });
  });
  it('creates and replaces only personal drafts, without an owner identifier', () => {
    service.save(null, request).subscribe((id) => expect(id).toBe(9));
    let call = http.expectOne(API_ENDPOINTS.personalPrograms);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    expect(call.request.body.userId).toBeUndefined();
    call.flush({ success: true, data: 9 });
    service.save(9, request).subscribe();
    call = http.expectOne(API_ENDPOINTS.personalPrograms + '/9');
    expect(call.request.method).toBe('PUT');
    call.flush({
      success: true,
      data: { id: 9, startedAt: null, program: { ...request, expectedVersion: 2 } },
    });
  });
  it('uses separate start, copy and delete endpoints', () => {
    service.start(9).subscribe();
    const start = http.expectOne(API_ENDPOINTS.personalPrograms + '/9/start');
    expect(start.request.method).toBe('POST');
    start.flush({
      success: true,
      data: {
        id: 9,
        startedAt: '2026-10-25T12:00:00',
        program: { ...request, startDate: '2026-10-25' },
      },
    });
    service.copy(9).subscribe((id) => expect(id).toBe(10));
    const copy = http.expectOne(API_ENDPOINTS.personalPrograms + '/9/copy?languageCode=de');
    expect(copy.request.method).toBe('POST');
    copy.flush({ success: true, data: 10 });
    service.delete(10).subscribe();
    const remove = http.expectOne(API_ENDPOINTS.personalPrograms + '/10');
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ success: true, data: 10 });
  });
  it('rejects application failures instead of treating them as a saved program', () => {
    service.save(9, request).subscribe({
      next: () => fail('must fail'),
      error: (error) => expect(error.message).toBe('Nem menthető'),
    });
    http
      .expectOne(API_ENDPOINTS.personalPrograms + '/9')
      .flush({ success: false, message: 'Nem menthető', data: null });
  });
  it('creates standalone workouts through their dedicated endpoint', () => {
    service.save(null, request, true).subscribe((id) => expect(id).toBe(9));
    const call = http.expectOne(API_ENDPOINTS.personalPrograms + '/standalone');
    expect(call.request.method).toBe('POST');
    expect(call.request.body.userId).toBeUndefined();
    call.flush({ success: true, data: 9 });
  });
  it('prepares a repeat without starting it or sending old performance data', () => {
    service.repeat(9).subscribe((result) => {
      expect(result.id).toBe(10);
      expect(result.program.startDate).toBeNull();
    });
    const call = http.expectOne(API_ENDPOINTS.personalPrograms + '/9/repeat?languageCode=de');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({});
    call.flush({
      success: true,
      data: { id: 10, standalone: true, startedAt: null, program: { ...request, startDate: null } },
    });
  });
});
