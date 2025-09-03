import { format } from 'date-fns';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import {
  FlatList,
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDatePickerStore } from '../store/datePickerStore';
import { useTodoStore } from '../store/todoStore';

const ROW_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ROW_HEIGHT * VISIBLE_ITEMS;

// Animated picker item component
const AnimatedPickerItem = ({
  item,
  index,
  onPress,
  isInitialValue,
}: {
  item: any;
  index: number;
  onPress: () => void;
  isInitialValue: boolean;
}) => {
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    opacity.value = withTiming(0.3, { duration: 100 });
  };

  const handlePressOut = () => {
    opacity.value = withTiming(1, { duration: 100 });
  };

  return (
    <Pressable
      style={styles.pickerItem}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.Text
        style={[
          styles.pickerText,
          isInitialValue && styles.pickerTextBold,
          animatedStyle,
        ]}
      >
        {item.label}
      </Animated.Text>
    </Pressable>
  );
};

// Animated button component for header
const AnimatedHeaderButton = ({
  onPress,
  children,
  style,
}: {
  onPress: () => void;
  children: React.ReactNode;
  style?: any;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.headerButton, style]}
    >
      <Animated.View style={[styles.headerButtonContent, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function DateTimePicker() {
  const {
    isVisible,
    initialDate,
    target,
    hideDatePicker,
    onNewTodoDate,
    tempSelectedDate,
    tempSelectedHour,
    tempSelectedMinute,
    tempSelectedAmPm,
    tempSelectedYear,
    updateTempValues,
  } = useDatePickerStore();
  const updateTodo = useTodoStore((state) => state.updateTodo);
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(PICKER_HEIGHT + 100);
  const headerTranslateY = useSharedValue(PICKER_HEIGHT + 100);
  const opacity = useSharedValue(0);

  // Refs for scroll positions
  const dateListRef = useRef<FlatList>(null);
  const hourListRef = useRef<FlatList>(null);
  const minuteListRef = useRef<FlatList>(null);
  const ampmListRef = useRef<FlatList>(null);
  const yearListRef = useRef<FlatList>(null);

  // Current selected values from store
  const selectedDate = tempSelectedDate;
  const selectedHour = tempSelectedHour;
  const selectedMinute = tempSelectedMinute;
  const selectedAmPm = tempSelectedAmPm;
  const selectedYear = tempSelectedYear;

  // Generate data arrays
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = -30; i <= 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        id: i.toString(),
        date: date,
        label: format(date, 'EEE MMM d'),
      });
    }
    return dates;
  };

  const generateHours = () => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i.toString(),
      value: i + 1,
      label: (i + 1).toString(),
    }));
  };

  const generateMinutes = () => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i.toString(),
      value: i * 5,
      label: (i * 5).toString().padStart(2, '0'),
    }));
  };

  const generateAmPm = () => [
    { id: '0', value: 0, label: 'AM' },
    { id: '1', value: 1, label: 'PM' },
  ];

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => ({
      id: i.toString(),
      value: currentYear + i,
      label: (currentYear + i).toString(),
    }));
  };

  const dates = generateDates();
  const hours = generateHours();
  const minutes = generateMinutes();
  const ampmData = generateAmPm();
  const years = generateYears();

  useEffect(() => {
    // Animation and scrolling when visibility changes
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      headerTranslateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 200 });

      // Scroll to initial positions immediately
      const todayIndex = dates.findIndex(
        (d) => d.date.toDateString() === initialDate.toDateString()
      );

      // Find next 5-minute interval
      const currentMinutes = initialDate.getMinutes();
      const nextFiveMinInterval = Math.ceil(currentMinutes / 5) * 5;

      let adjustedDate = new Date(initialDate);
      let adjustedMinute = nextFiveMinInterval;

      // Handle rollover to next hour
      if (nextFiveMinInterval >= 60) {
        adjustedDate.setHours(adjustedDate.getHours() + 1);
        adjustedMinute = 0;
      }

      const hourIndex = hours.findIndex(
        (h) => h.value === (adjustedDate.getHours() % 12 || 12)
      );

      const minuteIndex = minutes.findIndex((m) => m.value === adjustedMinute);

      const ampmIndex = adjustedDate.getHours() >= 12 ? 1 : 0;
      const yearIndex = years.findIndex(
        (y) => y.value === initialDate.getFullYear()
      );

      if (todayIndex >= 0) {
        dateListRef.current?.scrollToIndex({
          index: todayIndex,
          animated: false,
        });
      }
      if (hourIndex >= 0) {
        hourListRef.current?.scrollToIndex({
          index: hourIndex,
          animated: false,
        });
      }
      if (minuteIndex >= 0) {
        minuteListRef.current?.scrollToIndex({
          index: minuteIndex,
          animated: false,
        });
      }
      if (ampmIndex >= 0) {
        ampmListRef.current?.scrollToIndex({
          index: ampmIndex,
          animated: false,
        });
      }
      if (yearIndex >= 0) {
        yearListRef.current?.scrollToIndex({
          index: yearIndex,
          animated: false,
        });
      }
    } else {
      translateY.value = withSpring(PICKER_HEIGHT + 100, {
        damping: 20,
        stiffness: 300,
      });
      headerTranslateY.value = withSpring(PICKER_HEIGHT + 100, {
        damping: 20,
        stiffness: 300,
      });
      opacity.value = withTiming(0, { duration: 200 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, initialDate]);

  const pickerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleConfirm = () => {
    try {
      const finalDate = new Date(selectedDate);
      finalDate.setHours(
        selectedAmPm === 1
          ? selectedHour === 12
            ? 12
            : selectedHour + 12
          : selectedHour === 12
          ? 0
          : selectedHour
      );
      finalDate.setMinutes(selectedMinute);
      finalDate.setFullYear(selectedYear);

      const finalDateISO = finalDate.toISOString();

      // Define callback outside of withTiming
      const handleConfirmCallback = (dateISO: string) => {
        try {
          if (target) {
            if (target.type === 'todo' && target.id) {
              updateTodo(target.listId, target.id, {
                dueDate: dateISO,
              });
            } else if (target.type === 'newTodo') {
              onNewTodoDate?.(target.listId, dateISO);
            }
          }
          hideDatePicker();
        } catch (error) {
          console.log('Error in handleConfirmCallback:', error);
          hideDatePicker();
        }
      };

      // Animation before confirming
      translateY.value = withSpring(PICKER_HEIGHT + 100, {
        damping: 20,
        stiffness: 300,
      });
      headerTranslateY.value = withSpring(PICKER_HEIGHT + 100, {
        damping: 20,
        stiffness: 300,
      });
      opacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(handleConfirmCallback)(finalDateISO);
        }
      });
    } catch (error) {
      console.log('Error in handleConfirm:', error);
      hideDatePicker();
    }
  };

  const handleClear = () => {
    try {
      // Clear the due date if editing an existing todo
      if (target?.type === 'todo' && target.id) {
        updateTodo(target.listId, target.id, { dueDate: undefined });
      }

      // Animation before clearing
      translateY.value = withSpring(PICKER_HEIGHT + 100, {
        damping: 20,
        stiffness: 300,
      });
      headerTranslateY.value = withSpring(PICKER_HEIGHT + 100, {
        damping: 20,
        stiffness: 300,
      });
      opacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(hideDatePicker)();
        }
      });
    } catch (error) {
      console.log('Error in handleClear:', error);
      hideDatePicker();
    }
  };

  const handleOverlayPress = () => {
    // Dismiss without saving
    translateY.value = withSpring(PICKER_HEIGHT + 100, {
      damping: 20,
      stiffness: 300,
    });
    headerTranslateY.value = withSpring(PICKER_HEIGHT + 100, {
      damping: 20,
      stiffness: 300,
    });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(hideDatePicker)();
      }
    });
  };

  const renderDateItem = ({ item, index }: { item: any; index: number }) => {
    const isInitialValue =
      item.date.toDateString() === initialDate.toDateString();

    const handlePress = () => {
      updateTempValues({ date: item.date });
      dateListRef.current?.scrollToIndex({ index, animated: true });
    };

    return (
      <AnimatedPickerItem
        item={item}
        index={index}
        onPress={handlePress}
        isInitialValue={isInitialValue}
      />
    );
  };

  const renderHourItem = ({ item, index }: { item: any; index: number }) => {
    const handlePress = () => {
      updateTempValues({ hour: item.value });
      hourListRef.current?.scrollToIndex({ index, animated: true });
    };

    return (
      <AnimatedPickerItem
        item={item}
        index={index}
        onPress={handlePress}
        isInitialValue={false}
      />
    );
  };

  const renderMinuteItem = ({ item, index }: { item: any; index: number }) => {
    const handlePress = () => {
      updateTempValues({ minute: item.value });
      minuteListRef.current?.scrollToIndex({ index, animated: true });
    };

    return (
      <AnimatedPickerItem
        item={item}
        index={index}
        onPress={handlePress}
        isInitialValue={false}
      />
    );
  };

  const renderAmPmItem = ({ item, index }: { item: any; index: number }) => {
    // Need to account for potential hour rollover from minute adjustment
    const currentMinutes = initialDate.getMinutes();
    const nextFiveMinInterval = Math.ceil(currentMinutes / 5) * 5;
    let adjustedDate = new Date(initialDate);
    if (nextFiveMinInterval >= 60) {
      adjustedDate.setHours(adjustedDate.getHours() + 1);
    }

    const handlePress = () => {
      updateTempValues({ ampm: item.value });
      ampmListRef.current?.scrollToIndex({ index, animated: true });
    };

    return (
      <AnimatedPickerItem
        item={item}
        index={index}
        onPress={handlePress}
        isInitialValue={false}
      />
    );
  };

  const renderYearItem = ({ item, index }: { item: any; index: number }) => {
    const handlePress = () => {
      updateTempValues({ year: item.value });
      yearListRef.current?.scrollToIndex({ index, animated: true });
    };

    return (
      <AnimatedPickerItem
        item={item}
        index={index}
        onPress={handlePress}
        isInitialValue={false}
      />
    );
  };

  const handleDateScrollEnd = (event: any) => {
    const offset = event.nativeEvent.contentOffset.y;
    const index = Math.round(offset / ROW_HEIGHT);
    const selectedItem = dates[index];
    if (selectedItem) {
      updateTempValues({ date: selectedItem.date });
    }
  };

  const handleHourScrollEnd = (event: any) => {
    const offset = event.nativeEvent.contentOffset.y;
    const index = Math.round(offset / ROW_HEIGHT);
    const selectedItem = hours[index];
    if (selectedItem) {
      updateTempValues({ hour: selectedItem.value });
    }
  };

  const handleMinuteScrollEnd = (event: any) => {
    const offset = event.nativeEvent.contentOffset.y;
    const index = Math.round(offset / ROW_HEIGHT);
    const selectedItem = minutes[index];
    if (selectedItem) {
      updateTempValues({ minute: selectedItem.value });
    }
  };

  const handleAmPmScrollEnd = (event: any) => {
    const offset = event.nativeEvent.contentOffset.y;
    const index = Math.round(offset / ROW_HEIGHT);
    const selectedItem = ampmData[index];
    if (selectedItem) {
      updateTempValues({ ampm: selectedItem.value });
    }
  };

  const handleYearScrollEnd = (event: any) => {
    const offset = event.nativeEvent.contentOffset.y;
    const index = Math.round(offset / ROW_HEIGHT);
    const selectedItem = years[index];
    if (selectedItem) {
      updateTempValues({ year: selectedItem.value });
    }
  };

  // if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable
          style={styles.overlayPressable}
          onPress={handleOverlayPress}
        />
      </Animated.View>

      {/* Header */}
      <Animated.View
        style={[
          styles.headerContainer,
          headerStyle,
          { bottom: insets.bottom + PICKER_HEIGHT + 8 },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerButtonContainer}>
            <BlurView
              intensity={80}
              style={styles.headerBlur}
              tint="extraLight"
            >
              <AnimatedHeaderButton onPress={handleClear}>
                <Text style={styles.clearText}>Clear</Text>
              </AnimatedHeaderButton>
            </BlurView>
          </View>

          <View style={styles.headerButtonContainer}>
            <BlurView
              intensity={80}
              style={styles.headerBlur}
              tint="extraLight"
            >
              <AnimatedHeaderButton onPress={handleConfirm}>
                <Text style={styles.saveText}>Save</Text>
              </AnimatedHeaderButton>
            </BlurView>
          </View>
        </View>
      </Animated.View>

      {/* Picker */}
      <Animated.View
        style={[styles.pickerContainer, pickerStyle, { bottom: insets.bottom }]}
      >
        <BlurView intensity={80} style={styles.pickerBlur} tint="extraLight">
          {/* Picker Lists */}
          <View style={styles.pickersContainer}>
            {/* Date */}
            <View style={styles.datePickerColumn}>
              <FlatList
                ref={dateListRef}
                data={dates}
                renderItem={renderDateItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                snapToInterval={ROW_HEIGHT}
                onMomentumScrollEnd={handleDateScrollEnd}
                contentContainerStyle={styles.listContainer}
                getItemLayout={(data, index) => ({
                  length: ROW_HEIGHT,
                  offset: ROW_HEIGHT * index,
                  index,
                })}
              />
            </View>

            <View style={styles.divider} />

            {/* Hour */}
            <View style={styles.pickerColumn}>
              <FlatList
                ref={hourListRef}
                data={hours}
                renderItem={renderHourItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                snapToInterval={ROW_HEIGHT}
                onMomentumScrollEnd={handleHourScrollEnd}
                contentContainerStyle={styles.listContainer}
                getItemLayout={(data, index) => ({
                  length: ROW_HEIGHT,
                  offset: ROW_HEIGHT * index,
                  index,
                })}
              />
            </View>

            <View style={styles.divider} />

            {/* Minute */}
            <View style={styles.pickerColumn}>
              <FlatList
                ref={minuteListRef}
                data={minutes}
                renderItem={renderMinuteItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                snapToInterval={ROW_HEIGHT}
                onMomentumScrollEnd={handleMinuteScrollEnd}
                contentContainerStyle={styles.listContainer}
                getItemLayout={(data, index) => ({
                  length: ROW_HEIGHT,
                  offset: ROW_HEIGHT * index,
                  index,
                })}
              />
            </View>

            <View style={styles.divider} />

            {/* AM/PM */}
            <View style={styles.pickerColumn}>
              <FlatList
                ref={ampmListRef}
                data={ampmData}
                renderItem={renderAmPmItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                snapToInterval={ROW_HEIGHT}
                onMomentumScrollEnd={handleAmPmScrollEnd}
                contentContainerStyle={styles.listContainer}
                getItemLayout={(data, index) => ({
                  length: ROW_HEIGHT,
                  offset: ROW_HEIGHT * index,
                  index,
                })}
              />
            </View>

            <View style={styles.divider} />

            {/* Year */}
            <View style={styles.pickerColumn}>
              <FlatList
                ref={yearListRef}
                data={years}
                renderItem={renderYearItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                snapToInterval={ROW_HEIGHT}
                onMomentumScrollEnd={handleYearScrollEnd}
                contentContainerStyle={styles.listContainer}
                getItemLayout={(data, index) => ({
                  length: ROW_HEIGHT,
                  offset: ROW_HEIGHT * index,
                  index,
                })}
              />
            </View>
          </View>

          {/* Selection Indicator */}
          <View style={styles.selectionIndicator} pointerEvents="none" />
        </BlurView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    zIndex: 1000,
  },
  overlayPressable: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 60,
    zIndex: 1002,
  },
  headerBlur: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1 / PixelRatio.get(),
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    height: 60,
  },
  headerButtonContainer: {
    flex: 1,
  },
  headerButton: {
    flex: 1,
  },
  headerButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  nowText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  clearText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
    textAlign: 'center',
  },
  doneText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  saveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  pickerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: PICKER_HEIGHT,
    zIndex: 1001,
  },
  pickerBlur: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1 / PixelRatio.get(),
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    paddingHorizontal: 0,
    paddingVertical: 0,
    height: 60,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  todayText: {
    fontSize: 18,
    color: '#333',
  },
  confirmText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'right',
  },
  pickersContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerColumn: {
    flex: 1,
    height: PICKER_HEIGHT,
  },
  datePickerColumn: {
    flex: 2,
    height: PICKER_HEIGHT,
  },
  listContainer: {
    paddingVertical: ROW_HEIGHT * 2, // Padding to center the middle item
  },
  pickerItem: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 18,
    color: '#333',
  },
  pickerTextBold: {
    fontWeight: '600',
  },
  divider: {
    width: 1 / PixelRatio.get(),
    height: PICKER_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  selectionIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (ROW_HEIGHT * VISIBLE_ITEMS) / 2 - ROW_HEIGHT / 2,
    height: ROW_HEIGHT,
    borderTopWidth: 1 / PixelRatio.get(),
    borderBottomWidth: 1 / PixelRatio.get(),
    borderColor: 'rgba(0, 0, 0, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
});
