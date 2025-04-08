import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/constants';
// TODO: Import appropriate service/action for password reset request

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); // To show success message

  const validateEmail = () => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email');
      return false;
    } else {
      setEmailError('');
      return true;
    }
  };

  const handleSendResetInstructions = async () => {
    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);
    setIsSuccess(false); // Reset success state

    try {
      // --- TODO: Backend Integration ---
      // Replace this with actual API call to your backend auth service
      // e.g., await AuthService.requestPasswordReset(email);
      console.log(`Requesting password reset for: ${email}`);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
      // --- End of Backend Integration Placeholder ---

      setIsSuccess(true); // Show success message
      // Optionally clear email field: setEmail('');
      Alert.alert('Check Your Email', 'If an account exists for this email, password reset instructions have been sent.');

    } catch (error) {
      console.error('Password reset request failed:', error);
      // Show generic error, avoid confirming if email exists
      Alert.alert('Error', 'Could not process request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.PRIMARY} />
        </TouchableOpacity>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter the email address associated with your account, and we'll send you instructions to reset your password.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.MUTED}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSendResetInstructions}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.WHITE} />
            ) : (
              <Text style={styles.buttonText}>Send Reset Instructions</Text>
            )}
          </TouchableOpacity>

          {isSuccess && (
            <Text style={styles.successText}>
              Password reset instructions sent! Please check your email (including spam folder).
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  keyboardView: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20, // Adjust based on platform status bar
    left: 15,
    zIndex: 1, // Ensure it's above other content
    padding: 5,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.MUTED,
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: COLORS.TEXT,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.TEXT,
  },
  errorText: {
    color: COLORS.DANGER,
    fontSize: 14,
    marginTop: 4,
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10, // Add some margin above the button
  },
  buttonDisabled: {
    backgroundColor: COLORS.MUTED,
  },
  buttonText: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: '600',
  },
  successText: {
    marginTop: 20,
    color: COLORS.SUCCESS, // Assuming you have a SUCCESS color
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen;
