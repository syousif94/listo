import { format } from 'date-fns';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
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

interface DateTimePickerProps {
  isVisible: boolean;
  initialDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const ROW_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ROW_HEIGHT * VISIBLE_ITEMS;

export default function DateTimePicker({
  isVisible,
  initialDate = new Date(),
  onConfirm,
  onCancel,
}: DateTimePickerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(PICKER_HEIGHT + 100);
  const opacity = useSharedValue(0);

  // Refs for scroll positions
  const dateListRef = useRef<FlatList>(null);
  const hourListRef = useRef<FlatList>(null);
  const minuteListRef = useRef<FlatList>(null);
  const ampmListRef = useRef<FlatList>(null);
  const yearListRef = useRef<FlatList>(null);

  // Current selected values (React state, not shared values)
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedHour, setSelectedHour] = useState(
    initialDate.getHours() % 12 || 12
  );
  const [selectedMinute, setSelectedMinute] = useState(
    initialDate.getMinutes()
  );
  const [selectedAmPm, setSelectedAmPm] = useState(
    initialDate.getHours() >= 12 ? 1 : 0
  );
  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());

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
    return Array.from({ length: 60 }, (_, i) => ({
      id: i.toString(),
      value: i,
      label: i.toString().padStart(2, '0'),
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
    // Update selected values when initialDate changes
    setSelectedDate(initialDate);
    setSelectedHour(initialDate.getHours() % 12 || 12);
    setSelectedMinute(initialDate.getMinutes());
    setSelectedAmPm(initialDate.getHours() >= 12 ? 1 : 0);
    setSelectedYear(initialDate.getFullYear());

    if (isVisible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 200 });

      // Scroll to initial positions immediately
      const todayIndex = dates.findIndex(
        (d) => d.date.toDateString() === initialDate.toDateString()
      );
      const hourIndex = hours.findIndex(
        (h) => h.value === (initialDate.getHours() % 12 || 12)
      );
      const minuteIndex = minutes.findIndex(
        (m) => m.value === initialDate.getMinutes()
      );
      const ampmIndex = initialDate.getHours() >= 12 ? 1 : 0;
      const yearIndex = years.findIndex(
        (y) => y.value === initialDate.getFullYear()
      );

      dateListRef.current?.scrollToIndex({
        index: Math.max(0, todayIndex),
        animated: false,
      });
      hourListRef.current?.scrollToIndex({
        index: Math.max(0, hourIndex),
        animated: false,
      });
      minuteListRef.current?.scrollToIndex({
        index: Math.max(0, minuteIndex),
        animated: false,
      });
      ampmListRef.current?.scrollToIndex({
        index: Math.max(0, ampmIndex),
        animated: false,
      });
      yearListRef.current?.scrollToIndex({
        index: Math.max(0, yearIndex),
        animated: false,
      });
    } else {
      translateY.value = withSpring(PICKER_HEIGHT + 100, {
        damping: 20,
        stiffness: 300,
      });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [
    isVisible,
    initialDate,
    dates,
    hours,
    minutes,
    years,
    translateY,
    opacity,
  ]);

  const pickerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleConfirm = () => {
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

    // Animation before confirming
    translateY.value = withSpring(PICKER_HEIGHT + 100, {
      damping: 20,
      stiffness: 300,
    });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onConfirm)(finalDate);
      }
    });
  };

  const handleCancel = () => {
    // Animation before canceling
    translateY.value = withSpring(PICKER_HEIGHT + 100, {
      damping: 20,
      stiffness: 300,
    });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onCancel)();
      }
    });
  };

  const renderDateItem = ({ item, index }: { item: any; index: number }) => (
    <Pressable
      style={styles.pickerItem}
      onPress={() => {
        setSelectedDate(item.date);
        dateListRef.current?.scrollToIndex({ index, animated: true });
      }}
    >
      <Text style={styles.pickerText}>{item.label}</Text>
    </Pressable>
  );

  const renderHourItem = ({ item, index }: { item: any; index: number }) => (
    <Pressable
      style={styles.pickerItem}
      onPress={() => {
        setSelectedHour(item.value);
        hourListRef.current?.scrollToIndex({ index, animated: true });
      }}
    >
      <Text style={styles.pickerText}>{item.label}</Text>
    </Pressable>
  );

  const renderMinuteItem = ({ item, index }: { item: any; index: number }) => (
    <Pressable
      style={styles.pickerItem}
      onPress={() => {
        setSelectedMinute(item.value);
        minuteListRef.current?.scrollToIndex({ index, animated: true });
      }}
    >
      <Text style={styles.pickerText}>{item.label}</Text>
    </Pressable>
  );

  const renderAmPmItem = ({ item, index }: { item: any; index: number }) => (
    <Pressable
      style={styles.pickerItem}
      onPress={() => {
        setSelectedAmPm(item.value);
        ampmListRef.current?.scrollToIndex({ index, animated: true });
      }}
    >
      <Text style={styles.pickerText}>{item.label}</Text>
    </Pressable>
  );

  const renderYearItem = ({ item, index }: { item: any; index: number }) => (
    <Pressable
      style={styles.pickerItem}
      onPress={() => {
        setSelectedYear(item.value);
        yearListRef.current?.scrollToIndex({ index, animated: true });
      }}
    >
      <Text style={styles.pickerText}>{item.label}</Text>
    </Pressable>
  );

  if (!isVisible) return null;

  return (
    <>
      {/* Picker */}
      <Animated.View
        style={[styles.pickerContainer, pickerStyle, { bottom: insets.bottom }]}
      >
        <BlurView intensity={80} style={styles.pickerBlur} tint="extraLight">
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleCancel} style={styles.headerButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Set Due Date</Text>
            <Pressable onPress={handleConfirm} style={styles.headerButton}>
              <Text style={styles.confirmText}>Set</Text>
            </Pressable>
          </View>

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
                decelerationRate="fast"
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
                decelerationRate="fast"
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
                decelerationRate="fast"
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
                decelerationRate="fast"
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
                decelerationRate="fast"
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
  pickerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: PICKER_HEIGHT + 60, // Extra height for header
    zIndex: 1001,
  },
  pickerBlur: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1 / PixelRatio.get(),
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1 / PixelRatio.get(),
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerButton: {
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
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
  divider: {
    width: 1 / PixelRatio.get(),
    height: PICKER_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  selectionIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 60 + ROW_HEIGHT * 2, // Header height + 2 rows offset
    height: ROW_HEIGHT,
    borderTopWidth: 1 / PixelRatio.get(),
    borderBottomWidth: 1 / PixelRatio.get(),
    borderColor: 'rgba(0, 0, 0, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
});
