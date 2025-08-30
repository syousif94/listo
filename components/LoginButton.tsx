import * as AppleAuthentication from 'expo-apple-authentication';
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS } from '../constants/config';
import { useAuthStore } from '../store/authStore';

export default function LoginButton() {
  const insets = useSafeAreaInsets();
  const { setUser, getStoredName, storeUserName } = useAuthStore();

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('Apple credential received:', credential);
      console.log('Full name object:', credential.fullName);

      // Format the name with priority: nickname > givenName > formatted full name
      let formattedName = undefined;
      if (credential.fullName) {
        if (credential.fullName.nickname) {
          formattedName = credential.fullName.nickname;
          console.log('Using nickname:', formattedName);
        } else if (credential.fullName.givenName) {
          formattedName = credential.fullName.givenName;
          console.log('Using given name:', formattedName);
        } else {
          // Fallback to formatted full name
          try {
            formattedName = AppleAuthentication.formatFullName(
              credential.fullName,
              'default'
            );
            console.log('Using formatted full name:', formattedName);
          } catch (error) {
            console.log('Error formatting name:', error);
            // Final fallback to manual formatting
            if (credential.fullName.familyName) {
              formattedName = credential.fullName.familyName;
            }
          }
        }
      }

      // Store the name immediately if we got it (first login)
      if (formattedName) {
        await storeUserName(formattedName);
        console.log('Stored user name:', formattedName);
      }

      // If we don't have a name from this login, try to get it from storage
      let nameToSend = formattedName;
      if (!nameToSend) {
        const storedName = await getStoredName();
        nameToSend = storedName || undefined;
        console.log('Retrieved name from storage:', nameToSend);
      }

      // Send the identity token to our backend
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(API_ENDPOINTS.auth.apple, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identityToken: credential.identityToken,
            authorizationCode: credential.authorizationCode,
            fullName: nameToSend,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.log(
            'Server authentication failed:',
            response.status,
            errorText
          );

          // Show user-friendly message for server errors
          if (response.status >= 500) {
            Alert.alert(
              'Server Unavailable',
              'Authentication server is temporarily unavailable. Please try again later.'
            );
          } else if (response.status === 401 || response.status === 400) {
            Alert.alert(
              'Authentication Failed',
              'Please try signing in again.'
            );
          } else {
            Alert.alert(
              'Connection Error',
              'Authentication failed. Please check your connection and try again.'
            );
          }
          return;
        }

        const result = await response.json();
        console.log('Backend authentication successful:', result);

        // Store the user, JWT token, and Apple user ID
        await setUser(result.user, result.token, credential.user);
      } catch (networkError: any) {
        console.log(
          'Network error during authentication:',
          networkError.message
        );

        // Handle network errors gracefully
        if (networkError.name === 'AbortError') {
          Alert.alert(
            'Request Timeout',
            'Authentication request timed out. Please try again.'
          );
        } else if (
          networkError.name === 'TypeError' &&
          networkError.message.includes('Failed to fetch')
        ) {
          Alert.alert(
            'Connection Failed',
            'Unable to connect to authentication server. Please check your internet connection and try again.'
          );
        } else {
          Alert.alert(
            'Network Error',
            'Authentication failed due to a network error. Please try again.'
          );
        }
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled the sign-in flow - just log it, don't show error
        console.log('User canceled Apple sign-in');
      } else {
        // Handle Apple Sign-In errors
        console.log('Apple Sign-In error:', error.message);
        Alert.alert(
          'Sign-In Failed',
          'Apple Sign-In failed. Please try again.'
        );
      }
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom + 20,
        },
      ]}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={15}
        style={styles.button}
        onPress={handleAppleSignIn}
      />
      <Text style={styles.text}>Login to proceed</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  button: {
    width: 200,
    height: 44,
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});
