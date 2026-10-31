import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MemberSearchService } from './member-search.service';
import { API_ENDPOINTS } from '../../api-endpoints';

 describe('Member search optional coach details', () => {
  for (const failure of ['http', 'business', 'missing']) {
    it(`preserves members and other coaches after a ${failure} failure`, () => {
      TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
      const http = TestBed.inject(HttpTestingController);
      const result = jasmine.createSpy();
      TestBed.inject(MemberSearchService).searchMembers('Anna').subscribe(result);
      http.expectOne(req => req.url === API_ENDPOINTS.memberSearch).flush({success: true, data: [
        {id: 1, type: 'user', usernameOrName: 'Anna', email: 'a@example.com', extraFields: {coach_id: 10}},
        {id: 2, type: 'user', usernameOrName: 'Bela', email: 'b@example.com', extraFields: {coach_id: 20}},
      ]});
      const failed = http.expectOne(API_ENDPOINTS.coachById(10));
      if (failure === 'http') failed.flush({}, {status: 404, statusText: 'Not found'});
      else failed.flush({success: failure !== 'business', data: null});
      http.expectOne(API_ENDPOINTS.coachById(20)).flush({success: true, data: {id: 20, name: 'Coach'}});
      expect(result).toHaveBeenCalledTimes(1);
      const response = result.calls.mostRecent().args[0];
      expect(response.data.map((member: {id: number}) => member.id)).toEqual([1, 2]);
      expect(response.data[0].coach).toBeUndefined();
      expect(response.data[1].coach.usernameOrName).toBe('Coach');
      http.verify();
    });
  }
});
