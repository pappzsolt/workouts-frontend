import { BehaviorSubject, of } from 'rxjs';
import { ApiResponse } from '../../../../models/backend-dto/common/api-response';
import { UserProgram } from '../../../../models/program.model';
import { UserMyProgramsComponent } from './user-my-programs.component';

const program = (id: number, startDate: string, endDate: string): UserProgram => ({
  id, name: `Program ${id}`, description: null, startDate, endDate,
  durationWeeks: 4, difficulty: null, status: 'assigned', assignedAt: null,
});
const success = <T>(data: T): ApiResponse<T> => ({ success: true, data, message: null });

describe('My programs visible list', () => {
  let component: UserMyProgramsComponent;
  let getProgress: jasmine.Spy;

  beforeEach(() => jasmine.clock().install());
  afterEach(() => {
    component?.ngOnDestroy();
    jasmine.clock().uninstall();
  });

  function load(programs: UserProgram[]): void {
    // Use local noon so the test behaves identically across time zones.
    jasmine.clock().mockDate(new Date(2026, 10, 16, 12));
    getProgress = jasmine.createSpy('getProgramProgress').and.returnValue(of(success([])));
    component = new UserMyProgramsComponent(
      { getPrograms: () => of(success(programs)), getProgramProgress: getProgress } as any,
      {} as any,
      { language$: new BehaviorSubject('hu') } as any,
      {} as any,
      {} as any,
    );
    component.ngOnInit();
  }

  it('filters expired programs before pagination and progress requests', () => {
    load([
      program(1, '2026-10-13', '2026-11-15'),
      program(2, '2026-11-05', '2026-12-01'),
      program(3, '2026-11-18', '2027-01-06'),
      program(4, '2026-10-01', '2026-12-30'),
      program(5, '2026-10-13', '2026-11-16'),
    ]);
    expect(component.totalItems).toBe(3);
    expect(component.paginatedPrograms.map(p => p.id)).toEqual([3]);
    expect(getProgress).toHaveBeenCalledOnceWith([3, 2, 4]);
    component.onPageChange(2);
    expect(component.paginatedPrograms.map(p => p.id)).toEqual([2]);
    component.onSearchChange('Program 4');
    expect(component.currentPage).toBe(1);
    expect(component.paginatedPrograms.map(p => p.id)).toEqual([4]);
  });

  it('does not request progress when every program is expired', () => {
    load([
      program(1, '2026-10-13', '2026-11-15'),
      program(2, '2026-10-13', '2026-11-16'),
    ]);
    expect(component.paginatedPrograms).toEqual([]);
    expect(component.totalItems).toBe(0);
    expect(component.message).toBe('userMyPrograms.noPrograms');
    expect(getProgress).not.toHaveBeenCalled();
  });
});
