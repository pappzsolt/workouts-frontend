import { BugReportAttachments } from './bug-report-attachments';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const image = (name: string) => new File([PNG], name);
function pendingImage() {
  let resolve!: (bytes: ArrayBuffer) => void;
  let reject!: (error: Error) => void;
  const bytes = new Promise<ArrayBuffer>((yes, no) => { resolve = yes; reject = no; });
  const file = image('pending.png');
  spyOn(file, 'slice').and.returnValue({ arrayBuffer: () => bytes } as Blob);
  return { file, finish: () => resolve(PNG.buffer), fail: () => reject(new Error('read failed')) };
}

describe('Bug-report attachment lifetime and concurrency', () => {
  let store: BugReportAttachments;
  beforeEach(() => {
    store = new BugReportAttachments();
    let index = 0;
    spyOn(URL, 'createObjectURL').and.callFake(() => `blob:test-${++index}`);
    spyOn(URL, 'revokeObjectURL');
  });
  afterEach(() => store.destroy());

  it('enforces the three-file limit when concurrent reads compete for the last slot', async () => {
    await store.add([image('first.png'), image('second.png')]);
    const third = pendingImage(), fourth = pendingImage();
    const additions = [store.add([third.file]), store.add([fourth.file])];
    third.finish(); fourth.finish();
    await Promise.all(additions);
    expect(store.items.length).toBe(3);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(3);
    expect(store.error).toBe('bugReport.errors.tooManyFiles');
    expect(store.errorParams).toEqual({ max: 3 });
  });

  for (const action of ['clear', 'destroy'] as const) {
    it(`does not recreate attachments after ${action} while bytes are pending`, async () => {
      await store.add([image('first.png')]);
      const pending = pendingImage();
      const addition = store.add([pending.file]);
      store[action]();
      pending.finish(); await addition;
      expect(store.items.length).toBe(0);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledOnceWith('blob:test-1');
    });
  }

  it('keeps a new report isolated from an older pending selection', async () => {
    const pending = pendingImage();
    const old = store.add([pending.file]);
    store.clear();
    await store.add([image('new-report.png')]);
    pending.finish(); await old;
    expect(store.items.map(item => item.name)).toEqual(['new-report.png']);
  });

  it('ignores stale read failures after clearing and handles current read failures', async () => {
    const old = pendingImage();
    const stale = store.add([old.file]);
    store.clear(); old.fail(); await stale;
    expect(store.error).toBe('');
    const current = pendingImage();
    const addition = store.add([current.file]);
    current.fail(); await addition;
    expect(store.error).toBe('bugReport.errors.fileType');
    expect(store.items.length).toBe(0);
  });

  it('revokes each URL once and refuses additions after destruction', async () => {
    await store.add([image('first.png'), image('second.png')]);
    store.remove(0); store.destroy(); store.destroy();
    await store.add([image('ignored.png')]);
    expect((URL.revokeObjectURL as jasmine.Spy).calls.allArgs()).toEqual([['blob:test-1'], ['blob:test-2']]);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(store.items.length).toBe(0);
  });
});
