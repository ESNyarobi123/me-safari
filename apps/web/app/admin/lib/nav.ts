import type { IconName } from '../components/icons';

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  /** Permission required to see this entry (ADMIN holds every permission). */
  permission?: string;
  /** Match the path exactly (used by the overview entry). */
  exact?: boolean;
  description?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/** The full admin information architecture, grouped the way operators think. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {
        label: 'Dashboard',
        href: '/admin',
        icon: 'grid',
        exact: true,
        description: 'Business overview, money and exceptions',
      },
      {
        label: 'Bookings',
        href: '/admin/bookings',
        icon: 'ticket',
        permission: 'booking.read',
        description: 'Requests, confirmations and payments',
      },
      {
        label: 'Custom requests',
        href: '/admin/custom-requests',
        icon: 'file',
        permission: 'quote.manage',
        description: 'Tailor-made enquiries and quotes',
      },
      {
        label: 'Inquiries',
        href: '/admin/inquiries',
        icon: 'inbox',
        permission: 'inquiry.manage',
        description: 'Website and walk-in leads',
      },
      {
        label: 'Customers',
        href: '/admin/customers',
        icon: 'users',
        permission: 'customer.read',
        description: 'Traveller profiles and history',
      },
      {
        label: 'Trips & dispatch',
        href: '/admin/trips',
        icon: 'compass',
        permission: 'trip.read',
        description: 'Live operations, guides and vehicles',
      },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog & content',
    items: [
      {
        label: 'Packages',
        href: '/admin/packages',
        icon: 'compass',
        permission: 'catalog.manage',
        description: 'Safari products, itineraries and pricing',
      },
      {
        label: 'Destinations',
        href: '/admin/destinations',
        icon: 'pin',
        permission: 'catalog.manage',
        description: 'Parks, towns and islands',
      },
      {
        label: 'Services',
        href: '/admin/services',
        icon: 'sparkles',
        permission: 'catalog.manage',
        description: 'Service lines and request modes',
      },
      {
        label: 'Landing content',
        href: '/admin/landing',
        icon: 'layout',
        permission: 'content.publish',
        description: 'Public website blocks and publishing',
      },
    ],
  },
  {
    id: 'rentals',
    label: 'Safari AI Rentals',
    items: [
      {
        label: 'Rental vehicles',
        href: '/admin/rentals',
        icon: 'car',
        permission: 'rental.manage',
        description: 'Chauffeur fleet, rates and availability',
      },
      {
        label: 'Rental services',
        href: '/admin/rentals/services',
        icon: 'bolt',
        permission: 'rental.manage',
        description: 'Signature service lines',
      },
      {
        label: 'Rental policy',
        href: '/admin/rentals/policy',
        icon: 'shield',
        permission: 'rental.manage',
        description: 'Terms, deposits and publishing',
      },
    ],
  },
  {
    id: 'fleet',
    label: 'Fleet & team',
    items: [
      {
        label: 'Fleet',
        href: '/admin/fleet',
        icon: 'truck',
        permission: 'fleet.manage',
        description: 'Safari vehicles and maintenance',
      },
      {
        label: 'Staff',
        href: '/admin/staff',
        icon: 'id',
        permission: 'staff.manage',
        description: 'Guides, drivers and operations staff',
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      {
        label: 'Payments',
        href: '/admin/payments',
        icon: 'card',
        permission: 'finance.read',
        description: 'Captures, postings and receipts',
      },
      {
        label: 'Refunds',
        href: '/admin/refunds',
        icon: 'refresh',
        permission: 'finance.read',
        description: 'Requests, approvals and settlements',
      },
      {
        label: 'Offline payments',
        href: '/admin/offline-payments',
        icon: 'download',
        permission: 'finance.offline_record',
        description: 'Bank, cash and evidence verification',
      },
      {
        label: 'Reports & exports',
        href: '/admin/reports',
        icon: 'chart',
        permission: 'report.finance',
        description: 'Summaries and CSV exports',
      },
    ],
  },
  {
    id: 'engagement',
    label: 'Engagement',
    items: [
      {
        label: 'Reviews',
        href: '/admin/reviews',
        icon: 'star',
        permission: 'support.manage',
        description: 'Traveller feedback moderation',
      },
      {
        label: 'Support',
        href: '/admin/support',
        icon: 'buoy',
        permission: 'support.manage',
        description: 'Customer conversations',
      },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    items: [
      {
        label: 'Access & roles',
        href: '/admin/access',
        icon: 'shield',
        permission: 'access.manage',
        description: 'Users, roles and overrides',
      },
      {
        label: 'Audit log',
        href: '/admin/audit',
        icon: 'history',
        permission: 'audit.read',
        description: 'Every privileged action',
      },
      {
        label: 'Failed jobs',
        href: '/admin/jobs',
        icon: 'cog',
        permission: 'audit.read',
        description: 'Outbox retries and reconciliation',
      },
      {
        label: 'Integrations',
        href: '/admin/integrations',
        icon: 'plug',
        permission: 'settings.manage',
        description: 'Payments, email and push readiness',
      },
      {
        label: 'Settings',
        href: '/admin/settings',
        icon: 'sliders',
        permission: 'settings.manage',
        description: 'Company, policies and notifications',
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** Resolve the nav entry that owns a given pathname (longest match wins). */
export function navItemForPath(pathname: string): NavItem | undefined {
  const clean = pathname.replace(/\/+$/, '') || '/admin';
  const matches = ALL_NAV_ITEMS.filter((item) => {
    const href = item.href.replace(/\/+$/, '');
    return item.exact ? clean === href : clean === href || clean.startsWith(`${href}/`);
  });
  return matches.sort((a, b) => b.href.length - a.href.length)[0];
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  const href = item.href.replace(/\/+$/, '');
  return navItemForPath(pathname)?.href === item.href;
}

export function filterNavByPermissions(permissions: string[]): NavGroup[] {
  const granted = new Set(permissions);
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || granted.has(item.permission)),
  })).filter((group) => group.items.length > 0);
}
