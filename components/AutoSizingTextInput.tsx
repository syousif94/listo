import React, { forwardRef } from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputContentSizeChangeEventData,
  TextInputProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

interface AutoSizingTextInputProps
  extends Omit<TextInputProps, 'onContentSizeChange'> {
  value: string;
  onChangeText: (text: string) => void;
  minHeight?: number;
  onContentSizeChange?: (event: any) => void;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const AutoSizingTextInput = forwardRef<TextInput, AutoSizingTextInputProps>(
  ({ value, onChangeText, style, onContentSizeChange, ...props }, ref) => {
    const height = useSharedValue<number | undefined>(undefined);

    const handleContentSizeChange = (
      event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>
    ) => {
      const newHeight = event.nativeEvent.contentSize.height;

      height.value = newHeight;
    };

    const animatedStyle = useAnimatedStyle(() => ({
      height: height.value || undefined,
    }));

    return (
      <AnimatedTextInput
        {...props}
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        onContentSizeChange={handleContentSizeChange}
        multiline={true}
        scrollEnabled={false}
        style={[styles.textInput, style, animatedStyle]}
      />
    );
  }
);

AutoSizingTextInput.displayName = 'AutoSizingTextInput';

export default AutoSizingTextInput;

const styles = StyleSheet.create({
  textInput: {
    padding: 0,
  },
});
