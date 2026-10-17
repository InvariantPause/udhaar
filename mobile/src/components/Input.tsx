import { StyleSheet, TextInput, View, type KeyboardTypeOptions, type StyleProp, type TextStyle } from 'react-native';
import { colors, fonts, radius } from '@/design';
import { FieldLabel } from './Field';

interface InputProps {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  maxLength?: number;
  style?: StyleProp<TextStyle>;
}

/** The one text input style — inset surface, hairline border. */
export function Input({
  value,
  onChangeText,
  label,
  placeholder,
  autoFocus = false,
  keyboardType,
  multiline = false,
  maxLength,
  style,
}: InputProps) {
  return (
    <View style={styles.wrap}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted2}
        selectionColor={colors.white}
        cursorColor={colors.white}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength}
        style={[styles.input, multiline && styles.multiline, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  input: {
    backgroundColor: colors.surface2,
    borderColor: colors.line2,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    fontSize: 15,
    letterSpacing: -0.2,
    color: colors.text,
  },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
});
