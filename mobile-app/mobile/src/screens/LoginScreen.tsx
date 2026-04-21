import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { login } from '../lib/auth';
import { Colors, BorderRadius, FontSize, Spacing, Shadows } from '../theme/tokens';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  React.useEffect(() => {
    const loadCreds = async () => {
      try {
        const saved = await AsyncStorage.getItem('user_creds');
        if (saved) {
          const { u, p } = JSON.parse(saved);
          setUsername(u);
          setPassword(p);
        }
      } catch (e) {}
    };
    loadCreds();
  }, []);

  const handleLogin = async () => {
    console.log('[DEBUG] handleLogin started', { username });
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.');
      return;
    }
    setError('');
    setLoading(true);
    console.log('[DEBUG] Calling auth.login...');
    const user = await login(username, password);
    console.log('[DEBUG] auth.login result:', user);
    setLoading(false);
    if (!user) {
      console.log('[DEBUG] Login failed - invalid credentials');
      setError('Invalid username or password. Please try again.');
      return;
    }
    console.log('[DEBUG] Login successful, navigating to:', user.role === 'admin' ? 'AdminRoot' : 'DriverRoot');

    if (rememberMe) {
      await AsyncStorage.setItem('user_creds', JSON.stringify({ u: username, p: password }));
    } else {
      await AsyncStorage.removeItem('user_creds');
    }

    if (user.role === 'admin') {
      navigation.replace('AdminRoot');
    } else {
      navigation.replace('DriverRoot');
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#172554', '#0F172A']}
      style={styles.container}
    >
      {/* Background blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="car" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.logoTitle}>
              Distri<Text style={styles.logoBrand}>Sys</Text>
            </Text>
            <Text style={styles.logoSubtitle}>Distribution & Billing Platform</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>Enter your credentials to continue</Text>

            {/* Username */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter username"
                  placeholderTextColor={Colors.textMuted}
                  value={username}
                  onChangeText={t => { setUsername(t); setError(''); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={t => { setPassword(t); setError(''); }}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me */}
            <TouchableOpacity 
              style={styles.rememberRow} 
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>Remember my login</Text>
            </TouchableOpacity>

            {/* Error */}
            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={15} color={Colors.danger} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginBtn}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Sign In</Text>
              }
            </TouchableOpacity>

            {/* Hints */}
            <View style={styles.hints}>
              <View style={styles.hintCard}>
                <Text style={styles.hintRole}>Admin</Text>
                <Text style={styles.hintCred}>admin / admin123</Text>
              </View>
              <View style={styles.hintCard}>
                <Text style={styles.hintRole}>Driver</Text>
                <Text style={styles.hintCred}>driver / driver123</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob1: {
    position: 'absolute', top: '-10%', left: '-10%',
    width: '60%', height: '40%', borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.15)',
  },
  blob2: {
    position: 'absolute', bottom: '5%', right: '5%',
    width: '50%', height: '40%', borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing['4xl'],
  },
  logoContainer: { alignItems: 'center', marginBottom: Spacing['3xl'] },
  logoIcon: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.primary,
  },
  logoTitle: {
    fontSize: FontSize['4xl'], fontWeight: '900',
    color: Colors.textPrimary, letterSpacing: -1,
  },
  logoBrand: { color: Colors.primaryLight },
  logoSubtitle: {
    fontSize: FontSize.sm, color: 'rgba(147,197,253,0.7)',
    marginTop: 4, fontWeight: '500',
  },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing['2xl'],
    ...Shadows.lg,
  },
  cardTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  cardSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2, marginBottom: Spacing.xl },
  fieldGroup: { marginBottom: Spacing.lg },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border,
    height: 50,
  },
  inputIcon: { marginLeft: Spacing.md },
  input: {
    flex: 1, color: Colors.textPrimary, fontSize: FontSize.md,
    paddingHorizontal: Spacing.md, height: '100%',
  },
  eyeBtn: { paddingHorizontal: Spacing.md },
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.dangerBg,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.danger + '40',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: '500', flex: 1 },
  loginBtn: {
    height: 50, borderRadius: BorderRadius.lg, alignItems: 'center',
    justifyContent: 'center', backgroundColor: Colors.primary,
    marginTop: Spacing.sm, ...Shadows.primary,
  },
  loginBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.lg },
  hints: {
    flexDirection: 'row', gap: 10, marginTop: Spacing.xl,
    paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  hintCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center',
  },
  hintRole: { fontSize: FontSize.sm, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  hintCred: { fontSize: FontSize.xs, color: Colors.textMuted },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl, marginTop: -4 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  rememberText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
});
