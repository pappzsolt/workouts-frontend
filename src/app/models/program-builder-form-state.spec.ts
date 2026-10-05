import { ProgramBuilderFormState } from './program-builder-form-state';

describe('ProgramBuilderFormState', () => {
  it('keeps inclusive end dates across month and leap-year boundaries', () => {
    const form = new ProgramBuilderFormState();
    form.startDate = '2035-03-15'; form.durationDays = 7;
    expect(form.calculatedEndDate).toBe('2035-03-21');
    form.startDate = '2032-02-28'; form.durationDays = 3;
    expect(form.calculatedEndDate).toBe('2032-03-01');
  });

  it('keeps the existing request contract and does not mix assignments into the form', () => {
    const form = new ProgramBuilderFormState();
    form.programName = ' Program '; form.programDescription = ' Description ';
    form.startDate = '2035-03-15'; form.durationDays = 7; form.difficultyLevel = 'BEGINNER';
    expect(form.toRequest('hu')).toEqual({
      programName: 'Program', programDescription: 'Description', startDate: '2035-03-15',
      durationDays: 7, difficultyLevel: 'BEGINNER', userId: null, languageCode: 'hu', workouts: null,
    });
    form.startDate = '';
    expect(() => form.toRequest('hu')).toThrowError('coachProgramBuilder.startDateRequired');
  });
});
