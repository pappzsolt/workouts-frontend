import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_ENDPOINTS } from '../../api-endpoints';
import { ProgramImportService, ImportRequest } from './program-import.service';

describe('ProgramImportService', () => {
  let service: ProgramImportService;
  let http: HttpTestingController;
  const request: ImportRequest = { file: new File(['xlsx'], 'terv.xlsx'), userId: 42,
    programName: ' Új terv ', startDate: '2026-11-02', language: 'de', exerciseMappings: { 'Fekvehajlító': 1079 } };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProgramImportService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends the file and JSON mapping as multipart, with an explicit preview language', () => {
    service.preview('coach', request).subscribe();
    const call = http.expectOne(r => r.url === API_ENDPOINTS.programImport + '/preview');
    expect(call.request.method).toBe('POST');
    expect(call.request.headers.has('Content-Type')).toBeFalse();
    expect(call.request.params.get('language')).toBe('de');
    const body = call.request.body as FormData;
    expect((body.get('file') as File).name).toBe('terv.xlsx');
    expect(body.get('userId')).toBe('42'); expect(body.get('programName')).toBe('Új terv');
    expect(body.get('startDate')).toBe('2026-11-02');
    expect((body.get('exerciseMappings') as Blob).type).toBe('application/json');
    call.flush({ success: true, data: { unresolvedExercises: [] } });
  });
  it('uses the private endpoint without sending any owner ID', () => {
    service.import('personal', { ...request, programName: '', startDate: '', exerciseMappings: {} }).subscribe();
    const call = http.expectOne(r => r.url === API_ENDPOINTS.personalProgramImport);
    const body = call.request.body as FormData;
    for (const field of ['userId', 'programName', 'startDate', 'exerciseMappings']) expect(body.has(field)).toBeFalse();
    call.flush({ success: true, data: { programId: 8 } });
  });
  it('preserves backend validation messages instead of accepting failed responses', () => {
    let message = '';
    service.preview('personal', request).subscribe({ error: e => message = e.message });
    http.expectOne(r => r.url.endsWith('/import/preview')).flush({ success: false, data: null, message: 'Hibás sor: 7. hét / 8' });
    expect(message).toBe('Hibás sor: 7. hét / 8');
  });
});
