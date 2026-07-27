import React from 'react';

export const BUILT_IN_AVATARS = [
  { id: 'avatar-1', label: 'Power', emoji: '💪', start: '#7c3aed', end: '#ec4899' },
  { id: 'avatar-2', label: 'Runner', emoji: '🏃', start: '#2563eb', end: '#22d3ee' },
  { id: 'avatar-3', label: 'Zen', emoji: '🧘', start: '#8b5cf6', end: '#c084fc' },
  { id: 'avatar-4', label: 'Champion', emoji: '🏆', start: '#f97316', end: '#facc15' },
  { id: 'avatar-5', label: 'Cyclist', emoji: '🚴', start: '#0f766e', end: '#2dd4bf' },
  { id: 'avatar-6', label: 'Boxer', emoji: '🥊', start: '#dc2626', end: '#fb7185' },
  { id: 'avatar-7', label: 'Swimmer', emoji: '🏊', start: '#0369a1', end: '#38bdf8' },
  { id: 'avatar-8', label: 'Lifter', emoji: '🏋️', start: '#6d28d9', end: '#a855f7' },
  { id: 'avatar-9', label: 'Hiker', emoji: '🥾', start: '#3f6212', end: '#84cc16' },
  { id: 'avatar-10', label: 'Rocket', emoji: '🚀', start: '#be185d', end: '#f472b6' },
];

const UserAvatar = ({ value, initials = '?', className = '', alt = '' }) => {
  const preset = BUILT_IN_AVATARS.find((avatar) => avatar.id === value);
  const hasCustomImage = typeof value === 'string' && value.startsWith('data:image/');
  const accessibilityProps = alt
    ? { role: 'img', 'aria-label': alt }
    : { 'aria-hidden': true };

  return (
    <span
      className={`account-avatar-visual ${preset ? 'account-avatar-preset' : ''} ${className}`.trim()}
      style={preset ? { '--avatar-start': preset.start, '--avatar-end': preset.end } : undefined}
      {...accessibilityProps}
    >
      {hasCustomImage && <img src={value} alt="" />}
      {!hasCustomImage && preset && <span className="account-avatar-emoji">{preset.emoji}</span>}
      {!hasCustomImage && !preset && <span className="account-avatar-initials">{initials}</span>}
    </span>
  );
};

export default UserAvatar;
