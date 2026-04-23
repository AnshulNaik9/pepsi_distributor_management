// Color palette and design tokens matching the web app's dark/premium aesthetic
export const Colors = {
  // Primary
  primary: '#3B82F6',       // blue-500
  primaryDark: '#2563EB',   // blue-600
  primaryLight: '#60A5FA',  // blue-400
  primaryBg: 'rgba(59, 130, 246, 0.1)',

  // Backgrounds
  bgDark: '#0F172A',        // slate-900
  bgDarker: '#020617',      // slate-950
  bgBlue: '#172554',        // blue-950
  bgCard: 'rgba(255, 255, 255, 0.08)',
  bgCardHover: 'rgba(255, 255, 255, 0.12)',
  bgSurface: '#1E293B',     // slate-800
  bgInput: 'rgba(255, 255, 255, 0.08)',

  // Text
  textPrimary: '#1E293B',    // Dark Slate (was White)
  textSecondary: '#475569',  // Medium Slate (was Transparent White)
  textMuted: '#94A3B8',      // Light Slate (was Transparent White)
  textAccent: '#3B82F6',

  // Borders
  border: 'rgba(255, 255, 255, 0.12)',
  borderLight: 'rgba(255, 255, 255, 0.08)',

  // Status
  success: '#22C55E',
  successBg: 'rgba(34, 197, 94, 0.1)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.1)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.1)',
  info: '#06B6D4',
  infoBg: 'rgba(6, 182, 212, 0.1)',

  // Payment modes
  cashColor: '#22C55E',
  upiColor: '#8B5CF6',
  creditColor: '#EF4444',
  splitColor: '#F59E0B',

  // Gradient backgrounds for screens
  gradientStart: '#0F172A',
  gradientMid: '#172554',
  gradientEnd: '#0F172A',

  // Light backgrounds (for driver mode)
  lightBg: '#F8FAFC',
  lightCard: '#FFFFFF',
  lightBorder: '#E2E8F0',
  lightText: '#1E293B',
  lightTextSecondary: '#64748B',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  '5xl': 40,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  primary: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};
