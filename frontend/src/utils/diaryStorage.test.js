import {
  getCachedDiaryDate,
  readOfflineQueue,
  setDiaryStorageUser,
  updateCachedDiaryDate,
  writeOfflineQueue,
} from './diaryStorage';

describe('account-scoped offline diary storage', () => {
  beforeEach(() => {
    localStorage.clear();
    setDiaryStorageUser(null);
  });

  test('keeps cached and queued data isolated between accounts', () => {
    setDiaryStorageUser(101);
    updateCachedDiaryDate('2026-07-26', () => ({
      logs: [{ id: 1, food_name: 'Account A meal' }],
      summary: null,
    }));
    writeOfflineQueue([{ type: 'logFood', payload: { food_name: 'Account A meal' } }]);

    setDiaryStorageUser(202);
    expect(getCachedDiaryDate('2026-07-26').logs).toEqual([]);
    expect(readOfflineQueue()).toEqual([]);

    writeOfflineQueue([{ type: 'logFood', payload: { food_name: 'Account B meal' } }]);

    setDiaryStorageUser(101);
    expect(getCachedDiaryDate('2026-07-26').logs[0].food_name).toBe('Account A meal');
    expect(readOfflineQueue()[0].payload.food_name).toBe('Account A meal');

    setDiaryStorageUser(202);
    expect(readOfflineQueue()[0].payload.food_name).toBe('Account B meal');
  });

  test('migrates legacy offline data into the authenticated account once', () => {
    localStorage.setItem(
      'deeply_fit_diary_queue_v1',
      JSON.stringify([{ type: 'logFood', payload: { food_name: 'Legacy meal' } }])
    );

    setDiaryStorageUser(303);

    expect(readOfflineQueue()[0].payload.food_name).toBe('Legacy meal');
    expect(localStorage.getItem('deeply_fit_diary_queue_v1')).toBeNull();
  });
});
