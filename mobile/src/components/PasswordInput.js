import React, { useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors, createThemedStyles, radius } from '../utils/theme';

const EyeIcon = ({ hidden }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
      stroke={colors.textSecondary}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={12} r={2.6} stroke={colors.textSecondary} strokeWidth={1.8} />
    {hidden && <Line x1={4} y1={4} x2={20} y2={20} stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" />}
  </Svg>
);

const PasswordInput = ({ style, ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={s.wrapper}>
      <TextInput {...props} style={[s.input, style, s.textInset]} secureTextEntry={!visible} />
      <TouchableOpacity
        style={s.toggle}
        onPress={() => setVisible((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        accessibilityState={{ checked: visible }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <EyeIcon hidden={visible} />
      </TouchableOpacity>
    </View>
  );
};

const s = createThemedStyles(() => ({
  wrapper: { position: 'relative', justifyContent: 'center' },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: 12,
    paddingRight: 52,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textInset: { paddingRight: 52 },
  toggle: {
    position: 'absolute',
    right: 5,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

export default PasswordInput;
