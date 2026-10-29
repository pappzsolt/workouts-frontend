import type { PersonalProgramRequest } from '../../../../models/personal-program.model';
import { errorMessage } from '../../../../models/backend-dto/common/api-response-message';

/** Shared form, lifecycle flags and validation rules for one personal editor. */
export class PersonalProgramState {
  id: number | null = null;

  started = false;

  loading = false;

  loadFailed = false;

  busy = false;

  dirty = false;

  message = '';

  messageType: 'success' | 'error' | 'info' = 'info';

  action: 'start' | 'delete' | 'copy' | 'repeat' | 'leave' | null = null;

  standaloneMode: boolean;
  model: PersonalProgramRequest;

  constructor(standaloneMode: boolean, language: string) {
    this.standaloneMode = standaloneMode;
    this.model = this.empty(language);
  }

  empty(language: string): PersonalProgramRequest {
    return {
      name: '',
      description: null,
      durationDays: this.standaloneMode ? 1 : 7,
      startDate: null,
      difficultyLevel: null,
      languageCode: language,
      workouts: this.standaloneMode
        ? [{ dayIndex: 1, name: '', description: null, exercises: [] }]
        : [],
    };
  }

  get locked(): boolean {
    return this.busy || this.started || this.loading || this.loadFailed;
  }

  get minimumStartDate(): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Budapest',
      calendar: 'gregory',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)!.value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  }

  get canStart(): boolean {
    return (
      this.id != null &&
      !this.dirty &&
      !this.locked &&
      this.withinLimits &&
      (!this.model.startDate || this.model.startDate >= this.minimumStartDate) &&
      this.model.workouts.length > 0 &&
      this.model.workouts.every((day) => day.exercises.length > 0)
    );
  }

  get withinLimits(): boolean {
    const exercises = this.model.workouts.flatMap((day) => day.exercises);
    return (
      exercises.length <= 1000 &&
      exercises.reduce((sum, exercise) => sum + exercise.sets, 0) <= 5000
    );
  }

  changed(): void {
    this.dirty = true;
    this.message = '';
  }

  label(key: string): string {
    return `${this.standaloneMode ? 'personalWorkouts' : 'personalPrograms'}.${key}`;
  }

  fail(error: unknown): void {
    this.message = errorMessage(error, 'personalPrograms.actionError');
    this.messageType = 'error';
  }
}
