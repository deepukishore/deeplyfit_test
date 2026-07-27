import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import UserAvatar, { BUILT_IN_AVATARS } from './UserAvatar';

test('offers ten built-in avatars and renders the selected preset', () => {
  expect(BUILT_IN_AVATARS).toHaveLength(10);

  const markup = renderToStaticMarkup(
    <UserAvatar value="avatar-1" initials="AU" alt="Avatar" />
  );

  expect(markup).toContain('💪');
  expect(markup).toContain('aria-label="Avatar"');
});
