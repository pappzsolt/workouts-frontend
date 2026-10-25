import { test as base, expect, type Page, type Route } from '@playwright/test';
export { gate } from './auth-contract-fixture';
export const REGISTRATIONS = '/api/admin/registrations';
export type Call = { method: string; path: string; query: URLSearchParams; body: any };
type Handler = (route: Route, call: Call) => Promise<void>;

export function application(id: number, status = 'PENDING', accountType = id % 2 ? 'USER' : 'COACH') {
  return {
    id, status, accountType, username: `Applicant ${String(id).padStart(3, '0')}`, email: `person${id}@example.test`,
    age: accountType === 'USER' ? 31 : null, weight: accountType === 'USER' ? 70.5 : null,
    height: accountType === 'USER' ? 170 : null, gender: accountType === 'USER' ? 'FEMALE' : null,
    goals: accountType === 'USER' ? 'Erő' : null, phone: accountType === 'COACH' ? '+36301234567' : null,
    specialization: accountType === 'COACH' ? 'Erőnlét' : null,
    rejectionReason: status === 'REJECTED' ? 'Nem ismert jelentkező.' : null,
    createdAt: '2026-10-20T10:00:00', decidedAt: status === 'PENDING' ? null : '2026-10-21T11:00:00',
    decidedBy: status === 'PENDING' ? null : 'Admin Anna', createdUserId: null, createdCoachId: null,
    assignedCoachId: status === 'APPROVED' ? 205 : null, assignedCoachName: status === 'APPROVED' ? 'Coach Carl' : null,
  };
}

export class RegistrationApi {
  calls: Call[] = [];
  unexpected: string[] = [];
  rows = [...Array.from({ length: 21 }, (_, i) => application(i + 1)), application(101, 'APPROVED'), application(102, 'REJECTED')];
  authenticated = true;
  custom = new Map<string, Handler>();
  reads() { return this.calls.filter(c => c.method === 'GET' && c.path === REGISTRATIONS); }
  writes() { return this.calls.filter(c => c.method === 'POST' && c.path.startsWith(`${REGISTRATIONS}/`)); }
  on(method: string, path: string, handler: Handler) { this.custom.set(`${method} ${path}`, handler); }
  async install(page: Page) {
    await page.addInitScript(() => { localStorage.setItem('language', 'hu'); localStorage.setItem('lang', 'hu'); });
    await page.route('**/api/**', async route => {
      const request = route.request(); const url = new URL(request.url());
      const c: Call = { method: request.method(), path: url.pathname, query: url.searchParams, body: request.postData() ? request.postDataJSON() : null };
      if (c.method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
      this.calls.push(c);
      const custom = this.custom.get(`${c.method} ${c.path}`);
      if (custom) return custom(route, c);
      const success = (data: unknown, message: string | null = null) => route.fulfill({ json: { success: true, data, message } });
      if (c.method === 'POST' && c.path === '/api/auth/web/refresh') {
        if (!this.authenticated) return route.fulfill({ status: 401, json: { success: false, data: null, message: null } });
        const payload = Buffer.from(JSON.stringify({ sub: 'contract-admin', roles: 'ROLE_ADMIN', exp: 4102444800 })).toString('base64url');
        return success({ accessToken: `eyJhbGciOiJIUzI1NiJ9.${payload}.contract` });
      }
      if (c.method === 'GET' && c.path === '/api/members/coaches') return success([{ id: 205, name: 'Coach Carl' }]);
      if (c.method === 'GET' && c.path === `${REGISTRATIONS}/pending-count`) return success({ count: this.rows.filter(r => r.status === 'PENDING').length });
      if (c.method === 'GET' && c.path === REGISTRATIONS) {
        const page = Number(c.query.get('page')); const size = Number(c.query.get('size'));
        const rows = this.rows.filter(r => r.status === c.query.get('status'));
        return success({ content: rows.slice(page * size, (page + 1) * size), page, size, totalElements: rows.length, totalPages: Math.ceil(rows.length / size) });
      }
      const decision = c.path.match(/^\/api\/admin\/registrations\/(\d+)\/(approve|reject)$/);
      if (c.method === 'POST' && decision) {
        const row = this.rows.find(r => r.id === Number(decision[1]));
        if (!row) throw new Error(`Unknown fixture application ${decision[1]}`);
        row.status = decision[2] === 'approve' ? 'APPROVED' : 'REJECTED';
        row.rejectionReason = c.body.reason ?? null;
        return success(null, decision[2] === 'approve' ? 'Jóváhagyás rögzítve.' : 'Elutasítás rögzítve.');
      }
      this.unexpected.push(`${c.method} ${c.path}`); return route.abort('blockedbyclient');
    });
  }
}

export const test = base.extend<{ api: RegistrationApi }>({
  api: async ({ page }, use) => {
    const api = new RegistrationApi(); await api.install(page); await use(api);
    expect(api.unexpected, 'Ismeretlen API-hívás nem kaphat automatikus sikeres választ').toEqual([]);
  },
});
export { expect };
