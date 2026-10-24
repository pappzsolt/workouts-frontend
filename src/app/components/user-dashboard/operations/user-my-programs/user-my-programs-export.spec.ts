import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Subject, of } from 'rxjs';

import { UserMyProgramsComponent } from './user-my-programs.component';

const ok = (data: unknown) => ({ success: true, data, message: null });
const program = { id: 8, name: 'Erő 21 nap', description: null } as any;

describe('User program Excel export', () => {
  let exportSpy: jasmine.Spy;
  let response: Subject<Blob>;
  let auth: { getUserId: () => number | null; getUserName: () => string | null };
  let component: UserMyProgramsComponent;

  beforeEach(() => {
    response = new Subject<Blob>();
    exportSpy = jasmine.createSpy('exportUserProgram').and.returnValue(response);
    auth = { getUserId: () => 316, getUserName: () => 'Kiss Anna' };
    component = new UserMyProgramsComponent(
      { getPrograms: () => of(ok([program])), getProgramProgress: () => of(ok([{ programId: 8, totalWorkouts: 3 }])) } as any,
      {} as any,
      { language$: new BehaviorSubject('hu') } as any,
      { exportUserProgram: exportSpy } as any,
      auth as any,
    );
    component.ngOnInit();
  });

  afterEach(() => component.ngOnDestroy());

  it('downloads the own program without opening the card link', () => {
    const click = spyOn(HTMLAnchorElement.prototype, 'click');
    spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
    const event = jasmine.createSpyObj<Event>('event', ['preventDefault', 'stopPropagation']);
    component.exportProgram(event, program);
    component.exportProgram(event, program);
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(exportSpy).toHaveBeenCalledOnceWith(316, 8);
    expect(component.exportingProgramId).toBe(8);
    response.next(new Blob(['x']));
    expect(click).toHaveBeenCalledTimes(1);
    expect((click.calls.mostRecent().object as HTMLAnchorElement).download).toBe('Ero-21-nap-Kiss-Anna.xlsx');
    expect(component.exportingProgramId).toBeNull();
  });

  it('shows the backend message on failure and disables export for empty programs', () => {
    const event = jasmine.createSpyObj<Event>('event', ['preventDefault', 'stopPropagation']);
    component.exportProgram(event, program);
    response.error(new HttpErrorResponse({ status: 403, error: { success: false, message: 'Csak a saját edzésadataidhoz férhetsz hozzá.' } }));
    expect(component.message).toBe('Csak a saját edzésadataidhoz férhetsz hozzá.');
    expect(component.messageType).toBe('error');
    expect(component.exportingProgramId).toBeNull();
    expect(component.canExport(program)).toBeTrue();
    component.programProgress = { 8: { programId: 8, totalWorkouts: 0 } as any };
    expect(component.canExport(program)).toBeFalse();
  });
});
