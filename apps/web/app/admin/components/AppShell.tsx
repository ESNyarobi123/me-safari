'use client';

import {
  Avatar,
  Button,
  Chip,
  Dropdown,
  Input,
  Kbd,
  Label,
  ListBox,
  Modal,
  ScrollShadow,
  Select,
  Separator,
  Skeleton,
  Spinner,
  Switch,
  TextField,
  Tooltip,
  toast,
  useOverlayState,
} from '@heroui/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Icon, BrandMark, type IconName } from './icons';
import { CURRENCY_OPTIONS, StatusChip } from './ui';
import { useAuth } from '../lib/auth';
import { useWorkspace } from '../lib/workspace';
import { useBrandTheme } from '../lib/providers';
import { useList } from '../lib/hooks';
import { ALL_NAV_ITEMS, NAV_GROUPS, filterNavByPermissions, navItemForPath, type NavItem } from '../lib/nav';
import { formatRelative, labelize } from '../lib/format';

/* ================================================================= auth gate */

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anonymous') router.replace('/admin/login/');
  }, [router, status]);

  if (status !== 'authenticated') {
    return (
      <div className="admin-console-shell grid min-h-dvh place-items-center p-6">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-[#0A2540]/10 bg-[#FFFDFA] px-8 py-7 shadow-xl dark:border-white/10 dark:bg-[#0D1D30]">
          <BrandMark size={54} />
          <Spinner size="lg" color="accent" />
          <p className="font-ui text-sm font-bold text-[#0A2540] dark:text-[#FFFDFA]">
            {status === 'booting' ? 'Restoring your Arusha control room…' : 'Redirecting to sign in…'}
          </p>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}

/* ================================================================= app shell */

function AppShell({ children }: { children: ReactNode }) {
  const { collapsed, setMobileNavOpen, mobileNavOpen, setPaletteOpen } = useWorkspace();
  const pathname = usePathname();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  return (
    <div className="admin-console-shell min-h-dvh">
      {/* desktop sidebar */}
      <aside
        className={`admin-sidebar-dock fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-300 ease-out lg:flex lg:flex-col ${
          collapsed ? 'w-[84px]' : 'w-[280px]'
        }`}
      >
        <SidebarBody collapsed={collapsed} />
      </aside>

      {/* mobile drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-backdrop backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden
          />
          <div className="admin-sidebar-dock animate-rise absolute inset-y-0 left-0 flex w-[288px] flex-col">
            <SidebarBody collapsed={false} />
          </div>
        </div>
      ) : null}

      <div
        className={`flex min-h-dvh flex-col transition-[padding] duration-300 ease-out ${
          collapsed ? 'lg:pl-[84px]' : 'lg:pl-[280px]'
        }`}
      >
        <Topbar onSearch={() => setPaletteOpen(true)} />
        <main className="admin-scroll flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
        <footer className="border-t border-[#0A2540]/8 bg-[#FFFDFA]/75 px-4 py-4 text-xs text-muted backdrop-blur-sm sm:px-6 dark:border-white/10 dark:bg-[#0B192B]/80">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A2540] px-2.5 py-1 font-ui text-[10px] font-extrabold tracking-wider text-white uppercase">
                <span className="size-1.5 rounded-full bg-[#FF7B00]" />
                M&amp;A Safaris
              </span>
              <span className="font-medium text-foreground">
                Unified Safari Operations &amp; Safari AI Rentals Console
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/" className="font-ui font-bold text-[#A94700] hover:text-[#FF7B00] dark:text-[#FF9526]">
                Public Website ↗
              </Link>
              <span>·</span>
              <span>Arusha &amp; Zanzibar · Africa/Dar_es_Salaam</span>
            </div>
          </div>
        </footer>
      </div>

      <CommandPalette />
    </div>
  );
}

/* ================================================================== sidebar */

function SidebarBody({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { permissions, user, signOut } = useAuth();
  const { toggleCollapsed, setMobileNavOpen } = useWorkspace();
  const { resolvedTheme, toggle: toggleTheme } = useBrandTheme();
  const groups = useMemo(() => filterNavByPermissions(permissions), [permissions]);
  const active = navItemForPath(pathname);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Brand Header */}
      <div className={`flex items-center gap-2.5 px-3.5 pt-4 pb-3 ${collapsed ? 'justify-center' : ''}`}>
        <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
          <BrandMark size={40} />
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="font-ui truncate text-[15px] font-extrabold tracking-tight text-[#0A2540] dark:text-[#FFFDFA]">
                M&amp;A Safaris
              </p>
              <p className="truncate font-ui text-[10px] font-extrabold tracking-[0.14em] text-[#A94700] uppercase dark:text-[#FF9526]">
                Control Room
              </p>
            </div>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="ml-auto hidden size-7 shrink-0 place-items-center rounded-full border border-[#0A2540]/10 bg-[#F6F3ED] text-[#0A2540] transition-colors hover:bg-[#FFF2E5] hover:text-[#FF7B00] lg:grid dark:border-white/10 dark:bg-white/10 dark:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={15} />
        </button>
      </div>

      {/* Signature Hero UI Mini Orange + Navy Pedestal */}
      {!collapsed ? (
        <div className="admin-sidebar-pedestal">
          <div className="admin-sidebar-pedestal-bar">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Arusha &amp; ZNZ Desk
            </span>
            <span className="text-[#FF9526]">24/7 LIVE</span>
          </div>
          <div className="admin-sidebar-pedestal-body">
            <span className="rounded-md bg-[#0C0D0B]/85 px-2 py-0.5 text-[10px]">Safaris</span>
            <span className="rounded-md bg-[#0C0D0B]/85 px-2 py-0.5 text-[10px]">AI Rentals</span>
            <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px]">Dispatch</span>
          </div>
        </div>
      ) : null}

      <ScrollShadow className="admin-scroll min-h-0 flex-1 px-2.5 pb-3" orientation="vertical">
        <nav className="space-y-4">
          {groups.map((group, groupIndex) => (
            <div key={group.id}>
              {!collapsed ? (
                <div className="flex items-center justify-between px-2.5 pb-1.5">
                  <p className="flex items-center gap-1.5 font-ui text-[10px] font-extrabold tracking-[0.14em] text-[#A94700] uppercase dark:text-[#FF9526]">
                    <span className="size-1.5 rounded-full bg-[#FF7B00]" />
                    {group.label}
                  </p>
                  <span className="rounded-full bg-[#F6F3ED] px-1.5 py-0.2 font-ui text-[9px] font-extrabold text-[#5E6358] dark:bg-white/10 dark:text-slate-300">
                    0{groupIndex + 1}
                  </span>
                </div>
              ) : (
                <div className="mx-auto mb-2 h-px w-8 bg-separator" />
              )}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <SidebarLink
                      item={item}
                      collapsed={collapsed}
                      active={active?.href === item.href}
                      onNavigate={() => setMobileNavOpen(false)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollShadow>

      {/* Bottom Operator & Theme Pod */}
      <div className={`border-t border-[#0A2540]/8 p-2.5 dark:border-white/10 ${collapsed ? 'space-y-1.5' : 'space-y-2'}`}>
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#0A2540]/8 bg-[#F6F3ED]/90 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2 font-ui text-xs font-bold text-[#0A2540] dark:text-[#F6F3ED]">
              <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={14} className="text-[#FF7B00]" />
              {resolvedTheme === 'dark' ? 'Night theme' : 'Cream theme'}
            </div>
            <Switch size="sm" isSelected={resolvedTheme === 'dark'} onChange={toggleTheme} aria-label="Dark mode">
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch>
          </div>
        ) : (
          <Tooltip>
            <Tooltip.Trigger>
              <button
                type="button"
                onClick={toggleTheme}
                className="mx-auto grid size-9 place-items-center rounded-xl text-muted hover:bg-default/70 hover:text-foreground"
                aria-label="Toggle theme"
              >
                <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={16} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>Toggle theme</Tooltip.Content>
          </Tooltip>
        )}

        {!collapsed ? (
          <div className="rounded-2xl border border-[#0A2540]/10 bg-[#FFFDFA] p-2.5 shadow-sm dark:border-white/10 dark:bg-[#102238]">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#FF7B00] to-[#FF9526] font-ui text-xs font-extrabold text-white shadow-sm">
                {(user?.name ?? 'MA').slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-ui truncate text-xs font-extrabold text-[#0A2540] dark:text-white">{user?.name}</p>
                <p className="truncate text-[11px] text-muted">{user?.email}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
              <div className="flex flex-wrap gap-1">
                {(user?.roles ?? []).slice(0, 2).map((role) => (
                  <Chip key={role} size="sm" variant="soft" color={role === 'ADMIN' ? 'accent' : 'default'}>
                    <Chip.Label>{labelize(role)}</Chip.Label>
                  </Chip>
                ))}
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-1 rounded-full bg-[#FFF2E5] px-2 py-0.5 font-ui text-[10px] font-extrabold text-[#A94700] hover:bg-[#FF7B00] hover:text-white dark:bg-white/10 dark:text-[#FF9526]"
              >
                Site ↗
              </Link>
            </div>
            <Button size="sm" variant="tertiary" fullWidth className="mt-2" onPress={signOut}>
              <Icon name="logout" size={14} />
              Sign out
            </Button>
          </div>
        ) : (
          <Tooltip>
            <Tooltip.Trigger>
              <button
                type="button"
                onClick={signOut}
                className="mx-auto grid size-9 place-items-center rounded-xl text-muted hover:bg-danger/12 hover:text-danger"
                aria-label="Sign out"
              >
                <Icon name="logout" size={16} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>Sign out</Tooltip.Content>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function SidebarLink({
  item,
  collapsed,
  active,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onNavigate: () => void;
}) {
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`admin-nav-link ${active ? 'is-active' : ''} ${collapsed ? 'justify-center px-1.5' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <span className="admin-nav-icon">
        <Icon name={item.icon} size={15} />
      </span>
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {active ? <span className="size-2 shrink-0 rounded-full bg-[#FF7B00]" aria-hidden /> : null}
        </>
      ) : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <Tooltip.Trigger>{link}</Tooltip.Trigger>
      <Tooltip.Content>
        <span className="block font-medium">{item.label}</span>
        {item.description ? <span className="block text-[11px] opacity-80">{item.description}</span> : null}
      </Tooltip.Content>
    </Tooltip>
  );
}

/* =================================================================== topbar */

function Topbar({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, roles } = useAuth();
  const { currency, setCurrency, setMobileNavOpen } = useWorkspace();
  const { resolvedTheme, toggle: toggleTheme } = useBrandTheme();
  const active = navItemForPath(pathname);
  const group = NAV_GROUPS.find((entry) => entry.items.some((item) => item.href === active?.href));
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  return (
    <header className="admin-topbar-glass sticky top-0 z-20">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4 sm:px-6">
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          className="lg:hidden"
          aria-label="Open navigation"
          onPress={() => setMobileNavOpen(true)}
        >
          <Icon name="menu" size={18} />
        </Button>

        {/* Active Section Pill + Description */}
        <div className="hidden min-w-0 items-center gap-3 sm:flex">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#FF7B00]/25 bg-[#FFF2E5] text-[#FF7B00] shadow-xs dark:bg-[#FF7B00]/15">
            <Icon name={active?.icon ?? 'grid'} size={17} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-ui text-[11px] font-bold text-muted">
              <span className="text-[#A94700] uppercase dark:text-[#FF9526]">{group?.label ?? 'Workspace'}</span>
              <Icon name="chevron-right" size={11} />
              <span className="font-extrabold text-[#0A2540] dark:text-white">{active?.label ?? 'Dashboard'}</span>
            </div>
            <p className="truncate text-xs text-muted">{active?.description ?? 'Business overview'}</p>
          </div>
        </div>

        {/* Hero UI Pill Search Trigger */}
        <button
          type="button"
          onClick={onSearch}
          className="ml-auto flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-[#0A2540]/12 bg-[#FFFDFA] px-3.5 text-left text-sm text-muted shadow-xs transition-all hover:border-[#FF7B00]/45 hover:bg-[#FFF2E5]/40 sm:max-w-md lg:ml-6 dark:border-white/12 dark:bg-[#0F2136]"
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#FFF2E5] text-[#FF7B00] dark:bg-[#FF7B00]/20">
            <Icon name="search" size={13} />
          </span>
          <span className="truncate font-ui text-xs font-semibold">Search bookings, guests, fleet…</span>
          <Kbd className="ml-auto hidden sm:flex">
            <Kbd.Abbr keyValue="command" />
            <Kbd.Content>K</Kbd.Content>
          </Kbd>
        </button>

        {/* Live Desk Status Pill */}
        <div className="hidden items-center gap-1.5 rounded-full border border-[#0D7C79]/20 bg-[#E8F5F5] px-3 py-1.5 font-ui text-[11px] font-extrabold text-[#0D7C79] xl:inline-flex dark:bg-[#0D7C79]/15 dark:text-teal-300">
          <span className="size-2 rounded-full bg-[#0D7C79]" />
          Arusha Desk · Live
        </div>

        <Select
          aria-label="Reporting currency"
          className="hidden w-[104px] md:block"
          selectedKey={currency}
          onSelectionChange={(key) => key && setCurrency(String(key))}
        >
          <Select.Trigger className="rounded-full border border-[#0A2540]/12 bg-[#FFFDFA] font-ui text-xs font-extrabold text-[#0A2540] dark:border-white/12 dark:bg-[#0F2136] dark:text-white">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {CURRENCY_OPTIONS.map((code) => (
                <ListBox.Item key={code} id={code} textValue={code}>
                  {code}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <NotificationBell />

        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label="Toggle theme"
          onPress={toggleTheme}
          className="hidden rounded-full border border-[#0A2540]/10 bg-[#FFFDFA] sm:inline-grid dark:border-white/10 dark:bg-[#0F2136]"
        >
          <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={16} />
        </Button>

        <Dropdown isOpen={avatarMenuOpen} onOpenChange={setAvatarMenuOpen}>
          <Dropdown.Trigger
            className="flex items-center gap-2 rounded-full border border-[#0A2540]/12 bg-[#FFFDFA] py-1 pr-2.5 pl-1 shadow-xs transition-colors hover:border-[#FF7B00]/40 hover:bg-[#FFF2E5]/50 dark:border-white/12 dark:bg-[#0F2136]"
            aria-label="Account menu"
          >
            <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-[#FF7B00] to-[#FF9526] font-ui text-[11px] font-extrabold text-white">
              {(user?.name ?? 'A').slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden max-w-[110px] truncate font-ui text-xs font-extrabold text-[#0A2540] md:block dark:text-white">
              {user?.name?.split(' ')[0] ?? 'Admin'}
            </span>
            <Icon name="chevron-down" size={14} className="text-muted" />
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu>
              <div className="border-b border-separator px-3 py-2.5">
                <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
                <p className="truncate text-xs text-muted">{user?.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {roles.map((role) => (
                    <Chip key={role} size="sm" variant="soft" color={role === 'ADMIN' ? 'accent' : 'default'}>
                      <Chip.Label>{labelize(role)}</Chip.Label>
                    </Chip>
                  ))}
                </div>
              </div>
              <Dropdown.Item id="profile" textValue="Account settings" onAction={() => router.push('/admin/settings/')}>
                <Icon name="sliders" size={15} />
                Workspace settings
              </Dropdown.Item>
              <Dropdown.Item id="audit" textValue="My audit trail" onAction={() => router.push('/admin/audit/')}>
                <Icon name="history" size={15} />
                Audit trail
              </Dropdown.Item>
              <Dropdown.Item id="refresh" textValue="Refresh session" onAction={() => window.location.reload()}>
                <Icon name="refresh" size={15} />
                Reload console
              </Dropdown.Item>
              <Dropdown.Item id="signout" textValue="Sign out" className="text-danger" onAction={signOut}>
                <Icon name="logout" size={15} />
                Sign out
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </header>
  );
}

function NotificationBell() {
  const { data, isLoading } = useList<Record<string, unknown>>('/me/notifications', { limit: 8 });
  const rows = data?.rows ?? [];
  const unread = rows.filter((row) => !row.readAt).length;

  return (
    <Dropdown>
      <Dropdown.Trigger
        className="relative grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-default/70 hover:text-foreground"
        aria-label="Notifications"
      >
        <Icon name="bell" size={17} />
        {unread > 0 ? (
          <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-brand-orange text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b border-separator px-3 py-2.5">
          <p className="font-ui text-sm font-semibold text-foreground">Notifications</p>
          <Chip size="sm" variant="soft" color="default">
            <Chip.Label>{unread} unread</Chip.Label>
          </Chip>
        </div>
        <ScrollShadow className="admin-scroll max-h-80 p-1.5" orientation="vertical">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((key) => (
                <Skeleton key={key} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted">You are all caught up.</p>
          ) : (
            <ul className="space-y-0.5">
              {rows.map((row) => (
                <li key={String(row.id)} className="flex gap-2 rounded-lg px-2.5 py-2 hover:bg-default/50">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-brand-orange/12 text-brand-orange">
                    <Icon name="bell" size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">
                      {String(row.title ?? row.type ?? 'Notification')}
                    </p>
                    <p className="line-clamp-2 text-[11px] text-muted">{String(row.body ?? '')}</p>
                    <p className="mt-0.5 text-[10px] text-muted">{formatRelative(row.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollShadow>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/* ========================================================== command palette */

function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useWorkspace();
  const { permissions, signOut } = useAuth();
  const { toggle: toggleTheme } = useBrandTheme();
  const router = useRouter();
  const [term, setTerm] = useState('');
  const state = useOverlayState({ isOpen: paletteOpen, onOpenChange: setPaletteOpen });

  const items = useMemo(() => {
    const allowedHrefs = new Set(
      filterNavByPermissions(permissions).flatMap((group) => group.items.map((item) => item.href)),
    );
    return ALL_NAV_ITEMS.filter((item) => allowedHrefs.has(item.href));
  }, [permissions]);

  useEffect(() => {
    if (!paletteOpen) setTerm('');
  }, [paletteOpen]);

  const needle = term.trim().toLowerCase();
  const results = items.filter(
    (item) =>
      !needle ||
      item.label.toLowerCase().includes(needle) ||
      item.href.toLowerCase().includes(needle) ||
      (item.description ?? '').toLowerCase().includes(needle),
  );

  function go(href: string) {
    state.close();
    router.push(href);
  }

  return (
    <Modal isOpen={state.isOpen} onOpenChange={state.setOpen}>
      <Modal.Backdrop>
        <Modal.Container size="lg" placement="top">
          <Modal.Dialog className="p-0">
            <div className="border-b border-separator p-3">
              <TextField className="w-full" fullWidth value={term} onChange={setTerm} autoFocus>
                <Label className="sr-only">Search the console</Label>
                <Input type="search" placeholder="Jump to a page, or type a keyword…" aria-label="Search the console" />
              </TextField>
            </div>
            <Modal.Body className="admin-scroll max-h-[60vh] overflow-y-auto p-1.5">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">No page matches “{term}”.</p>
              ) : (
                <ul className="space-y-0.5">
                  {results.map((item) => (
                    <li key={item.href}>
                      <button
                        type="button"
                        onClick={() => go(item.href)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-default/60"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-orange/12 text-brand-orange">
                          <Icon name={item.icon} size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{item.label}</span>
                          <span className="block truncate text-xs text-muted">{item.description}</span>
                        </span>
                        <Icon name="chevron-right" size={15} className="text-muted" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Separator className="my-2" />
              <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                <PaletteAction icon="moon" label="Toggle dark mode" onAction={() => { toggleTheme(); state.close(); }} />
                <PaletteAction icon="refresh" label="Reload console" onAction={() => window.location.reload()} />
                <PaletteAction icon="history" label="Open audit log" onAction={() => go('/admin/audit/')} />
                <PaletteAction
                  icon="logout"
                  label="Sign out"
                  danger
                  onAction={async () => {
                    state.close();
                    await signOut();
                    toast.success('Signed out');
                  }}
                />
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function PaletteAction({
  icon,
  label,
  onAction,
  danger,
}: {
  icon: IconName;
  label: string;
  onAction: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onAction}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-default/60 ${
        danger ? 'text-danger' : 'text-foreground'
      }`}
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  );
}
