import { describe, expect, it } from 'vitest';
import { userNotificationsQueryKeys } from './query-keys';

describe('user notification query keys', () => {
  const params = { page: 1, limit: 5 };

  it('separates localized list projections while retaining one invalidation root', () => {
    const arabic = userNotificationsQueryKeys.list(params, 'ar');
    const english = userNotificationsQueryKeys.list(params, 'en');

    expect(arabic).not.toEqual(english);
    expect(arabic.slice(0, userNotificationsQueryKeys.all.length)).toEqual(
      userNotificationsQueryKeys.all,
    );
    expect(english.slice(0, userNotificationsQueryKeys.all.length)).toEqual(
      userNotificationsQueryKeys.all,
    );
  });

  it('keeps unread count locale-independent because it has no professional content', () => {
    expect(userNotificationsQueryKeys.unreadCount()).toEqual([
      ...userNotificationsQueryKeys.all,
      'unread-count',
    ]);
  });
});
