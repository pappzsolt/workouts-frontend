import { TestBed } from '@angular/core/testing';
import type { NgForm } from '@angular/forms';
import { Subject } from 'rxjs';
import { UserNewService } from './user-new.service';
import { UserNewComponent } from '../../components/admin-dashboard/operations/user-new/user-new.component';
import { NewExerciseComponent } from '../../components/coach-dashboard/operations/coach-exercises/coach-exercise-new/new-exercise.component';
import { ExerciseService } from '../coach/coach-exercises/coach-exercises.service';
import { LoggerService } from '../logger.service';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { Exercise } from '../../models/exercise.model';

describe('Create form regressions', () => {
  it('replaces the previously selected role and submits exactly one role', () => {
    const request = new Subject<ApiResponse<void>>();
    const create = jasmine.createSpy('createUser').and.returnValue(request);
    TestBed.configureTestingModule({providers: [{provide: UserNewService, useValue: {createUser: create}}]});
    const component = TestBed.runInInjectionContext(() => new UserNewComponent(TestBed.inject(UserNewService)));
    component.user.username = 'test-user';
    component.user.email = 'user@example.com';
    component.user.passwordHash = 'Password123';
    component.onRoleSelected({id: 1, name: 'USER'});
    component.onRoleSelected({id: 2, name: 'ADMIN'});
    component.onSubmit({valid: true} as NgForm);
    expect(component.user.roleIds.length).toBe(1);
    expect(create.calls.first().args[0].roleIds).toEqual([2]);
  });

  it('preserves newer exercise data and uses the submitted name in its success message', () => {
    const request = new Subject<ApiResponse<Exercise>>();
    const add = jasmine.createSpy('addExercise').and.returnValue(request);
    TestBed.configureTestingModule({providers: [
      {provide: ExerciseService, useValue: {addExercise: add}},
      {provide: LoggerService, useValue: {error: () => {}}},
    ]});
    const component = TestBed.runInInjectionContext(() => new NewExerciseComponent(TestBed.inject(ExerciseService)));
    component.newExercise.name = 'Submitted exercise';
    component.newExercise.description = 'Submitted description';
    component.addExercise();
    component.newExercise.name = 'New unsaved exercise';
    component.newExercise.description = 'New unsaved description';
    request.next({success: true, message: null, data: null});
    expect(add.calls.first().args[0].name).toBe('Submitted exercise');
    expect(component.newExercise.name).toBe('New unsaved exercise');
    expect(component.newExercise.description).toBe('New unsaved description');
    expect(component.messageParams['name']).toBe('Submitted exercise');
  });
  it('rejects an invalid multi-role state before submitting', () => {
    const create = jasmine.createSpy('createUser');
    TestBed.configureTestingModule({providers: [{provide: UserNewService, useValue: {createUser: create}}]});
    const component = TestBed.runInInjectionContext(() => new UserNewComponent(TestBed.inject(UserNewService)));
    component.user.roleIds = [{id: 1, name: 'USER'}, {id: 2, name: 'ADMIN'}];
    component.onSubmit({valid: true} as NgForm);
    expect(create).not.toHaveBeenCalled();
    expect(component.messageType).toBe('error');
  });

  function exerciseForm() {
    const response = new Subject<ApiResponse<Exercise>>();
    const add = jasmine.createSpy('addExercise').and.returnValue(response);
    TestBed.configureTestingModule({providers: [
      {provide: ExerciseService, useValue: {addExercise: add}},
      {provide: LoggerService, useValue: {error: () => {}}},
    ]});
    const component = TestBed.runInInjectionContext(() => new NewExerciseComponent(TestBed.inject(ExerciseService)));
    component.newExercise.name = 'Submitted exercise';
    component.newExercise.description = 'Submitted description';
    return {component, response, add};
  }

  it('resets successfully created values when no newer edit exists', () => {
    const {component, response} = exerciseForm();
    component.addExercise();
    response.next({success: true, data: null, message: null});
    expect(component.newExercise.name).toBe('');
    expect(component.newExercise.description).toBe('');
    expect(component.messageParams['name']).toBe('Submitted exercise');
  });

  it('preserves only edited fields and prevents duplicate creation while saving', () => {
    const {component, response, add} = exerciseForm();
    component.addExercise();
    component.newExercise.description = 'New description';
    component.addExercise();
    expect(add.calls.count()).toBe(1);
    response.next({success: true, data: null, message: 'Created'});
    expect(component.newExercise.name).toBe('');
    expect(component.newExercise.description).toBe('New description');
    expect(component.messageParams).toEqual({});
  });

  it('keeps current exercise values on failure and permits retry', () => {
    const {component, response, add} = exerciseForm();
    component.addExercise();
    component.newExercise.name = 'Edited while pending';
    response.next({success: false, data: null, message: 'Rejected'});
    expect(component.newExercise.name).toBe('Edited while pending');
    expect(component.saving).toBeFalse();
    component.addExercise();
    expect(add.calls.count()).toBe(2);
    expect(add.calls.mostRecent().args[0].name).toBe('Edited while pending');
  });

});
