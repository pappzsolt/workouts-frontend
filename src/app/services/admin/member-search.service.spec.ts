import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MemberSearchService } from './member-search.service';
import { API_ENDPOINTS } from '../../api-endpoints';

 describe('Member search optional coach details', () => {
  it('enriches repeated coach IDs using one list request and keeps result order', () => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    const http = TestBed.inject(HttpTestingController);
    const result = jasmine.createSpy();
    TestBed.inject(MemberSearchService).searchMembers('  name  ').subscribe(result);
    const search = http.expectOne(req => req.url === API_ENDPOINTS.memberSearch);
    expect(search.request.params.get('keyword')).toBe('name');
    search.flush({success: true, message: 'Found', data: [
      {id: 2, type: 'user', usernameOrName: 'B', email: 'b@example.com', extraFields: {coach_id: 10}},
      {id: 1, type: 'user', usernameOrName: 'A', email: 'a@example.com', extraFields: {coach_id: 10}},
      {id: 3, type: 'user', usernameOrName: 'C', email: 'c@example.com', extraFields: {coach_id: 99}},
    ]});
    http.expectOne(API_ENDPOINTS.coach).flush({success: true, data: [
      {id: 10, name: 'Trainer', avatarUrl: 'avatar.png'},
      {id: 20, name: 'Unrelated'},
    ]});
    const response = result.calls.mostRecent().args[0];
    expect(response.message).toBe('Found');
    expect(response.data.map((member: {id: number}) => member.id)).toEqual([2, 1, 3]);
    expect(response.data[0].coach).toEqual({id: 10, usernameOrName: 'Trainer', avatarUrl: 'avatar.png'});
    expect(response.data[1].coach).toEqual(response.data[0].coach);
    expect(response.data[2].coach).toBeUndefined();
    http.verify();
  });

  it('does not load coaches when no member needs enrichment', () => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    const http = TestBed.inject(HttpTestingController);
    const result = jasmine.createSpy();
    TestBed.inject(MemberSearchService).searchMembers('').subscribe(result);
    http.expectOne(req => req.url === API_ENDPOINTS.memberSearch).flush({success: true, data: []});
    expect(result.calls.mostRecent().args[0].data).toEqual([]);
    http.verify();
  });

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
      http.expectOne(API_ENDPOINTS.coach).flush({}, {status: 503, statusText: 'Unavailable'});
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
