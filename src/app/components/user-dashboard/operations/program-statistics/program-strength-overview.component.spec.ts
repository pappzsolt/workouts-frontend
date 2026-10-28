import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ProgramStrengthOverviewComponent } from './program-strength-overview.component';
import { defaultMainLifts } from './program-statistics.component';
import { ProgramExerciseWeekMetrics, ProgramStatisticsProgram } from '../../../../models/user-program-statistics.model';

function metrics(estimate: number): ProgramExerciseWeekMetrics {
  return {
    estimatedOneRepMaxKg: estimate, bestSingleKg: null, referenceOneRepMaxKg: estimate,
    relativeIntensityPercent: 70, topSetWeightKg: 70, topSetRepetitions: 5, workoutCount: 1, activeDays: 1,
    targetRepetitions: 21, targetVolumeKg: 1000, averagePrescribedRestSeconds: 90,
    repsBelow60Percent: 2, reps60To80Percent: 7, repsAtLeast80Percent: 12,
    reps60To70Percent: 3, reps70To80Percent: 4, reps80To90Percent: 5, reps90To100Percent: 6,
    repsAbove100Percent: 1, estimatedOneRepMaxPr: false, maxWeightPr: false,
  };
}
function program(): ProgramStatisticsProgram {
  return {
    programId: 1, programName: 'Program', totalWorkouts: 4, completedWorkouts: 2, incompleteWorkouts: 2, completed: false,
    startDate: null, endDate: null, status: null,
    weeklyVolumes: [1, 2, 3, 4].map((week, index) => ({
      week, weekStart: '2026-10-01', futureWeek: week === 4, currentWeek: week === 3,
      volumeKg: week * 3000, changePercent: index ? 50 : null, completedSets: week * 10,
      repetitions: week * 100, plannedSets: 10, completedPlannedSets: [10, 5, 0, 0][index],
    })),
    exerciseStatistics: ['Guggolás', 'Fekvenyomás rúddal', 'Felhúzás'].map((exerciseName, index) => ({
      exerciseId: index + 1, exerciseName, planWeeks: [],
      weeks: [1, 3].map(week => ({
        week, completedSets: 3, repetitions: 21, volumeKg: 1000 * (index + 1), volumeChangePercent: null,
        maxWeightKg: 80, maxWeightChangeKg: null, maxWeightChangePercent: null,
        metrics: metrics((index + 1) * 100 - (week === 1 ? 10 : 0)),
      })),
    })),
  };
}
function overview() {
  const component = new ProgramStrengthOverviewComponent();
  component.program = program();
  component.exerciseIds = [1, 2, 3];
  component.ngOnChanges();
  return component;
}

describe('Powerlifting charts and Epley calculator', () => {
  it('uses all program sets for progress, including future plans, and selects the current week', () => {
    const component = overview();
    expect(component.weeks).toEqual([1, 2, 3]);
    expect(component.selectedWeek).toBe(3);
    expect(component.summaryWeek!.volumeKg).toBe(9000);
    expect(component.setsChange).toBe(10);
    expect(component.progress).toBe(37.5);
    expect(component.estimatedTotal(3)).toBe(600);
    expect(component.totalChange).toBeNull();
    component.program.weeklyVolumes.forEach(week => week.plannedSets = 0);
    expect(component.progress).toBeNull();
  });

  it('does not turn missing weekly measurements into zero or bridge line gaps', () => {
    const component = overview();
    expect(component.series[0].estimates).toEqual([90, null, 100]);
    const path = component.linePath(component.series[0].estimates);
    expect(path.match(/M/g)?.length).toBe(2);
    expect(path).not.toContain('L');
    component.exerciseIds = [1, 1, 3];
    component.ngOnChanges();
    expect(component.validSelection).toBeFalse();
    expect(component.estimatedTotal(3)).toBeNull();
    expect(component.zones).toBeNull();
  });

  it('keeps the five zones disjoint, exposes overflow, and reports unclassified repetitions', () => {
    const component = overview();
    expect(component.zones).toEqual([6, 9, 12, 15, 18, 3]);
    expect(component.visibleZoneLabels.length).toBe(6);
    expect(component.unclassifiedReps).toBe(0);
    component.program.exerciseStatistics[0].weeks[1].metrics = null;
    expect(component.zones).toEqual([4, 6, 8, 10, 12, 2]);
    expect(component.unclassifiedReps).toBe(21);
  });

  it('matches the supplied Epley example and rejects invalid calculator input', () => {
    const component = overview();
    expect(component.calculatedEstimate).toBe(140);
    component.calculatorReps = 1;
    expect(component.calculatedEstimate).toBeCloseTo(124);
    for (const value of [0, -1, 2.5, 11, null]) {
      component.calculatorReps = value;
      expect(component.calculatedEstimate).toBeNull();
    }
    component.calculatorReps = 5;
    for (const value of [0, -1, Infinity, NaN, null]) {
      component.calculatorWeight = value;
      expect(component.calculatedEstimate).toBeNull();
    }
  });

  it('preselects only unambiguous main lift names, excluding variants', () => {
    const source = program();
    expect(defaultMainLifts(source)).toEqual([1, 2, 3]);
    source.exerciseStatistics[1].exerciseName = 'Fekvenyomás egykezesekkel';
    expect(defaultMainLifts(source)).toEqual([1, 0, 3]);
    source.exerciseStatistics.push({ ...source.exerciseStatistics[0], exerciseId: 99 });
    expect(defaultMainLifts(source)).toEqual([0, 0, 3]);
  });

  it('renders three accessible charts, exact data, the progress bar and the live formula', () => {
    TestBed.configureTestingModule({ imports: [ProgramStrengthOverviewComponent], providers: [provideTranslateService()] });
    const fixture = TestBed.createComponent(ProgramStrengthOverviewComponent);
    fixture.componentRef.setInput('program', program());
    fixture.componentRef.setInput('exerciseIds', [1, 2, 3]);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('svg[role="img"]').length).toBe(3);
    expect(element.querySelectorAll('svg title').length).toBeGreaterThan(3);
    expect(element.querySelector('table')).not.toBeNull();
    expect(element.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('37.5');
    expect(element.textContent).toContain('120 × (1 + 5 / 30) = 140 kg');
    fixture.destroy();
  });
});
