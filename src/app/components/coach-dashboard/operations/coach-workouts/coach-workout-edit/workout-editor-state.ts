import { Subject } from 'rxjs';
import type { WorkoutExerciseView } from '../../../../../models/workout/workout-exercise-view.model';
import type { WorkoutForm } from '../../../../../models/workout/workout-form.model';
import type { Exercise } from '../../../../../models/exercise.model';
import type { CoachProgramUsage } from '../../../../../models/coach-workspace.model';
import { emptyWorkoutForm } from '../../../../../services/shared/workout-mapping';
import { WorkoutFormDrafts } from './workout-form-drafts';

/** State shared by metadata and exercise operations; the component exposes it to the template. */
export class WorkoutEditorState {
  readonly workoutLoadCancelled$ = new Subject<void>();
  readonly exercisesLoadCancelled$ = new Subject<void>();
  readonly workoutExercisesLoadCancelled$ = new Subject<void>();
  readonly assignmentLoadCancelled$ = new Subject<void>();
  readonly contextCancelled$ = new Subject<void>();
  readonly messageCancelled$ = new Subject<void>();
  readonly drafts = new WorkoutFormDrafts();
  loadingWorkout = false;
  savingWorkout = false;
  workoutReady = false;

  workoutId?: number;
  workout: WorkoutForm = emptyWorkoutForm();

  message = '';
  messageType: 'success' | 'error' | '' = '';

  // ----------------------------------------------------------
  // Gyakorlatok
  // ----------------------------------------------------------

  /** Igaz, ha az edzés már legalább egy programban szerepel: ekkor a gyakorlatlista zárolt. */
  workoutAssignedToProgram = false;
  checkingProgramAssignment = false;
  assignmentVerified = false;

  get canEditStructure(): boolean {
    return this.assignmentVerified && !this.checkingProgramAssignment && !this.workoutAssignedToProgram;
  }

  /** Az összes választható gyakorlat. */
  exercises: Exercise[] = [];
  /** Az edzés jelenlegi gyakorlatai. */
  workoutExercises: WorkoutExerciseView[] = [];
  selectedExerciseId: number | null = null;
  exerciseSearchTerm = '';
  loadingExercises = false;
  addingExercise = false;
  structureBusy = false;

  // Programok, amelyek használják; másolat szerkesztéshez
  usedInPrograms: CoachProgramUsage[] = [];
  copying = false;

}
