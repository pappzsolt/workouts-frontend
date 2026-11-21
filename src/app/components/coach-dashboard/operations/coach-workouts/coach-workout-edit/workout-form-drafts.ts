import type { WorkoutForm } from '../../../../../models/workout/workout-form.model';

/** Unsaved text is scoped to workout/language; other fields are shared across languages. */
export class WorkoutFormDrafts {
  private baseline?: WorkoutForm;
  private formContext = '';
  private readonly textDrafts = new Map<string, Partial<WorkoutForm>>();
  private readonly sharedDrafts = new Map<number, Partial<WorkoutForm>>();

  get context(): string {
    return this.formContext;
  }

  beginLoad(current: WorkoutForm, workoutId: number, language: string, preserveDrafts: boolean): void {
    if (preserveDrafts) this.capture(current);
    if (!this.formContext || this.baseline?.id !== workoutId) {
      this.formContext = `${workoutId}:${language}`;
      this.baseline = { ...current, id: workoutId };
    }
  }

  applyLoaded(
    current: WorkoutForm,
    loaded: WorkoutForm,
    workoutId: number,
    language: string,
    preserveDrafts: boolean,
  ): WorkoutForm {
    // Include edits entered while the request was pending, before replacing the baseline.
    if (preserveDrafts) this.capture(current);
    this.baseline = { ...loaded };
    this.formContext = `${workoutId}:${language}`;
    return {
      ...loaded,
      ...(preserveDrafts ? this.sharedDrafts.get(workoutId) : {}),
      ...(preserveDrafts ? this.textDrafts.get(this.formContext) : {}),
    };
  }

  /** Includes drafts preserved in another language for this same workout. */
  hasUnsavedChanges(current: WorkoutForm, workoutId: number | undefined): boolean {
    if (!this.baseline || !this.formContext || !workoutId || !this.formContext.startsWith(`${workoutId}:`)) return false;
    if ((Object.keys(this.baseline) as (keyof WorkoutForm)[])
      .some(key => key !== 'id' && current[key] !== this.baseline![key])) return true;
    return [...this.textDrafts].some(([context, draft]) => context !== this.formContext &&
      context.startsWith(`${workoutId}:`) && Object.keys(draft).length > 0);
  }

  /** A successful write becomes the new baseline; newer edits remain visible as dirty. */
  markSaved(submitted: WorkoutForm, workoutId: number, language: string): void {
    if (this.formContext !== `${workoutId}:${language}`) return;
    this.baseline = { ...submitted, id: workoutId };
    this.sharedDrafts.delete(workoutId);
    this.textDrafts.delete(this.formContext);
  }

  private capture(current: WorkoutForm): void {
    if (!this.baseline || !this.formContext) return;
    const text: Partial<WorkoutForm> = {};
    const shared: Partial<WorkoutForm> = {};
    for (const key of Object.keys(current) as (keyof WorkoutForm)[]) {
      if (key === 'id' || current[key] === this.baseline[key]) continue;
      const target = key === 'name' || key === 'description' ? text : shared;
      Object.assign(target, { [key]: current[key] });
    }
    this.textDrafts.set(this.formContext, text);
    this.sharedDrafts.set(this.baseline.id!, shared);
  }
}
