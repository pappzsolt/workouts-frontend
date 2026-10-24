import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { BugReportService } from './bug-report.service';

describe('BugReportService', () => {
  let service: BugReportService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(BugReportService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts multipart form data without any reporter field', () => {
    const file = new File([new Uint8Array([0x89, 0x50])], 'kep.png', { type: 'image/png' });
    let result: unknown;
    service.submit({ title: 'Cím', description: 'Leírás szöveg', pageUrl: null, screenshots: [file] }).subscribe((r) => (result = r));
    const request = http.expectOne((r) => r.url.endsWith('/bug-reports') && r.method === 'POST');
    const body = request.request.body as FormData;
    expect(body.get('title')).toBe('Cím');
    expect(body.get('description')).toBe('Leírás szöveg');
    expect(body.has('pageUrl')).toBeFalse();
    expect(body.has('reporterName')).toBeFalse();
    expect((body.getAll('screenshots')[0] as File).name).toBe('kep.png');
    request.flush({ success: true, data: { id: 5, createdAt: '2026-10-24T14:00:00+02:00', screenshots: 1 }, message: 'Köszönjük' });
    expect(result).toEqual({ created: { id: 5, createdAt: '2026-10-24T14:00:00+02:00', screenshots: 1 }, message: 'Köszönjük' });
  });

  it('loads admin pages and screenshots and exposes JSON errors of blob requests', async () => {
    service.list(1, 20).subscribe();
    const list = http.expectOne((r) => r.url.endsWith('/admin/bug-reports'));
    expect(list.request.params.get('page')).toBe('1');
    expect(list.request.params.get('size')).toBe('20');
    list.flush({ success: true, data: { content: [], page: 1, size: 20, totalElements: 0, totalPages: 0 }, message: null });

    const failed = new Promise<unknown>((resolve) => service.screenshot(3, 9).subscribe({ error: resolve }));
    const shot = http.expectOne((r) => r.url.endsWith('/admin/bug-reports/3/screenshots/9'));
    expect(shot.request.responseType).toBe('blob');
    shot.flush(new Blob([JSON.stringify({ success: false, message: 'A képernyőkép nem található.' })]), { status: 404, statusText: 'Not Found' });
    expect(((await failed) as { error: { message: string } }).error.message).toBe('A képernyőkép nem található.');
  });
});
