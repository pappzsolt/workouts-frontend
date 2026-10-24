import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import { LanguageService } from '../../../services/shared/language.service';
import { programExportFileName } from '../coach-ui';
import { CoachClientDetailComponent } from './coach-client-detail.component';

describe('Client program Excel export', () => {
  it('builds a safe file name from the program and client names', () => {
    expect(programExportFileName('Erőfejlesztő 21 nap', 'Kiss Anna')).toBe('Erofejleszto-21-nap-Kiss-Anna.xlsx');
    expect(programExportFileName('a/b:c?', null)).toBe('a-b-c.xlsx');
    expect(programExportFileName('', '')).toBe('program.xlsx');
  });

  describe('component', () => {
    let component: CoachClientDetailComponent;
    let exportSpy: jasmine.Spy;
    let response: Subject<Blob>;

    beforeEach(() => {
      response = new Subject<Blob>();
      exportSpy = jasmine.createSpy('exportClientProgram').and.returnValue(response);
      TestBed.configureTestingModule({ providers: [
        { provide: CoachWorkspaceService, useValue: { exportClientProgram: exportSpy, getClientWorkoutSets: () => of([]) } },
        { provide: ActivatedRoute, useValue: {} }, { provide: Router, useValue: {} },
      ] });
      component = TestBed.runInInjectionContext(() => new CoachClientDetailComponent());
      component.userId = 7;
      component.programId = 3;
      component.client = {
        userId: 7, username: 'Kiss Anna', email: 'a@example.com', age: null, weight: null, height: null, gender: null,
        goals: null, lastCompletedAt: null, workouts: [],
        programs: [{ programId: 3, name: 'Erő 21 nap', startDate: null, endDate: null, totalWorkouts: 1, completedWorkouts: 0 }],
      };
    });

    it('downloads the file once and blocks repeated clicks while it is prepared', () => {
      const click = spyOn(HTMLAnchorElement.prototype, 'click');
      spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
      component.exportProgram();
      component.exportProgram();
      expect(exportSpy).toHaveBeenCalledOnceWith(7, 3);
      expect(component.exporting).toBeTrue();
      response.next(new Blob(['x']));
      response.complete();
      expect(click).toHaveBeenCalledTimes(1);
      expect((click.calls.mostRecent().object as HTMLAnchorElement).download).toBe('Ero-21-nap-Kiss-Anna.xlsx');
      expect(component.exporting).toBeFalse();
      expect(component.message).toBe('');
    });

    it('shows the backend message when the export fails', () => {
      component.exportProgram();
      response.error({ error: { message: 'A program nem található.' } });
      expect(component.exporting).toBeFalse();
      expect(component.message).toBe('A program nem található.');
      expect(component.messageType).toBe('error');
    });
  });

  describe('service', () => {
    it('requests the xlsx with the current language and exposes JSON error messages', async () => {
      TestBed.configureTestingModule({ providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: LanguageService, useValue: { getCurrentLanguage: () => 'de' } },
      ] });
      const service = TestBed.inject(CoachWorkspaceService);
      const http = TestBed.inject(HttpTestingController);

      const ok = new Promise<Blob>((resolve) => service.exportClientProgram(7, 3).subscribe(resolve));
      const request = http.expectOne((r) => r.url.endsWith('/user-workout-exercises/user-programs/7/3/export'));
      expect(request.request.params.get('language')).toBe('de');
      expect(request.request.responseType).toBe('blob');
      request.flush(new Blob(['xlsx']));
      expect(await (await ok).text()).toBe('xlsx');

      const failed = new Promise<unknown>((resolve) => service.exportClientProgram(7, 3).subscribe({ error: resolve }));
      http.expectOne((r) => r.url.endsWith('/export')).flush(
        new Blob([JSON.stringify({ success: false, data: null, message: 'Kein Zugriff' })], { type: 'application/json' }),
        { status: 403, statusText: 'Forbidden' },
      );
      const error = (await failed) as { status: number; error: { message: string } };
      expect(error.status).toBe(403);
      expect(error.error.message).toBe('Kein Zugriff');
      http.verify();
    });
  });
});
