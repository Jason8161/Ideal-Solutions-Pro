import { forwardRef, useMemo, type ReactNode } from "react";
import { Platform, StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";

import { VoiceMicButton } from "@/components/VoiceMicButton";
import {
  isSpeechRecognitionAvailable,
  loadSpeechRecognitionBindings,
} from "@/lib/speechRecognitionBindings";
import { useVoiceToText } from "@/lib/useVoiceToText";

export type VoiceTextInputProps = TextInputProps & {
  /** Row wrapper style (not applied to the TextInput itself). */
  containerStyle?: ViewStyle;
  /** Hide mic when the field is read-only. */
  voiceDisabled?: boolean;
};

/**
 * Drop-in TextInput with an optional mic button. Keyboard behavior is unchanged; voice is an accessory.
 */
export const VoiceTextInput = forwardRef<TextInput, VoiceTextInputProps>(function VoiceTextInput(
  props,
  ref,
) {
  const speechAvailable = useMemo(
    () => Platform.OS !== "web" && isSpeechRecognitionAvailable(),
    [],
  );

  const canDictate =
    speechAvailable &&
    props.editable !== false &&
    !props.voiceDisabled &&
    typeof props.onChangeText === "function";

  if (!canDictate) {
    const { containerStyle, voiceDisabled: _voiceDisabled, ...inputProps } = props;
    const input = <TextInput ref={ref} {...inputProps} />;
    return containerStyle ? <View style={containerStyle}>{input}</View> : input;
  }

  return <VoiceTextInputWithMic ref={ref} {...props} />;
});

const VoiceTextInputWithMic = forwardRef<TextInput, VoiceTextInputProps>(function VoiceTextInputWithMic(
  {
    value,
    onChangeText,
    style,
    containerStyle,
    multiline,
    editable = true,
    voiceDisabled: _voiceDisabled,
    ...rest
  },
  ref,
) {
  const textValue = typeof value === "string" ? value : "";

  const voice = useVoiceToText({
    value: textValue,
    onChangeText: onChangeText ?? (() => {}),
  });

  return (
    <View style={[styles.row, multiline && styles.rowMultiline, containerStyle]}>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, style]}
        multiline={multiline}
        editable={editable}
        {...rest}
      />
      {voice.available ? <VoiceMicButton {...voice} compact={!multiline} /> : null}
    </View>
  );
});

type AccessoryProps = {
  value: string;
  onChangeText: (text: string) => void;
  children: ReactNode;
  containerStyle?: ViewStyle;
};

/**
 * Wraps an existing TextInput with a mic button — same value/onChangeText as the child field.
 */
export function InputWithVoiceAccessory({ value, onChangeText, children, containerStyle }: AccessoryProps) {
  const speechAvailable = useMemo(
    () => Platform.OS !== "web" && loadSpeechRecognitionBindings() != null,
    [],
  );

  if (!speechAvailable) {
    return <View style={containerStyle}>{children}</View>;
  }

  return <InputWithVoiceAccessoryInner value={value} onChangeText={onChangeText} containerStyle={containerStyle}>
    {children}
  </InputWithVoiceAccessoryInner>;
}

function InputWithVoiceAccessoryInner({ value, onChangeText, children, containerStyle }: AccessoryProps) {
  const voice = useVoiceToText({ value, onChangeText });

  return (
    <View style={[styles.row, containerStyle]}>
      <View style={styles.input}>{children}</View>
      {voice.available ? <VoiceMicButton {...voice} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowMultiline: {
    alignItems: "flex-start",
  },
  input: {
    flex: 1,
    minWidth: 0,
  },
});
