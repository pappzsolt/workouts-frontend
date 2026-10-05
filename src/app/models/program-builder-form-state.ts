import type { ProgramDto } from './backend-dto/programs/program-dto';
import type { ProgramCreationRequest } from './backend-dto/programcreator/program-creation-request';

/** Editable form data and date/request conversion; no routing or HTTP responsibilities. */
export class ProgramBuilderFormState {
  programName = '';
  programDescription = '';
  startDate = '';
  endDate = '';
  durationDays: number | null = null;
  difficultyLevel = '';

  load(program: ProgramDto): void {
    this.programName = program.programName ?? '';
    this.programDescription = program.programDescription ?? '';
    this.startDate = program.startDate ?? '';
    this.endDate = program.endDate ?? '';
    this.durationDays = program.durationDays ?? null;
    this.difficultyLevel = program.difficultyLevel ?? '';
  }

  get canSave(): boolean {
    return !!this.programName.trim() && !!this.startDate && this.durationDays !== null
      && this.durationDays > 0 && !!this.difficultyLevel;
  }

  get calculatedEndDate(): string {
    if (!this.startDate || !this.durationDays || this.durationDays <= 0) return '';
    const date = new Date(`${this.startDate}T00:00:00`);
    date.setDate(date.getDate() + this.durationDays - 1);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  toRequest(languageCode: string): ProgramCreationRequest {
    if (!this.canSave) throw new Error(this.startDate ? 'coachProgramBuilder.createError' : 'coachProgramBuilder.startDateRequired');
    return {
      programName: this.programName.trim(), programDescription: this.programDescription.trim(),
      startDate: this.startDate || null, durationDays: this.durationDays,
      difficultyLevel: this.difficultyLevel, userId: null, languageCode, workouts: null,
    };
  }
}
