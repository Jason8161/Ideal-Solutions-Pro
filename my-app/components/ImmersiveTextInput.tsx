import { forwardRef } from "react";
import { TextInput } from "react-native";

import { VoiceTextInput, type VoiceTextInputProps } from "@/components/VoiceTextInput";
import { useImmersiveTextInputHandlers } from "@/hooks/useImmersiveTextInputHandlers";

/**
 * TextInput with voice dictation and immersive chrome (collapsed page header) on focus for non-home screens.
 * Prefer this on new screens; existing forms inside FormScrollView are wired automatically for plain TextInput.
 */
export const ImmersiveTextInput = forwardRef<TextInput, VoiceTextInputProps>(function ImmersiveTextInput(
  { onFocus, onBlur, containerStyle, voiceDisabled, ...rest },
  ref,
) {
  const immersive = useImmersiveTextInputHandlers();
  return (
    <VoiceTextInput
      ref={ref}
      {...rest}
      containerStyle={containerStyle}
      voiceDisabled={voiceDisabled}
      onFocus={(e) => {
        immersive.onFocus(e);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        immersive.onBlur(e);
        onBlur?.(e);
      }}
    />
  );
});
