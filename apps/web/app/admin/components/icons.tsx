import type { ReactNode, SVGProps } from 'react';

/**
 * A compact, dependency-free icon set for the admin console.
 * Every glyph is drawn on a 24×24 grid and inherits `currentColor`,
 * so it works inside HeroUI buttons, chips and menus without size overrides.
 */
export type IconName =
  | 'grid'
  | 'ticket'
  | 'file'
  | 'inbox'
  | 'users'
  | 'compass'
  | 'pin'
  | 'sparkles'
  | 'layout'
  | 'car'
  | 'truck'
  | 'id'
  | 'card'
  | 'chart'
  | 'star'
  | 'buoy'
  | 'shield'
  | 'history'
  | 'cog'
  | 'sliders'
  | 'plug'
  | 'search'
  | 'bell'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'plus'
  | 'sun'
  | 'moon'
  | 'logout'
  | 'external'
  | 'refresh'
  | 'filter'
  | 'download'
  | 'upload'
  | 'check'
  | 'x'
  | 'alert'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-right'
  | 'menu'
  | 'panel'
  | 'copy'
  | 'edit'
  | 'trash'
  | 'eye'
  | 'lock'
  | 'mail'
  | 'phone'
  | 'globe'
  | 'building'
  | 'calendar'
  | 'clock'
  | 'trending-up'
  | 'trending-down'
  | 'more'
  | 'sort'
  | 'image'
  | 'info'
  | 'bolt';

const GLYPHS: Record<IconName, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 9.5V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5z" />
      <path d="M13.5 5v14" strokeDasharray="1 3" />
    </>
  ),
  file: (
    <>
      <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" />
      <path d="M13.5 3v5.5H19" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 4h16l1 9v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z" />
      <path d="M3 13h5l1.5 3h5L16 13h5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16.4 5.2a3.2 3.2 0 0 1 0 5.6" />
      <path d="M17.4 20a6.3 6.3 0 0 0-2-4.6" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.4 8.6l-2.1 5.3-5.3 2.1 2.1-5.3z" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.5s7-5.6 7-11.2A7 7 0 1 0 5 10.3c0 5.6 7 11.2 7 11.2z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  sparkles: (
    <>
      <path d="M11.5 3l1.6 4.3 4.3 1.6-4.3 1.6-1.6 4.3-1.6-4.3L5.6 8.9l4.3-1.6z" />
      <path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </>
  ),
  layout: (
    <>
      <rect x="3" y="3.5" width="18" height="17" rx="2.5" />
      <path d="M3 9.5h18" />
      <path d="M9.5 9.5v11" />
    </>
  ),
  car: (
    <>
      <path d="M3.5 12.5l1.7-4.4A2.4 2.4 0 0 1 7.5 6.5h9a2.4 2.4 0 0 1 2.3 1.6l1.7 4.4v5.5a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1v-1H7.1v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z" />
      <path d="M3.5 12.5h17" />
      <circle cx="7.4" cy="15.6" r="1.3" />
      <circle cx="16.6" cy="15.6" r="1.3" />
    </>
  ),
  truck: (
    <>
      <path d="M2.5 17V7.5A1.5 1.5 0 0 1 4 6h8.5a1.5 1.5 0 0 1 1.5 1.5V17" />
      <path d="M14 10h3.6a2 2 0 0 1 1.7 1l1.7 2.7V17h-7z" />
      <circle cx="7" cy="17.8" r="1.7" />
      <circle cx="17.4" cy="17.8" r="1.7" />
    </>
  ),
  id: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.4" />
      <circle cx="8.6" cy="11" r="2" />
      <path d="M5.4 16.4a3.4 3.4 0 0 1 6.4 0" />
      <path d="M14.4 10H18" />
      <path d="M14.4 13.6h2.8" />
    </>
  ),
  card: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.6" />
      <path d="M2.5 10h19" />
      <path d="M6 14.5h3" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v16h16" />
      <path d="M8 20v-5.5" />
      <path d="M12.5 20V9" />
      <path d="M17 20v-9" />
    </>
  ),
  star: <path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />,
  buoy: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="M5.6 5.6L9 9" />
      <path d="M15 15l3.4 3.4" />
      <path d="M18.4 5.6L15 9" />
      <path d="M9 15l-3.4 3.4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5.5c0 4.4-3 7.6-7 9.5-4-1.9-7-5.1-7-9.5V6z" />
      <path d="M9.2 12l2 2 3.6-3.9" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.7-6.2" />
      <path d="M3.5 4.5V9H8" />
      <path d="M12 8v4.4l3 1.8" />
    </>
  ),
  cog: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="M5.6 5.6l1.5 1.5" />
      <path d="M16.9 16.9l1.5 1.5" />
      <path d="M18.4 5.6l-1.5 1.5" />
      <path d="M7.1 16.9l-1.5 1.5" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7.5h9" />
      <path d="M17.5 7.5H20" />
      <circle cx="15.2" cy="7.5" r="2.2" />
      <path d="M4 16.5h3" />
      <path d="M11.5 16.5H20" />
      <circle cx="9.2" cy="16.5" r="2.2" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3v4.5" />
      <path d="M15 3v4.5" />
      <path d="M6.6 7.5h10.8v3.2a5.4 5.4 0 0 1-10.8 0z" />
      <path d="M12 16.1V21" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.2 16.2L21 21" />
    </>
  ),
  bell: (
    <>
      <path d="M18 15.5V10a6 6 0 1 0-12 0v5.5L4.4 18h15.2z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  'chevron-down': <path d="M6 9.5l6 6 6-6" />,
  'chevron-right': <path d="M9.5 6l6 6-6 6" />,
  'chevron-left': <path d="M14.5 6l-6 6 6 6" />,
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2" />
      <path d="M12 19.5v2" />
      <path d="M2.5 12h2" />
      <path d="M19.5 12h2" />
      <path d="M5.2 5.2l1.4 1.4" />
      <path d="M17.4 17.4l1.4 1.4" />
      <path d="M18.8 5.2l-1.4 1.4" />
      <path d="M6.6 17.4l-1.4 1.4" />
    </>
  ),
  moon: <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z" />,
  logout: (
    <>
      <path d="M14.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3.5" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h9" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-8.5 8.5" />
      <path d="M18 14.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20.5 11.5A8.5 8.5 0 0 0 6.7 6.4L3.5 9.5" />
      <path d="M3.5 4.5V9.5H8.5" />
      <path d="M3.5 12.5a8.5 8.5 0 0 0 13.8 5.1l3.2-3.1" />
      <path d="M20.5 19.5v-5h-5" />
    </>
  ),
  filter: <path d="M4 5h16l-6.2 7.2V19l-3.6 2v-8.8z" />,
  download: (
    <>
      <path d="M12 3.5v11" />
      <path d="M8 11l4 4 4-4" />
      <path d="M5 20.5h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 20.5v-11" />
      <path d="M8 13l4-4 4 4" />
      <path d="M5 3.5h14" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V13" />
      <path d="M12 16.3h.01" />
    </>
  ),
  'arrow-up': (
    <>
      <path d="M12 19.5V5" />
      <path d="M6 11l6-6 6 6" />
    </>
  ),
  'arrow-down': (
    <>
      <path d="M12 4.5V19" />
      <path d="M18 13l-6 6-6-6" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M4.5 12h15" />
      <path d="M13.5 6l6 6-6 6" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11.5" height="11.5" rx="2.4" />
      <path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4.2L20 8.2 15.8 4 4 15.8z" />
      <path d="M14.5 5.3l4.2 4.2" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9.5 7V4.8h5V7" />
      <path d="M6.6 7l.8 12.2A1.9 1.9 0 0 0 9.3 21h5.4a1.9 1.9 0 0 0 1.9-1.8L17.4 7" />
      <path d="M10.5 11v6" />
      <path d="M13.5 11v6" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 6.2 12 6.2 21.5 12 21.5 12 18 17.8 12 17.8 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="10.5" rx="2.4" />
      <path d="M8 10V7.4a4 4 0 0 1 8 0V10" />
    </>
  ),
  mail: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.4" />
      <path d="M3.6 7.2l8.4 6 8.4-6" />
    </>
  ),
  phone: (
    <path d="M6.2 3h3l1.6 4-2.1 1.6a11.4 11.4 0 0 0 5.2 5.2L15.5 12l4 1.6v3a2.2 2.2 0 0 1-2.4 2.2A16.8 16.8 0 0 1 4 5.4 2.2 2.2 0 0 1 6.2 3z" />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.4 3.8 5.5 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.5-3.8-9S9.5 5.4 12 3z" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V6.5L11 3v18" />
      <path d="M11 10.5L19.5 14v7" />
      <path d="M3 21h18" />
      <path d="M7.4 9h.01" />
      <path d="M7.4 13h.01" />
      <path d="M7.4 17h.01" />
      <path d="M15 16.5h.01" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.4" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.2V12l3.2 1.9" />
    </>
  ),
  'trending-up': (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  'trending-down': (
    <>
      <path d="M3 7l6 6 4-4 8 8" />
      <path d="M21 17h-6v-6" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>
  ),
  sort: (
    <>
      <path d="M7 4v16" />
      <path d="M3.5 16.5L7 20l3.5-3.5" />
      <path d="M14 6.5h7" />
      <path d="M14 11.5h5" />
      <path d="M14 16.5h3" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.4" />
      <circle cx="8.6" cy="9.6" r="1.8" />
      <path d="M4 18l5-5 4 4 3-2.6 4 3.6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.2" />
      <path d="M12 7.7h.01" />
    </>
  ),
  bolt: <path d="M13.2 2.5L4.6 13.4H11l-1 8.1 8.6-10.9H12z" />,
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {GLYPHS[name]}
    </svg>
  );
}

/** Brand mark used by the sidebar and login screen. */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="relative grid place-items-center overflow-hidden rounded-2xl border border-white/10"
      style={{ width: size, height: size, background: '#0c0d0b' }}
    >
      <img
        src="/assets/brand-logo.png"
        alt=""
        style={{ width: size * 1.5, height: size * 1.05, maxWidth: 'none' }}
      />
    </span>
  );
}
