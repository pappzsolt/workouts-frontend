import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

import { AuthService } from '../../../services/auth/auth.service';
import { BugReportService } from '../../../services/bug-report/bug-report.service';
import { HttpErrorResponse } from '@angular/common/http';
import { APP_PATH, BugReportComponent, safeBugReportSource, detectImageType, submitError } from './bug-report.component';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

describe('Bug report form', () => {
  let component: BugReportComponent;
  let submit: jasmine.Spy;
  let response: Subject<{ created: { id: number; createdAt: string; screenshots: number }; message: string }>;

  beforeEach(() => {
    response = new Subject();
    submit = jasmine.createSpy('submit').and.returnValue(response);
    TestBed.configureTestingModule({
      providers: [
        { provide: BugReportService, useValue: { submit } },
        { provide: AuthService, useValue: { getUserName: () => 'kiss.anna' } },
        { provide: Router, useValue: { getCurrentNavigation: () => ({ previousNavigation: { finalUrl: { toString: () => '/user/profile?tab=1' } } }), lastSuccessfulNavigation: null } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new BugReportComponent());
  });

  it('prefills the previous in-app page and shows the reporter', () => {
    expect(component.form.controls.pageUrl.value).toBe('/user/profile?tab=1');
    expect(component.reporterName).toBe('kiss.anna');
  });

  it('keeps only non-sensitive route identifiers in automatically prefilled report pages', () => {
    expect(safeBugReportSource('/coach/clients/7?workout=70&program=1&token=SECRET#private'))
      .toBe('/coach/clients/7?program=1&workout=70');
    expect(safeBugReportSource('/user/profile?tab=1&access_token=SECRET#part'))
      .toBe('/user/profile?tab=1');
    expect(safeBugReportSource('/reset-password?token=SECRET#private'))
      .toBe('/reset-password');
    expect(safeBugReportSource('/user/dashboard?username=test&code=SECRET#private'))
      .toBe('/user/dashboard');
    expect(safeBugReportSource('/coach/clients/7?workout=secret&programWorkout=101&tab=programs'))
      .toBe('/coach/clients/7?programWorkout=101&tab=programs');
    expect(safeBugReportSource('//outside.example/?token=SECRET')).toBe('');
    expect(safeBugReportSource('/coach/bug-report?token=SECRET')).toBe('');
  });

  it('accepts only in-app paths', () => {
    expect(APP_PATH.test('/coach/clients/7?program=3')).toBeTrue();
    expect(APP_PATH.test('javascript:alert(1)')).toBeFalse();
    expect(APP_PATH.test('//evil.example')).toBeFalse();
    expect(APP_PATH.test('https://evil.example')).toBeFalse();
    expect(APP_PATH.test('/x"><script>')).toBeFalse();
  });

  it('detects image type from content, not from the name or MIME type', async () => {
    expect(await detectImageType(new Blob([PNG], { type: 'text/html' }))).toBe('image/png');
    expect(await detectImageType(new Blob([JPEG]))).toBe('image/jpeg');
    expect(await detectImageType(new Blob(['<svg onload=alert(1)>'], { type: 'image/png' }))).toBeNull();
  });

  it('rejects blank or too short text without calling the backend', () => {
    component.form.setValue({ title: '   ', description: 'rövid', pageUrl: '' });
    component.submit();
    expect(submit).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('bugReport.errors.fixFields');
    expect(component.fieldError('description')).toBe('bugReport.errors.descriptionLength');
    component.form.controls.pageUrl.setValue('javascript:alert(1)');
    expect(component.fieldError('pageUrl')).toBe('bugReport.errors.pageUrl');
  });

  it('keeps at most three valid images and skips fake or oversized files', async () => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
    spyOn(URL, 'revokeObjectURL');
    const fake = new File(['<html>'], 'fake.png', { type: 'image/png' });
    await component.addFiles([fake]);
    expect(component.attachments.length).toBe(0);
    expect(component.fileError).toBe('bugReport.errors.fileType');

    const big = new File([PNG, new Uint8Array(5 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    await component.addFiles([big]);
    expect(component.fileError).toBe('bugReport.errors.fileTooLarge');

    await component.addFiles([1, 2, 3, 4].map((i) => new File([PNG], `kep${i}.png`)));
    expect(component.attachments.length).toBe(3);
    expect(component.fileError).toBe('bugReport.errors.tooManyFiles');
    component.removeAttachment(0);
    expect(component.attachments.length).toBe(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });

  it('sends trimmed text and the images, then shows the recorded report', async () => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:y');
    spyOn(URL, 'revokeObjectURL');
    await component.addFiles([new File([JPEG], 'kep.jpg')]);
    component.form.setValue({ title: '  Mentés hiba ', description: '  A profil mentése nem működik. ', pageUrl: ' /user/profile ' });
    component.submit();
    component.submit();
    expect(submit).toHaveBeenCalledTimes(1);
    const payload = submit.calls.mostRecent().args[0];
    expect(payload.title).toBe('Mentés hiba');
    expect(payload.description).toBe('A profil mentése nem működik.');
    expect(payload.pageUrl).toBe('/user/profile');
    expect(payload.screenshots.length).toBe(1);
    expect(payload.screenshots[0].type).toBe('image/jpeg');
    response.next({ created: { id: 12, createdAt: '2026-10-24T14:00:00+02:00', screenshots: 1 }, message: 'Köszönjük' });
    response.complete();
    expect(component.created?.id).toBe(12);
    expect(component.attachments.length).toBe(0);
    expect(component.sending).toBeFalse();
  });

  it('blocks submission until overlapping screenshot reads finish and preserves accepted bytes', async () => {
    component.form.setValue({ title: 'Mentés hiba', description: 'A profil mentése nem működik.', pageUrl: '' });
    await component.addFiles([new File([JPEG], 'existing.jpg')]);
    const delayed = new File([PNG], 'pending.png');
    const invalid = new File(['invalid'], 'invalid.png');
    let finish!: (bytes: ArrayBuffer) => void;
    let fail!: (reason: Error) => void;
    spyOn(delayed, 'slice').and.returnValue({
      arrayBuffer: () => new Promise<ArrayBuffer>(resolve => { finish = resolve; }),
    } as Blob);
    spyOn(invalid, 'slice').and.returnValue({
      arrayBuffer: () => new Promise<ArrayBuffer>((_, reject) => { fail = reject; }),
    } as Blob);
    const validRead = component.addFiles([delayed]);
    const invalidRead = component.addFiles([invalid]);
    component.submit();
    expect(submit).not.toHaveBeenCalled();

    finish(PNG.buffer);
    await validRead;
    component.submit();
    expect(submit).not.toHaveBeenCalled();
    fail(new Error('read failed'));
    await invalidRead;
    expect(component.fileError).toBe('bugReport.errors.fileType');
    component.submit();
    component.submit();
    expect(submit).toHaveBeenCalledTimes(1);
    const files: File[] = submit.calls.mostRecent().args[0].screenshots;
    expect(files.map(file => file.name)).toEqual(['existing.jpg', 'pending.png']);
    expect(new Uint8Array(await files[1].arrayBuffer())).toEqual(PNG);

    response.next({ created: { id: 12, createdAt: '2026-10-24T14:00:00+02:00', screenshots: 2 }, message: 'Köszönjük' });
    response.complete();
    component.newReport();
    expect(component.attachments).toEqual([]);
    expect(component.form.controls.title.value).toBe('');
  });

  it('shows the backend message on failure', () => {
    component.form.setValue({ title: 'Mentés hiba', description: 'A profil mentése nem működik.', pageUrl: '' });
    component.submit();
    response.error(new Error('Túl sok hibabejelentés rövid időn belül. Próbáld újra később.'));
    expect(component.errorMessage).toBe('Túl sok hibabejelentés rövid időn belül. Próbáld újra később.');
    expect(component.sending).toBeFalse();
  });

  it('never shows a proxy HTML error page as the message', () => {
    expect(submitError(new HttpErrorResponse({ status: 413, error: '<html><body>413 Request Entity Too Large</body></html>' }))).toBe('bugReport.errors.tooLarge');
    expect(submitError(new HttpErrorResponse({ status: 502, error: '<html>Bad Gateway</html>' }))).toBe('bugReport.errors.submit');
    expect(submitError(new HttpErrorResponse({ status: 400, error: { success: false, message: 'A képernyőkép csak PNG vagy JPEG kép lehet.' } })))
      .toBe('A képernyőkép csak PNG vagy JPEG kép lehet.');
  });
});
