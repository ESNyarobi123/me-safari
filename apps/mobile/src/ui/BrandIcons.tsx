import React from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * Official, high-fidelity brand marks for the social sign-in row.
 *
 * These are vector (SVG) recreations using the published brand geometry so they stay
 * razor-sharp on every screen density. Each glyph is drawn on its own canonical
 * viewBox and scaled with the `size` prop, so a single component works for 20pt
 * chips, 24pt list rows and 44pt hero buttons alike.
 */

type IconProps = { size?: number };

/** Google "G" — four-colour mark from Google Identity brand guidelines. */
export function GoogleIcon({ size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

/** Apple — solid mark, defaults to white for dark buttons. */
export function AppleIcon({ size = 22, color = '#FFFFFF' }: IconProps & { color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702"
      />
    </Svg>
  );
}

/** Facebook — official "f" mark. Omit `badge` for the glyph-only form used on the blue button. */
export function FacebookIcon({
  size = 22,
  badge,
  glyph = '#FFFFFF',
}: IconProps & { badge?: string; glyph?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {badge ? <Circle cx="12" cy="12" r="12" fill={badge} /> : null}
      <Path
        fill={glyph}
        d="M16.671 15.469 17.203 12h-3.328V9.749c0-.949.465-1.873 1.956-1.873h1.514V4.922s-1.374-.235-2.686-.235c-2.74 0-4.532 1.66-4.532 4.668v2.645H7.078v3.469h3.05v8.385c.61.096 1.243.146 1.872.146s1.262-.05 1.872-.146v-8.385h2.799z"
      />
    </Svg>
  );
}

/** Instagram — camera glyph stroked with the official sunset gradient. */
export function InstagramIcon({ size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="instagramGradient" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#FEDA75" />
          <Stop offset="0.28" stopColor="#FA7E1E" />
          <Stop offset="0.55" stopColor="#D62976" />
          <Stop offset="0.78" stopColor="#962FBF" />
          <Stop offset="1" stopColor="#4F5BD5" />
        </LinearGradient>
      </Defs>
      <G>
        <Rect
          x="2.7"
          y="2.7"
          width="18.6"
          height="18.6"
          rx="5.5"
          fill="none"
          stroke="url(#instagramGradient)"
          strokeWidth="2"
        />
        <Circle cx="12" cy="12" r="4.35" fill="none" stroke="url(#instagramGradient)" strokeWidth="2" />
        <Circle cx="17.35" cy="6.65" r="1.25" fill="url(#instagramGradient)" />
      </G>
    </Svg>
  );
}

export type SocialProviderId = 'google' | 'apple' | 'facebook' | 'instagram';

export const SOCIAL_BRAND: Record<
  SocialProviderId,
  {
    label: string;
    /** Button background for the authentic brand treatment. */
    background: string;
    border: string;
    /** Label colour that stays legible on the brand background. */
    labelColor: string;
    Icon: (props: IconProps) => React.ReactElement;
  }
> = {
  google: {
    label: 'Google',
    background: '#FFFFFF',
    border: '#E4E1DA',
    labelColor: '#3C4043',
    Icon: GoogleIcon,
  },
  apple: {
    label: 'Apple',
    background: '#0B0B0F',
    border: '#0B0B0F',
    labelColor: '#FFFFFF',
    Icon: (props) => <AppleIcon {...props} color="#FFFFFF" />,
  },
  facebook: {
    label: 'Facebook',
    background: '#1877F2',
    border: '#1877F2',
    labelColor: '#FFFFFF',
    Icon: (props) => <FacebookIcon {...props} glyph="#FFFFFF" />,
  },
  instagram: {
    label: 'Instagram',
    background: '#FFFFFF',
    border: '#E4E1DA',
    labelColor: '#3C4043',
    Icon: InstagramIcon,
  },
};
