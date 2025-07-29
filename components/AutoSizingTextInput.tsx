import React, { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';

interface AutoSizingTextInputProps
  extends Omit<TextInputProps, 'onContentSizeChange'> {
  value: string;
  onChangeText: (text: string) => void;
  minHeight?: number;
}

const AutoSizingTextInput = forwardRef<TextInput, AutoSizingTextInputProps>(
  ({ value, onChangeText, style, minHeight = 22, ...props }, ref) => {
    const [height, setHeight] = useState(minHeight);

    const handleContentSizeChange = (event: any) => {
      const newHeight = Math.max(
        minHeight,
        event.nativeEvent.contentSize.height
      );
      setHeight(newHeight);
    };

    return (
      <TextInput
        {...props}
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        onContentSizeChange={handleContentSizeChange}
        multiline={true}
        scrollEnabled={false}
        style={[styles.textInput, { height }, style]}
      />
    );
  }
);

AutoSizingTextInput.displayName = 'AutoSizingTextInput';

export default AutoSizingTextInput;

const styles = StyleSheet.create({
  textInput: {
    padding: 0,
    textAlignVertical: 'top',
  },
});
