import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, finalize, map, tap } from 'rxjs';
import { CoachProgramService } from '../coach-program/coach-program.service';
import { LanguageService } from '../../shared/language.service';
import { responseMessage } from '../../../models/backend-dto/common/api-response-message';
import { ProgramBuilderFormState } from '../../../models/program-builder-form-state';

/** Component-scoped program loading/saving. HTTP contract and loading state live here. */
@Injectable()
export class ProgramBuilderDocumentStore {
  private readonly api = inject(CoachProgramService);
  private readonly language = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  readonly form = new ProgramBuilderFormState();
  busy = false;
  message = '';
  private loadRequest?: Subscription;

  load(programId: number, loaded: () => void, failed: (error: unknown) => void): void {
    this.loadRequest?.unsubscribe();
    this.message = '';
    this.busy = true;
    this.loadRequest = this.api.getProgramById(programId).pipe(
      tap(response => {
        if (!response.success || !response.data) throw new Error(response.message || 'coachProgramBuilder.loadProgramError');
        this.form.load(response.data);
        this.message = response.message || '';
      }),
      finalize(() => { this.busy = false; }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({ next: loaded, error: failed });
  }

  save(programId: number | null): Observable<number> {
    const request = this.form.toRequest(this.language.getCurrentLanguage());
    this.message = '';
    this.busy = true;
    const operation = programId === null ? this.api.createProgram(request) : this.api.updateProgram(programId, request);
    return operation.pipe(
      map(response => {
        if (!response.success) throw new Error(response.message || 'coachProgramBuilder.createError');
        const id = programId ?? response.data;
        if (!Number.isInteger(id) || id === null || id <= 0) throw new Error('coachProgramBuilder.createError');
        this.message = responseMessage([response], programId === null ? 'coachProgramBuilder.createSuccess' : 'coachProgramBuilder.updateSuccess');
        return id;
      }),
      finalize(() => { this.busy = false; }),
      takeUntilDestroyed(this.destroyRef),
    );
  }
}
