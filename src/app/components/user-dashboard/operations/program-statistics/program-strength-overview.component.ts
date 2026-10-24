import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ProgramExerciseStatistics, ProgramStatisticsProgram } from '../../../../models/user-program-statistics.model';

interface LiftSeries {
  label: string;
  className: string;
  exercise?: ProgramExerciseStatistics;
  volumes: (number | null)[];
  estimates: (number | null)[];
}

@Component({
  selector: 'app-program-strength-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './program-strength-overview.component.html',
  styleUrl: './program-strength-overview.component.css',
})
export class ProgramStrengthOverviewComponent implements OnChanges {
  @Input({ required: true }) program!: ProgramStatisticsProgram;
  @Input() exerciseIds: number[] = [];
  selectedWeek: number | null = null;
  calculatorWeight: number | null = 120;
  calculatorReps: number | null = 5;
  get calculatedEstimate(): number | null {
    return this.calculatorWeight !== null && Number.isFinite(this.calculatorWeight) && this.calculatorWeight > 0
      && this.calculatorReps !== null && Number.isInteger(this.calculatorReps) && this.calculatorReps >= 1 && this.calculatorReps <= 10
      ? this.calculatorWeight * (1 + this.calculatorReps / 30) : null;
  }
  weeks: number[] = [];
  series: LiftSeries[] = [];
  readonly zoneLabels = ['<60%', '60–<70%', '70–<80%', '80–<90%', '90–100%', '>100%'];

  ngOnChanges(): void {
    const selected = this.exerciseIds.map(id => this.program.exerciseStatistics.find(exercise => exercise.exerciseId === id));
    this.weeks = [...new Set([
      ...this.program.weeklyVolumes.filter(week => !week.futureWeek).map(week => week.week),
      ...selected.flatMap(exercise => exercise?.weeks.map(week => week.week) ?? []),
    ])].sort((a, b) => a - b);
    if (this.selectedWeek === null || !this.weeks.includes(this.selectedWeek)) {
      this.selectedWeek = this.program.weeklyVolumes.find(week => week.currentWeek)?.week ?? this.weeks.at(-1) ?? null;
    }
    const labels = ['sbdSquat', 'sbdBench', 'sbdDeadlift'];
    const classes = ['lift-squat', 'lift-bench', 'lift-deadlift'];
    this.series = labels.map((label, index) => {
      const exercise = selected[index];
      return {
        label: 'userProgramStatistics.' + label, className: classes[index], exercise,
        volumes: this.weeks.map(week => exercise?.weeks.find(value => value.week === week)?.volumeKg ?? null),
        estimates: this.weeks.map(week => exercise?.weeks.find(value => value.week === week)?.metrics?.estimatedOneRepMaxKg ?? null),
      };
    });
  }

  get validSelection(): boolean {
    return this.exerciseIds.length === 3 && !this.exerciseIds.includes(0) && new Set(this.exerciseIds).size === 3
      && this.series.every(series => !!series.exercise);
  }
  get summaryWeek() { return this.program.weeklyVolumes.find(week => week.week === this.selectedWeek); }
  get previousWeek() { return this.program.weeklyVolumes.find(week => week.week === (this.selectedWeek ?? 0) - 1); }
  get setsChange(): number | null {
    const current = this.summaryWeek?.completedSets, previous = this.previousWeek?.completedSets;
    return current != null && previous != null ? current - previous : null;
  }
  estimatedTotal(week: number | null): number | null {
    if (!this.validSelection || week === null) return null;
    const values = this.series.map(series => series.exercise?.weeks.find(value => value.week === week)?.metrics?.estimatedOneRepMaxKg);
    return values.every(value => value != null) ? values.reduce<number>((sum, value) => sum + value!, 0) : null;
  }
  get totalChange(): number | null {
    const current = this.estimatedTotal(this.selectedWeek), previous = this.estimatedTotal(this.selectedWeek === null ? null : this.selectedWeek - 1);
    return current !== null && previous !== null ? current - previous : null;
  }
  get plannedSets(): number | null {
    return this.program.weeklyVolumes.length && this.program.weeklyVolumes.every(week => week.plannedSets != null)
      ? this.program.weeklyVolumes.reduce((sum, week) => sum + week.plannedSets!, 0) : null;
  }
  get completedPlannedSets(): number | null {
    return this.program.weeklyVolumes.length && this.program.weeklyVolumes.every(week => week.completedPlannedSets != null)
      ? this.program.weeklyVolumes.reduce((sum, week) => sum + week.completedPlannedSets!, 0) : null;
  }
  get progress(): number | null {
    return this.plannedSets && this.completedPlannedSets !== null ? this.completedPlannedSets / this.plannedSets * 100 : null;
  }
  get zones(): number[] | null {
    if (!this.validSelection) return null;
    const result = [0, 0, 0, 0, 0, 0];
    let available = false;
    for (const series of this.series) {
      const metrics = series.exercise?.weeks.find(week => week.week === this.selectedWeek)?.metrics;
      const values = [metrics?.repsBelow60Percent, metrics?.reps60To70Percent, metrics?.reps70To80Percent,
        metrics?.reps80To90Percent, metrics?.reps90To100Percent, metrics?.repsAbove100Percent];
      if (values.some(value => value == null)) continue;
      available = true;
      values.forEach((value, index) => result[index] += value!);
    }
    return available ? result : null;
  }
  get unclassifiedReps(): number {
    return this.validSelection ? this.series.reduce((sum, series) => sum + (series.exercise?.weeks.find(week => week.week === this.selectedWeek)?.repetitions ?? 0), 0)
      - (this.zones?.reduce((sum, value) => sum + value, 0) ?? 0) : 0;
  }
  get visibleZoneLabels(): string[] { return this.zoneLabels.slice(0, this.zones?.[5] ? 6 : 5); }
  get chartWidth(): number { return Math.max(720, this.weeks.length * 95 + 80); }
  get volumeMax(): number { return this.scale(this.series.flatMap(series => series.volumes)); }
  get strengthMax(): number { return this.scale(this.series.flatMap(series => series.estimates)); }
  get zoneMax(): number { return this.scale(this.zones ?? []); }
  get hasVolumes(): boolean { return this.series.some(series => series.volumes.some(value => value !== null)); }
  get hasEstimates(): boolean { return this.series.some(series => series.estimates.some(value => value !== null)); }
  private scale(values: (number | null)[]): number {
    const maximum = Math.max(0, ...values.filter((value): value is number => value !== null));
    if (maximum === 0) return 4;
    const step = 10 ** Math.floor(Math.log10(maximum)) / 2;
    return Math.ceil(maximum / (4 * step)) * 4 * step;
  }
  ticks(maximum: number): number[] { return [0, 1, 2, 3, 4].map(value => value * maximum / 4); }
  y(value: number, maximum: number): number { return 260 - value / maximum * 220; }
  x(index: number): number { return 60 + (index + 0.5) * (this.chartWidth - 80) / Math.max(1, this.weeks.length); }
  get barWidth(): number { return Math.min(26, (this.chartWidth - 80) / Math.max(1, this.weeks.length) / 4); }
  linePath(values: (number | null)[]): string {
    let previousWeek: number | null = null;
    return values.map((value, index) => {
      if (value === null) { previousWeek = null; return ''; }
      const command = previousWeek === this.weeks[index] - 1 ? 'L' : 'M';
      previousWeek = this.weeks[index];
      return `${command}${this.x(index)},${this.y(value, this.strengthMax)}`;
    }).join(' ');
  }
}
