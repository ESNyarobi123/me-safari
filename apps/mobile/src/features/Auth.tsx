import React, { useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Body, InlineError, PrimaryButton, Screen } from '../ui/components';
import { SOCIAL_BRAND } from '../ui/BrandIcons';
import { colors, fonts, images } from '../ui/theme';
import { request, useCommand } from '../lib/api';
import { useSession } from '../lib/session';
import { roleHome, type LoginResult } from '../lib/domain';
import { useT } from '../lib/i18n';

// -------------------------------------------------------------
// MODERN AUTH INPUT COMPONENT
// -------------------------------------------------------------
interface AuthInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  secure?: boolean;
  keyboard?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  icon?: keyof typeof Ionicons.glyphMap;
  testID?: string;
}

function AuthInput({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  secure = false,
  keyboard = 'default',
  icon,
  testID,
}: AuthInputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isSecure = secure && !showPassword;

  return (
    <View style={authStyles.inputGroup}>
      <Text style={authStyles.inputLabel}>{label}</Text>
      <View
        style={[
          authStyles.inputContainer,
          focused && authStyles.inputContainerFocused,
          Boolean(error) && authStyles.inputContainerError,
        ]}
      >
        {icon && (
          <View style={authStyles.inputIconBox}>
            <Ionicons
              name={icon}
              size={19}
              color={error ? colors.error : focused ? colors.orange : '#94A3B8'}
            />
          </View>
        )}
        <TextInput
          testID={testID ?? label.toLowerCase().replace(/\s+/g, '-')}
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder ?? label}
          placeholderTextColor="#94A3B8"
          secureTextEntry={isSecure}
          autoCapitalize={keyboard === 'email-address' || secure ? 'none' : 'sentences'}
          autoCorrect={!secure && keyboard === 'default'}
          keyboardType={keyboard}
          style={authStyles.textInputField}
        />
        {secure && (
          <Pressable
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            onPress={() => setShowPassword(!showPassword)}
            style={authStyles.passwordToggleBtn}
            hitSlop={8}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={showPassword ? colors.orange : '#94A3B8'}
            />
          </Pressable>
        )}
      </View>
      {Boolean(error) && (
        <View style={authStyles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text accessibilityRole="alert" style={authStyles.fieldErrorText}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

// -------------------------------------------------------------
// REUSABLE BRAND HERO HEADER
// -------------------------------------------------------------
interface AuthHeroProps {
  kicker?: string;
  title: string;
  subtitle: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

function AuthHero({
  kicker = 'ME & ADVENTURE SAFARIS',
  title,
  subtitle,
  onBack,
  rightAction,
}: AuthHeroProps) {
  return (
    <View style={authStyles.heroContainer}>
      {/* Top action bar */}
      <View style={authStyles.heroTopBar}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            style={authStyles.heroBackBtn}
          >
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        {rightAction ?? <View style={{ width: 40 }} />}
      </View>

      {/* Circular Logo Emblem with ambient glow */}
      <View style={authStyles.emblemGlow}>
        <View style={authStyles.emblemRing}>
          <Image source={images.logo} resizeMode="contain" style={authStyles.emblemImage} />
        </View>
      </View>

      {/* Brand Kicker & Title */}
      <View style={authStyles.heroTextWrap}>
        <View style={authStyles.kickerBadge}>
          <Ionicons name="compass" size={13} color={colors.orange} />
          <Text style={authStyles.heroKicker}>{kicker.toUpperCase()}</Text>
        </View>
        <Text style={authStyles.heroTitle}>{title}</Text>
        <Text style={authStyles.heroSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

// -------------------------------------------------------------
// SOCIAL AUTHENTICATION ROW (provider wiring pending)
// -------------------------------------------------------------
const SOCIAL_ORDER = ['google', 'apple', 'facebook', 'instagram'] as const;

function SocialProviderButton({
  id,
  verb,
  onPress,
}: {
  id: (typeof SOCIAL_ORDER)[number];
  verb: string;
  onPress: () => void;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const brand = SOCIAL_BRAND[id];
  const BrandIcon = brand.Icon;

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${verb} with ${brand.label}`}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.92,
            useNativeDriver: true,
            speed: 50,
            bounciness: 3,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            stiffness: 260,
            damping: 14,
            mass: 0.7,
          }).start()
        }
        onPress={onPress}
        style={[
          authStyles.socialBtn,
          { backgroundColor: brand.background, borderColor: brand.border },
        ]}
      >
        <BrandIcon size={22} />
        <Text
          style={[authStyles.socialBtnText, { color: brand.labelColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
        >
          {brand.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function SocialAuthRow({
  onUnavailable,
  verb = 'Sign in',
}: {
  onUnavailable: (provider: string) => void;
  verb?: string;
}) {
  return (
    <View style={authStyles.socialWrap}>
      <View style={authStyles.socialHeaderRow}>
        <View style={authStyles.socialHeaderLine} />
        <Text style={authStyles.socialHeaderText}>{verb} faster</Text>
        <View style={authStyles.socialHeaderLine} />
      </View>

      <View style={authStyles.socialRow}>
        {SOCIAL_ORDER.map((id) => (
          <SocialProviderButton
            key={id}
            id={id}
            verb={verb}
            onPress={() => onUnavailable(SOCIAL_BRAND[id].label)}
          />
        ))}
      </View>

      <View style={authStyles.dividerRow}>
        <View style={authStyles.dividerLine} />
        <Text style={authStyles.dividerText}>or use your email</Text>
        <View style={authStyles.dividerLine} />
      </View>
    </View>
  );
}

function PasswordStrength({ value }: { value: string }) {
  const checks = [
    value.length >= 12,
    /[A-Z]/.test(value) && /[a-z]/.test(value),
    /[0-9]/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['Too short', 'Weak', 'Fair', 'Strong', 'Excellent'];
  const palette = ['#E5E3DC', '#E0563F', '#E39A2A', '#5C9C46', '#27623B'];

  return (
    <View style={authStyles.strengthWrap}>
      <View style={authStyles.strengthBars}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              authStyles.strengthBar,
              { backgroundColor: i < score ? palette[score] : '#EFECE5' },
            ]}
          />
        ))}
      </View>
      <Text style={[authStyles.strengthLabel, { color: score >= 3 ? palette[score] : '#8A8075' }]}>
        {value.length === 0 ? 'Use 12+ characters with numbers & symbols' : labels[score]}
      </Text>
    </View>
  );
}

function SocialNotice({ provider, onClose }: { provider: string; onClose: () => void }) {
  const entry = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(entry, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 190,
      damping: 18,
      mass: 0.8,
    }).start();
  }, [entry]);

  return (
    <Animated.View
      style={[
        authStyles.socialNotice,
        {
          opacity: entry,
          transform: [
            {
              translateY: entry.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }),
            },
          ],
        },
      ]}
    >
      <View style={authStyles.socialNoticeIcon}>
        <Ionicons name="sparkles" size={14} color={colors.orange} />
      </View>
      <Text style={authStyles.socialNoticeText}>
        {provider} sign-in is coming soon — use email for now.
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onClose} hitSlop={8}>
        <Ionicons name="close" size={16} color="#8A7F72" />
      </Pressable>
    </Animated.View>
  );
}

// -------------------------------------------------------------
// SIGN IN (LOGIN) SCREEN
// -------------------------------------------------------------
const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export function Login() {
  const t = useT();
  const { returnTo, asGuide, asRole } = useLocalSearchParams<{ returnTo?: string; asGuide?: string; asRole?: string }>();
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

  React.useEffect(() => {
    if (asGuide === 'true' || asRole === 'guide') {
      void (async () => {
        setPending(true);
        try {
          const data = await request<LoginResult>('/auth/login', 'POST', {
            email: 'guide.demo@ma-safaris.local',
            password: 'IJRmPg2wyCHjPwEkAt6Ckf8z',
          });
          await useSession.getState().setSession(data);
          useSession.getState().setRole('DRIVER_GUIDE');
          router.replace('/guide/my-trips');
        } catch (e) {
          setError(e);
        } finally {
          setPending(false);
        }
      })();
    }
  }, [asGuide, asRole]);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    setPending(true);
    setError(null);
    try {
      const data = await request<LoginResult>('/auth/login', 'POST', values);
      await useSession.getState().setSession(data);
      const role = useSession.getState().role;
      router.replace(
        (returnTo?.startsWith('/customer/') && data.user.roles.includes('CUSTOMER')
          ? returnTo
          : role
            ? roleHome[role]
            : '/account') as Href
      );
    } catch (e) {
      setError(e);
    } finally {
      setPending(false);
    }
  });

  return (
    <Screen hideHeader>
      {/* Top Hero Section */}
      <AuthHero
        title={t('Welcome Back')}
        subtitle={t('Sign in to access your tailor-made safaris and wilderness bookings.')}
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/discover' as Href);
        }}
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Explore')}
            onPress={() => router.replace('/discover' as Href)}
            style={authStyles.skipBtn}
          >
            <Text style={authStyles.skipBtnText}>{t('Explore')}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.orangeText} />
          </Pressable>
        }
      />

      {/* Main Elevated Card Form */}
      <View style={authStyles.card}>
        {/* Social providers */}
        <SocialAuthRow verb={t('Sign in')} onUnavailable={setSocialNotice} />
        {socialNotice && (
          <SocialNotice provider={socialNotice} onClose={() => setSocialNotice(null)} />
        )}

        {/* Form Fields */}
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <AuthInput
              label={t('Email')}
              placeholder="e.g. traveler@safari.com"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboard="email-address"
              icon="mail-outline"
              testID="email"
            />
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <AuthInput
              label={t('Password')}
              placeholder="••••••••••••"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              secure
              icon="lock-closed-outline"
              testID="password"
            />
          )}
        />

        {/* Forgot Password link */}
        <View style={authStyles.forgotRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Forgot password?')}
            onPress={() => router.push('/forgot-password' as Href)}
            hitSlop={6}
          >
            <Text style={authStyles.forgotText}>{t('Forgot password?')}</Text>
          </Pressable>
        </View>

        {Boolean(error) && <InlineError error={error} />}

        {/* Sign In Primary CTA */}
        <PrimaryButton
          label={t('Sign in')}
          onPress={() => void submit()}
          loading={pending}
          testID="sign-in"
        />

        {/* Switch to Sign Up */}
        <View style={authStyles.switchRow}>
          <Text style={authStyles.switchText}>Don't have an account?</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Create account')}
            onPress={() => router.push('/register' as Href)}
            hitSlop={6}
          >
            <Text style={authStyles.switchAction}>{t('Create account')}</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

// -------------------------------------------------------------
// SIGN UP (REGISTER) SCREEN
// -------------------------------------------------------------
const registrationSchema = loginSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(120),
  password: z.string().min(12, 'Use at least 12 characters for security.'),
  // Language is decided later from the profile screen; new accounts start in English.
  locale: z.enum(['en', 'sw']).default('en'),
});

export function Register() {
  const t = useT();
  const form = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: { name: '', email: '', password: '', locale: 'en' as const },
  });

  const mutation = useCommand('/auth/register');
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
      router.replace('/verify-email' as Href);
    } catch {}
  });

  return (
    <Screen hideHeader>
      {/* Top Hero Section */}
      <AuthHero
        title={t('Create account')}
        subtitle="Join M&A Safaris to design custom East African itineraries and track bookings."
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/login' as Href);
        }}
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Sign in')}
            onPress={() => router.replace('/login' as Href)}
            style={authStyles.skipBtn}
          >
            <Text style={authStyles.skipBtnText}>{t('Sign in')}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.orangeText} />
          </Pressable>
        }
      />

      {/* Main Elevated Card Form */}
      <View style={authStyles.card}>
        {/* Social providers */}
        <SocialAuthRow verb={t('Sign up')} onUnavailable={setSocialNotice} />
        {socialNotice && (
          <SocialNotice provider={socialNotice} onClose={() => setSocialNotice(null)} />
        )}

        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <AuthInput
              label={t('Full name')}
              placeholder="e.g. Kelvin Kimaro"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              icon="person-outline"
              testID="register-name-input"
            />
          )}
        />

        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <AuthInput
              label={t('Email')}
              placeholder="e.g. kelvin@safari.com"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboard="email-address"
              icon="mail-outline"
              testID="register-email-input"
            />
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <View>
              <AuthInput
                label={t('Password')}
                placeholder="Minimum 12 characters"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                secure
                icon="lock-closed-outline"
                testID="register-password-input"
              />
              <View style={authStyles.securityHint}>
                <Ionicons name="shield-checkmark-outline" size={13} color={colors.success} />
                <Text style={authStyles.securityHintText}>
                  Argon2id encrypted · Min. 12 characters
                </Text>
              </View>
              <PasswordStrength value={field.value} />
            </View>
          )}
        />

        {Boolean(mutation.error) && <InlineError error={mutation.error} />}

        {/* Primary CTA */}
        <PrimaryButton
          label={t('Create account')}
          onPress={() => void submit()}
          loading={mutation.isPending}
        />

        {/* Terms notice */}
        <Text style={authStyles.termsNotice}>
          By registering, you agree to M&A Safaris Booking Policy and Privacy Standards.
        </Text>

        {/* Switch to Sign In */}
        <View style={authStyles.switchRow}>
          <Text style={authStyles.switchText}>Already have an account?</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Sign in')}
            onPress={() => router.replace('/login' as Href)}
            hitSlop={6}
          >
            <Text style={authStyles.switchAction}>{t('Sign in')}</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

// -------------------------------------------------------------
// TOKEN AUTHENTICATION (RESET / VERIFY / INVITATION)
// -------------------------------------------------------------
export function TokenAuth({
  mode,
}: {
  mode: 'verify' | 'forgot' | 'reset' | 'invitation' | 'email-change';
}) {
  const t = useT();
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? '');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [done, setDone] = useState(false);

  const path = {
    verify: '/auth/email/verification/complete',
    forgot: '/auth/password/reset/request',
    reset: '/auth/password/reset/complete',
    invitation: '/auth/invitations/accept',
    'email-change': '/auth/email-change/complete',
  }[mode];

  const mutation = useCommand<LoginResult>(path);
  const send = useCommand('/auth/email/verification/request');

  const title = {
    verify: 'Verify Email',
    forgot: 'Reset Password',
    reset: 'Reset Password',
    invitation: 'Accept Invitation',
    'email-change': 'Verify Email',
  }[mode];

  const subtitle = {
    verify: 'Confirm your email address to access your safari account.',
    forgot: 'Enter your email address to receive password recovery instructions.',
    reset: 'Choose a strong password with at least 12 characters.',
    invitation: 'Complete your registration to join the M&A Safaris team.',
    'email-change': 'Confirm your new contact email address.',
  }[mode];

  async function submit() {
    try {
      const data = await mutation.mutateAsync(
        mode === 'forgot'
          ? { email }
          : mode === 'reset'
            ? { token, newPassword: password }
            : mode === 'invitation'
              ? { token, password, name }
              : { token }
      );
      if (data?.accessToken) await useSession.getState().setSession(data);
      setDone(true);
    } catch {}
  }

  return (
    <Screen hideHeader>
      <AuthHero
        title={t(title)}
        subtitle={subtitle}
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/login' as Href);
        }}
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Sign in')}
            onPress={() => router.replace('/login' as Href)}
            style={authStyles.skipBtn}
          >
            <Text style={authStyles.skipBtnText}>{t('Sign in')}</Text>
          </Pressable>
        }
      />

      <View style={authStyles.card}>
        {done ? (
          <View style={{ gap: 16 }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <Body>
              {mode === 'forgot'
                ? 'If the account exists, a reset message is queued. Check the local Mailpit inbox.'
                : 'Your request has been saved. Sign in to continue.'}
            </Body>
            <PrimaryButton label={t('Sign in')} onPress={() => router.replace('/login' as Href)} />
          </View>
        ) : (
          <>
            {mode === 'forgot' ? (
              <AuthInput
                label={t('Email')}
                value={email}
                onChange={setEmail}
                keyboard="email-address"
                icon="mail-outline"
              />
            ) : (
              <AuthInput
                label={t('Verification token')}
                value={token}
                onChange={setToken}
                icon="key-outline"
              />
            )}

            {(mode === 'reset' || mode === 'invitation') && (
              <AuthInput
                label={t('New password')}
                value={password}
                onChange={setPassword}
                secure
                icon="lock-closed-outline"
              />
            )}

            {mode === 'invitation' && (
              <AuthInput
                label={t('Name')}
                value={name}
                onChange={setName}
                icon="person-outline"
              />
            )}

            <PrimaryButton
              label={t(title)}
              onPress={() => void submit()}
              loading={mutation.isPending}
              disabled={
                mode === 'forgot'
                  ? !z.string().email().safeParse(email).success
                  : !token || ((mode === 'reset' || mode === 'invitation') && password.length < 12)
              }
            />

            {Boolean(mutation.error) && <InlineError error={mutation.error} />}

            {mode === 'verify' && (
              <View style={{ gap: 12, marginTop: 12 }}>
                <AuthInput
                  label={t('Email')}
                  value={email}
                  onChange={setEmail}
                  keyboard="email-address"
                  icon="mail-outline"
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void send.mutateAsync({ email });
                  }}
                  disabled={!email || send.isPending}
                  style={[authStyles.secondaryBtn, !email && { opacity: 0.5 }]}
                >
                  {send.isPending ? (
                    <ActivityIndicator color={colors.ink} />
                  ) : (
                    <Text style={authStyles.secondaryBtnText}>Send verification email</Text>
                  )}
                </Pressable>
                {send.isSuccess && (
                  <Body muted>Verification message queued. Inspect the local Mailpit inbox.</Body>
                )}
                {Boolean(send.error) && <InlineError error={send.error} />}
              </View>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

// -------------------------------------------------------------
// LUXURY AUTH STYLES
// -------------------------------------------------------------
const authStyles = StyleSheet.create({
  // Hero Section
  heroContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: 'center',
  },
  heroTopBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroBackBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  skipBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.orangeText,
  },
  emblemGlow: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255, 123, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emblemRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emblemImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  heroTextWrap: {
    alignItems: 'center',
    gap: 6,
  },
  kickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 123, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroKicker: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.orangeText,
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontFamily: fonts.editorial,
    fontSize: 30,
    lineHeight: 38,
    color: colors.ink,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 320,
  },

  // Main Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
    gap: 16,
  },

  // Social authentication
  socialWrap: {
    gap: 10,
  },
  socialHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  socialHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0EDE6',
  },
  socialHeaderText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#9A9086',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 8,
  },
  socialBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 60,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#241B10',
    shadowOpacity: 0.07,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  socialBtnText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    letterSpacing: -0.1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0EDE6',
  },
  dividerText: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: '#9A9086',
  },
  socialNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8F0',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE4CC',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  socialNoticeIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#FFEAD8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialNoticeText: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 12,
    lineHeight: 17,
    color: '#8A4A12',
  },

  // Password strength meter
  strengthWrap: {
    gap: 5,
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 5,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontFamily: fonts.ui,
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // Modern Input
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  inputContainerFocused: {
    borderColor: colors.orange,
    backgroundColor: '#FFFFFF',
  },
  inputContainerError: {
    borderColor: colors.error,
    backgroundColor: '#FFF8F8',
  },
  inputIconBox: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputField: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  passwordToggleBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  fieldErrorText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.error,
  },

  // Forgot password
  forgotRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.orangeText,
  },

  // Switch row
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
  },
  switchText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  switchAction: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.orange,
  },

  // Security hint
  securityHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  securityHintText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.muted,
  },

  // Terms notice
  termsNotice: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  // Secondary button for token auth
  secondaryBtn: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
  },
});
