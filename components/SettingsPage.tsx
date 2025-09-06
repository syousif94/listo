import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { notificationService } from '../services/notificationService';
import { useAuthStore } from '../store/authStore';
import { useTodoStore } from '../store/todoStore';
import CardColorPicker from './CardColorPicker';
import ColorSchemeSelector from './ColorSchemeSelector';
import RecordingButtonColorPicker from './RecordingButtonColorPicker';

interface NotificationStatus {
  status: string;
  canAskAgain: boolean;
  granted: boolean;
}

export default function SettingsPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuthStore();
  const { tokenUsage } = useTodoStore();
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationStatus>({
      status: 'unknown',
      canAskAgain: true,
      granted: false,
    });

  // Get app version from Constants
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const checkNotificationStatus = async () => {
    try {
      const { status, canAskAgain, granted } =
        await Notifications.getPermissionsAsync();
      setNotificationStatus({
        status,
        canAskAgain,
        granted,
      });
    } catch (error) {
      console.log('Error checking notification status:', error);
    }
  };

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const handleNotificationPermission = async () => {
    if (notificationStatus.granted) {
      // Already granted, open settings to manage notifications
      await Linking.openSettings();
      return;
    }

    if (notificationStatus.canAskAgain) {
      // Can request permission
      const result = await notificationService.requestPermissionsAndGetToken();
      if (result.success) {
        await checkNotificationStatus();
      } else {
        Alert.alert(
          'Notifications Denied',
          'You can enable notifications in Settings if you change your mind.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } else {
      // Permission denied, need to go to settings
      Alert.alert(
        'Notifications Disabled',
        'To receive todo reminders, please enable notifications in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This will remove all local data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleViewSource = () => {
    Linking.openURL('https://github.com/syousif94/listo');
  };

  const handleReportIssues = () => {
    Linking.openURL('https://github.com/syousif94/listo/issues');
  };

  const getNotificationStatusText = () => {
    if (notificationStatus.granted) {
      return 'Enabled';
    } else if (notificationStatus.canAskAgain) {
      return 'Disabled';
    } else {
      return 'Denied';
    }
  };

  const getNotificationButtonText = () => {
    if (notificationStatus.granted) {
      return 'Notifications Enabled';
    } else if (notificationStatus.canAskAgain) {
      return 'Enable Notifications';
    } else {
      return 'Open Settings';
    }
  };

  const formatTokenUsage = () => {
    if (!tokenUsage) return 'Loading...';

    const percentage = (
      (tokenUsage.totalUsed / tokenUsage.monthlyLimit) *
      100
    ).toFixed(1);
    return `${tokenUsage.totalUsed.toLocaleString()} / ${tokenUsage.monthlyLimit.toLocaleString()} (${percentage}%)`;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View style={styles.content}>
        {/* Header Section with App Version and Device ID */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            App Info
          </Text>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.text }]}>
                Version
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {appVersion}
              </Text>
            </View>
            {user && (
              <View style={styles.infoColumn}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>
                  Device ID
                </Text>
                <Text style={[styles.deviceIdText, { color: colors.text }]}>
                  {user.id}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Token Usage Section - Only show if user is logged in and tokenUsage exists */}
        {user && tokenUsage && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              AI Usage
            </Text>
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>
                  Remaining Tokens
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {tokenUsage.remainingTokens.toLocaleString()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>
                  Monthly Usage
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatTokenUsage()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Permissions Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Preferences
          </Text>

          {/* Theme Selector */}
          <ColorSchemeSelector />

          {/* Card Color Picker */}
          <CardColorPicker />

          {/* Recording Button Color Picker */}
          <RecordingButtonColorPicker />

          {/* Notifications Permission */}
          <Pressable
            style={[
              styles.settingsButton,
              {
                backgroundColor: notificationStatus.granted
                  ? '#E8F5E8'
                  : '#FFF3E0',
                borderColor: notificationStatus.granted ? '#4CAF50' : '#FF9800',
              },
            ]}
            onPress={handleNotificationPermission}
          >
            <View style={styles.buttonContent}>
              <Ionicons
                name={
                  notificationStatus.granted
                    ? 'notifications'
                    : 'notifications-off'
                }
                size={20}
                color={notificationStatus.granted ? '#4CAF50' : '#FF9800'}
              />
              <View style={styles.buttonTextContainer}>
                <Text style={[styles.buttonTitle]}>
                  {getNotificationButtonText()}
                </Text>
                <Text style={[styles.buttonSubtitle, { color: colors.icon }]}>
                  Status: {getNotificationStatusText()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.icon} />
            </View>
          </Pressable>
        </View>

        {/* Links Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Links
          </Text>

          <Pressable
            style={[
              styles.settingsButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.borderColor,
              },
            ]}
            onPress={handleViewSource}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="logo-github" size={20} color={colors.icon} />
              <View style={styles.buttonTextContainer}>
                <Text style={[styles.buttonTitle, { color: colors.text }]}>
                  View Source
                </Text>
                <Text style={[styles.buttonSubtitle, { color: colors.icon }]}>
                  Check out the code on GitHub
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.icon} />
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.settingsButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.borderColor,
              },
            ]}
            onPress={handleReportIssues}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="bug-outline" size={20} color={colors.icon} />
              <View style={styles.buttonTextContainer}>
                <Text style={[styles.buttonTitle, { color: colors.text }]}>
                  Report Issues
                </Text>
                <Text style={[styles.buttonSubtitle, { color: colors.icon }]}>
                  Found a bug? Let us know
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.icon} />
            </View>
          </Pressable>
        </View>

        {/* Delete Account Section - Only show when authenticated */}
        {user && (
          <View style={styles.deleteSection}>
            <Pressable
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoColumn: {
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  deviceIdText: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
    lineHeight: 20,
  },
  settingsButton: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
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
  deleteSection: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
