import React from 'react';
import { Image, Text, View } from 'react-native';

export const BUILT_IN_AVATARS = [
  { id: 'avatar-1', label: 'Power', emoji: '💪', color: '#7c3aed' },
  { id: 'avatar-2', label: 'Runner', emoji: '🏃', color: '#2563eb' },
  { id: 'avatar-3', label: 'Zen', emoji: '🧘', color: '#8b5cf6' },
  { id: 'avatar-4', label: 'Champion', emoji: '🏆', color: '#f97316' },
  { id: 'avatar-5', label: 'Cyclist', emoji: '🚴', color: '#0f766e' },
  { id: 'avatar-6', label: 'Boxer', emoji: '🥊', color: '#dc2626' },
  { id: 'avatar-7', label: 'Swimmer', emoji: '🏊', color: '#0369a1' },
  { id: 'avatar-8', label: 'Lifter', emoji: '🏋️', color: '#6d28d9' },
  { id: 'avatar-9', label: 'Hiker', emoji: '🥾', color: '#3f6212' },
  { id: 'avatar-10', label: 'Rocket', emoji: '🚀', color: '#be185d' },
];

const UserAvatar = ({ value, initials = '?', size = 72, style }) => {
  const preset = BUILT_IN_AVATARS.find((avatar) => avatar.id === value);
  const baseStyle = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: preset?.color || '#8b5cf6',
  };

  if (typeof value === 'string' && value.startsWith('data:image/')) {
    return <Image source={{ uri: value }} style={[baseStyle, style]} resizeMode="cover" />;
  }

  return (
    <View style={[baseStyle, style]}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: preset ? size * 0.43 : size * 0.32 }}>
        {preset?.emoji || initials}
      </Text>
    </View>
  );
};

export default UserAvatar;
