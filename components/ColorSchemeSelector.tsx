import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import {
  ColorSchemeMode,
  useColorSchemeStore,
} from '../store/colorSchemeStore';

const options: { mode: ColorSchemeMode; label: string; icon: string }[] = [
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function ColorSchemeSelector() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { colorSchemeMode, setColorSchemeMode } = useColorSchemeStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const animationHeight = useSharedValue(60); // Start with collapsed height
  const mainViewOpacity = useSharedValue(1);
  const optionsOpacity = useSharedValue(0);

  const currentOption = options.find(
    (option) => option.mode === colorSchemeMode
  );

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);

    if (!isExpanded) {
      // Expanding: fade out main view, expand height, fade in options
      mainViewOpacity.value = withTiming(0, { duration: 150 });
      animationHeight.value = withTiming(240, { duration: 300 });
      setTimeout(() => {
        optionsOpacity.value = withTiming(1, { duration: 200 });
      }, 100);
    } else {
      // Collapsing: fade out options, shrink height, fade in main view
      optionsOpacity.value = withTiming(0, { duration: 150 });
      setTimeout(() => {
        animationHeight.value = withTiming(60, { duration: 300 });
        mainViewOpacity.value = withTiming(1, { duration: 200 });
      }, 100);
    }
  };

  const handleOptionSelect = (mode: ColorSchemeMode) => {
    setColorSchemeMode(mode);
    toggleExpanded();
  };

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: animationHeight.value,
    };
  });

  const mainViewAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: mainViewOpacity.value,
    };
  });

  const optionsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: optionsOpacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.borderColor,
        },
        containerAnimatedStyle,
      ]}
    >
      {/* Main Button View */}
      <Animated.View style={[styles.mainView, mainViewAnimatedStyle]}>
        <Pressable style={styles.mainButton} onPress={toggleExpanded}>
          <View style={styles.buttonContent}>
            <Ionicons
              name={currentOption?.icon as any}
              size={20}
              color={colors.icon}
            />
            <View style={styles.buttonTextContainer}>
              <Text style={[styles.buttonTitle, { color: colors.text }]}>
                Theme
              </Text>
              <Text style={[styles.buttonSubtitle, { color: colors.icon }]}>
                {currentOption?.label || 'System'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={colors.icon} />
          </View>
        </Pressable>
      </Animated.View>

      {/* Options View */}
      <Animated.View style={[styles.optionsView, optionsAnimatedStyle]}>
        <Text style={[styles.optionsTitle, { color: colors.text }]}>
          Choose Theme
        </Text>
        <View style={styles.optionsGrid}>
          {options.map((option) => (
            <Pressable
              key={option.mode}
              style={[
                styles.optionButton,
                {
                  backgroundColor:
                    option.mode === colorSchemeMode
                      ? colors.tint + '20'
                      : colors.background,
                  borderColor:
                    option.mode === colorSchemeMode
                      ? colors.tint
                      : colors.borderColor,
                },
              ]}
              onPress={() => handleOptionSelect(option.mode)}
            >
              <Ionicons
                name={option.icon as any}
                size={24}
                color={
                  option.mode === colorSchemeMode ? colors.tint : colors.icon
                }
              />
              <Text
                style={[
                  styles.optionText,
                  {
                    color:
                      option.mode === colorSchemeMode
                        ? colors.tint
                        : colors.text,
                    fontWeight: option.mode === colorSchemeMode ? '600' : '400',
                  },
                ]}
              >
                {option.label}
              </Text>
              {option.mode === colorSchemeMode && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.tint}
                />
              )}
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  mainView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  mainButton: {
    padding: 16,
    height: 60,
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  buttonSubtitle: {
    fontSize: 14,
  },
  optionsView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    justifyContent: 'center',
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 50,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
});
