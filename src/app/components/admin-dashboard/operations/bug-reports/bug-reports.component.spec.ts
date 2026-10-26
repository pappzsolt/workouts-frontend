import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import type { BugReportDto } from '../../../../models/backend-dto/bug-report/bug-report';
import type { PageResponse } from '../../../../models/backend-dto/common/page-response';
import { BugReportService } from '../../../../services/bug-report/bug-report.service';
import { BugReportsComponent } from './bug-reports.component';

const report: BugReportDto = {
  id: 4, reporterType: 'COACH', reporterId: 7, reporterName: 'Coach Carl', reporterEmail: 'carl@example.com',
  title: '<b>Hiba</b>', description: 'Leírás', pageUrl: '/coach/clients', userAgent: 'UA', createdAt: '2026-10-24T13:00:00+02:00',
  screenshots: [{ id: 11, position: 1, contentType: 'image/png', width: 10, height: 10, sizeBytes: 100 }],
};

describe('Admin bug reports', () => {
  let list: Subject<PageResponse<BugReportDto>>;
  let component: BugReportsComponent;
  let screenshot: jasmine.Spy;

  beforeEach(() => {
    list = new Subject();
    screenshot = jasmine.createSpy('screenshot').and.returnValue(of(new Blob(['x'], { type: 'image/png' })));
    spyOn(URL, 'createObjectURL').and.returnValue('blob:shot');
    spyOn(URL, 'revokeObjectURL');
    TestBed.configureTestingModule({ providers: [{ provide: BugReportService, useValue: { list: () => list, screenshot } }] });
    component = TestBed.runInInjectionContext(() => new BugReportsComponent());
  });

  it('loads reports with authenticated screenshot previews and releases them', () => {
    list.next({ content: [report], page: 0, size: 10, totalElements: 1, totalPages: 1 });
    expect(component.reports.length).toBe(1);
    expect(screenshot).toHaveBeenCalledWith(4, 11);
    expect(component.previews[11]?.url).toBe('blob:shot');
    component.openScreenshot(report, report.screenshots[0]);
    expect(component.zoomed?.screenshot.id).toBe(11);
    component.closeScreenshot();
    expect(component.zoomed).toBeNull();
    component.ngOnDestroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:shot');
  });

  it('marks a failed screenshot and shows list errors', () => {
    screenshot.and.returnValue(throwError(() => new Error('403')));
    list.next({ content: [report], page: 0, size: 10, totalElements: 1, totalPages: 1 });
    expect(component.previews[11]?.failed).toBeTrue();
    component.openScreenshot(report, report.screenshots[0]);
    expect(component.zoomed).toBeNull();
    list.error(new Error('Nincs jogosultság'));
    expect(component.message).toBe('Nincs jogosultság');
    expect(component.loading).toBeFalse();
  });
});
