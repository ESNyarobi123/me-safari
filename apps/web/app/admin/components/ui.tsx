'use client';

import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Chip,
  Drawer,
  Dropdown,
  Input,
  Label,
  ListBox,
  Modal,
  ProgressBar,
  Select,
  Separator,
  Skeleton,
  Spinner,
  Surface,
  Switch,
  Table,
  TextField,
  Tooltip,
  Typography,
  toast,
  useOverlayState,
} from '@heroui/react';
import { createContext, useContext, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { formatMoney, initials, labelize, statusTone, type Tone } from '../lib/format';

export const CURRENCY_OPTIONS = ['USD', 'TZS', 'EUR', 'GBP', 'JPY', 'KWD'] as const;

/* =========================================================== page scaffold == */

export interface Crumb {
  label: string;
  href?: string;
}

export function Page({
  title,
  subtitle,
  actions,
  children,
  eyebrow,
  dense = false,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  eyebrow?: string;
  dense?: boolean;
}) {
  return (
    <div className="animate-rise mx-auto w-full max-w-[1500px] space-y-5">
      <header className="admin-page-hero flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="admin-eyebrow-pill">
              <span>{eyebrow ?? 'Safari Operations Desk'}</span>
              <span className="admin-eyebrow-pill-dot" aria-hidden>
                <Icon name="sparkles" size={11} />
              </span>
            </span>
            <span className="rounded-full bg-[#0A2540]/8 px-2.5 py-0.5 font-ui text-[10px] font-extrabold tracking-wider text-[#0A2540] uppercase dark:bg-white/10 dark:text-slate-200">
              Live Sync
            </span>
          </div>
          <h1 className="font-ui truncate text-[26px] leading-tight font-extrabold tracking-tight text-[#0A2540] sm:text-[30px] dark:text-[#FFFDFA]">
            {title}
          </h1>
          {subtitle ? <p className="mt-1.5 max-w-3xl text-sm text-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className={dense ? 'space-y-4' : 'space-y-5'}>{children}</div>
    </div>
  );
}

export function SectionTitle({
  children,
  icon,
  action,
  hint,
}: {
  children: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-[#FF7B00]/22 bg-[#FFF2E5] text-[#FF7B00] shadow-2xs dark:bg-[#FF7B00]/15 dark:text-[#FF9526]">
            <Icon name={icon} size={16} />
          </span>
        ) : null}
        <h2 className="font-ui truncate text-[15px] font-extrabold tracking-tight text-[#0A2540] dark:text-[#FFFDFA]">
          {children}
        </h2>
        {hint ? (
          <span className="truncate rounded-full bg-[#F6F3ED] px-2 py-0.5 font-ui text-[11px] font-bold text-muted dark:bg-white/10">
            {hint}
          </span>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  title,
  description,
  icon,
  action,
  footer,
  children,
  className = '',
  bodyClassName = '',
  variant = 'default',
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  variant?: 'default' | 'secondary' | 'tertiary';
}) {
  return (
    <Card variant={variant} className={`admin-panel-card gap-3 p-0 ${className}`}>
      {title ? (
        <Card.Header className="admin-panel-header flex-row items-center justify-between gap-3 px-5 py-3.5">
          <div className="min-w-0">
            <SectionTitle icon={icon}>{title}</SectionTitle>
            {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-1.5">{action}</div> : null}
        </Card.Header>
      ) : null}
      <Card.Content className={`px-5 py-4 ${bodyClassName}`}>{children}</Card.Content>
      {footer ? (
        <Card.Footer className="border-t border-separator bg-[#FAF6EE]/60 px-5 py-3 dark:bg-white/5">{footer}</Card.Footer>
      ) : null}
    </Card>
  );
}

/* ================================================================== stats == */

const TONE_RING: Record<Tone, string> = {
  accent:
    'border border-[#FF7B00]/25 bg-gradient-to-br from-[#FF7B00] to-[#FF9526] text-white shadow-sm shadow-[#FF7B00]/25',
  success:
    'border border-[#0D7C79]/25 bg-gradient-to-br from-[#0D7C79] to-[#119995] text-white shadow-sm shadow-[#0D7C79]/25',
  warning:
    'border border-amber-500/25 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/25',
  danger:
    'border border-rose-500/25 bg-gradient-to-br from-rose-600 to-red-500 text-white shadow-sm shadow-rose-500/25',
  default:
    'border border-[#0A2540]/15 bg-[#0A2540] text-white shadow-sm shadow-[#0A2540]/20 dark:bg-white/15',
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'accent',
  delta,
  loading = false,
  onPress,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconName;
  tone?: Tone;
  delta?: number | null;
  loading?: boolean;
  onPress?: () => void;
}) {
  const trend = typeof delta === 'number' && Number.isFinite(delta) ? delta : null;
  return (
    <Card
      variant="default"
      className={`admin-stat-card group relative gap-2.5 p-4 pt-5 ${onPress ? 'cursor-pointer' : ''}`}
      onClick={onPress}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-ui text-[11px] font-extrabold tracking-[0.12em] text-[#A94700] uppercase dark:text-[#FF9526]">
          {label}
        </p>
        {icon ? (
          <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${TONE_RING[tone]}`}>
            <Icon name={icon} size={17} />
          </span>
        ) : null}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-32 rounded-lg" />
      ) : (
        <p className="font-ui text-[28px] leading-none font-extrabold tracking-tight text-[#0A2540] tabular-nums dark:text-[#FFFDFA]">
          {value}
        </p>
      )}
      <div className="flex items-center gap-2 text-xs text-muted">
        {trend !== null ? (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-ui text-[11px] font-extrabold ${
              trend >= 0 ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger'
            }`}
          >
            <Icon name={trend >= 0 ? 'trending-up' : 'trending-down'} size={12} />
            {`${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`}
          </span>
        ) : null}
        {hint ? (
          <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-[#F6F3ED] px-2.5 py-0.5 font-ui text-[11px] font-semibold text-[#5E6358] dark:bg-white/8 dark:text-slate-300">
            <span className="size-1.5 shrink-0 rounded-full bg-[#FF7B00]" />
            <span className="truncate">{hint}</span>
          </span>
        ) : null}
      </div>
    </Card>
  );
}

export function StatGrid({ children, columns = 4 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  const map = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 xl:grid-cols-3',
    4: 'sm:grid-cols-2 xl:grid-cols-4',
  } as const;
  return <div className={`grid grid-cols-1 gap-3.5 ${map[columns]}`}>{children}</div>;
}

export function MetricBar({
  value,
  max,
  tone = 'accent',
  className = '',
}: {
  value: number;
  max: number;
  tone?: Tone;
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color =
    tone === 'accent' ? 'accent' : tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'default';
  return (
    <ProgressBar aria-label="progress" value={percent} color={color} size="sm" className={className}>
      <ProgressBar.Output />
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

/* ================================================================== chips == */

const CHIP_COLOR: Record<Tone, 'default' | 'accent' | 'success' | 'warning' | 'danger'> = {
  default: 'default',
  accent: 'accent',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

export function StatusChip({
  status,
  label,
  tone,
  size = 'sm',
  variant = 'soft',
}: {
  status?: string | null;
  label?: string;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'soft' | 'tertiary';
}) {
  const raw = status ?? label ?? '—';
  const resolved = tone ?? statusTone(raw);
  return (
    <Chip color={CHIP_COLOR[resolved]} variant={variant} size={size} className="whitespace-nowrap">
      <Chip.Label>{label ?? (labelize(raw) || '—')}</Chip.Label>
    </Chip>
  );
}

export function TagPill({ children, icon }: { children: ReactNode; icon?: IconName }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-default/40 px-2 py-0.5 text-[11px] font-medium text-muted">
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

export function Money({
  minor,
  currency,
  className = '',
  compact = false,
  withSign = false,
}: {
  minor: unknown;
  currency: string;
  className?: string;
  compact?: boolean;
  withSign?: boolean;
}) {
  const text = formatMoney(minor, currency, { compact });
  const negative = text.startsWith('-');
  return (
    <span
      className={`tabular-nums ${withSign && negative ? 'text-danger' : ''} ${className}`}
      title={formatMoney(minor, currency)}
    >
      {text}
    </span>
  );
}

export function UserCell({
  name,
  secondary,
  avatarUrl,
  size = 'md',
}: {
  name: string;
  secondary?: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar size={size === 'sm' ? 'sm' : 'md'} variant="soft" color="accent">
        {avatarUrl ? <Avatar.Image src={avatarUrl} alt="" /> : null}
        <Avatar.Fallback>{initials(name)}</Avatar.Fallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        {secondary ? <p className="truncate text-xs text-muted">{secondary}</p> : null}
      </div>
    </div>
  );
}

/* ================================================================= tables == */

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'start' | 'center' | 'end';
  width?: number;
  hideBelow?: 'md' | 'lg' | 'xl';
  isRowHeader?: boolean;
}

export function DataTable<T extends { id?: string }>({
  label,
  columns,
  rows,
  loading = false,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  onRowPress,
  footer,
  dense = false,
}: {
  label: string;
  columns: Array<Column<T>>;
  rows: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  onRowPress?: (row: T) => void;
  selectedKey?: string | null;
  footer?: ReactNode;
  dense?: boolean;
}) {
  if (loading) return <TableSkeleton columns={columns.length} rows={6} />;

  if (rows.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }

  return (
    <Table aria-label={label} className="admin-table-wrap w-full">
      <Table.ScrollContainer className="admin-scroll overflow-x-auto">
        <Table.Content aria-label={label} className="w-full min-w-[720px]" selectionMode="none">
          <Table.Header>
            {columns.map((column, index) => (
              <Table.Column
                key={column.key}
                id={column.key}
                isRowHeader={column.isRowHeader ?? index === 0}
                width={column.width}
                className={`${column.align === 'end' ? 'text-end' : column.align === 'center' ? 'text-center' : ''} ${
                  dense ? 'py-2.5' : 'py-3'
                }`}
              >
                {column.header}
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body
            renderEmptyState={() => <p className="px-4 py-8 text-center text-sm text-muted">{emptyTitle}</p>}
          >
            {rows.map((row, rowIndex) => (
              <Table.Row
                key={row.id ?? rowIndex}
                id={row.id ?? String(rowIndex)}
                className={onRowPress ? 'cursor-pointer transition-colors' : 'transition-colors'}
                onAction={onRowPress ? () => onRowPress(row) : undefined}
              >
                {columns.map((column) => (
                  <Table.Cell
                    key={column.key}
                    className={`${column.align === 'end' ? 'text-end' : column.align === 'center' ? 'text-center' : ''} ${
                      dense ? 'py-2.5' : 'py-3'
                    }`}
                  >
                    {column.render(row)}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
      {footer ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-separator bg-[#FAF6EE]/80 px-5 py-3 dark:bg-white/5">
          {footer}
        </div>
      ) : null}
    </Table>
  );
}

export function TableSkeleton({ columns, rows = 6 }: { columns: number; rows?: number }) {
  return (
    <div className="space-y-2 rounded-2xl border border-separator p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className="h-4 flex-1 rounded-md"
              style={{ maxWidth: columnIndex === 0 ? '28%' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TableFooter({
  summary,
  onNext,
  onPrevious,
  hasMore,
  atStart,
  page,
  pending,
}: {
  summary?: ReactNode;
  onNext?: () => void;
  onPrevious?: () => void;
  hasMore?: boolean;
  atStart?: boolean;
  page?: number;
  pending?: boolean;
}) {
  return (
    <>
      <p className="text-xs text-muted">
        {summary}
        {pending ? <Spinner size="sm" className="ml-2 align-middle" /> : null}
      </p>
      {onNext || onPrevious ? (
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-xs text-muted">Page {page ?? 1}</span>
          <Button size="sm" variant="tertiary" isDisabled={atStart} onPress={onPrevious}>
            <Icon name="chevron-left" size={15} />
            Previous
          </Button>
          <Button size="sm" variant="tertiary" isDisabled={!hasMore} onPress={onNext}>
            Next
            <Icon name="chevron-right" size={15} />
          </Button>
        </div>
      ) : null}
    </>
  );
}

/* ================================================================== empty == */

export function EmptyState({
  title,
  description,
  action,
  icon = 'inbox',
  compact = false,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: IconName;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#0A2540]/15 bg-[#FAF6EE]/70 text-center dark:border-white/15 dark:bg-white/5 ${
        compact ? 'gap-2.5 px-4 py-8' : 'gap-3.5 px-6 py-14'
      }`}
    >
      <span className="grid size-12 place-items-center rounded-2xl border border-[#FF7B00]/22 bg-[#FFF2E5] text-[#FF7B00] shadow-xs dark:bg-[#FF7B00]/15 dark:text-[#FF9526]">
        <Icon name={icon} size={20} />
      </span>
      <div>
        <p className="font-ui text-sm font-extrabold text-[#0A2540] dark:text-[#FFFDFA]">{title}</p>
        {description ? <p className="mt-1 max-w-md text-xs text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function InlineEmpty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

export function ErrorPanel({
  message,
  onRetry,
  details,
}: {
  message: string;
  onRetry?: () => void;
  details?: string;
}) {
  return (
    <Surface variant="secondary" className="flex items-start gap-3 rounded-2xl border border-danger/30 p-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-danger/12 text-danger">
        <Icon name="alert" size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{message}</p>
        {details ? <p className="mt-0.5 font-mono text-xs text-muted">{details}</p> : null}
      </div>
      {onRetry ? (
        <Button size="sm" variant="tertiary" onPress={onRetry}>
          <Icon name="refresh" size={14} />
          Retry
        </Button>
      ) : null}
    </Surface>
  );
}

/* ================================================================== forms == */

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  description,
  isRequired,
  isDisabled,
  autoFocus,
  inputMode,
  errorMessage,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  description?: ReactNode;
  isRequired?: boolean;
  isDisabled?: boolean;
  autoFocus?: boolean;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel' | 'search' | 'url';
  errorMessage?: ReactNode;
}) {
  const fieldLabel = useFilterFieldLabel();
  // Filter controls can hide their caption; the surrounding FilterField still names them.
  const accessibleLabel = label || fieldLabel || placeholder || 'Text input';
  return (
    <TextField
      className="w-full"
      fullWidth
      value={value}
      onChange={onChange}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={Boolean(errorMessage)}
      aria-label={accessibleLabel}
    >
      {label ? <Label>{label}</Label> : null}
      <Input
        type={type}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={inputMode}
        autoComplete="off"
        spellCheck={false}
      />
      {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      {errorMessage ? <p className="mt-1 text-xs text-danger">{errorMessage}</p> : null}
    </TextField>
  );
}

export function TextAreaInput({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  description,
  isRequired,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  description?: ReactNode;
  isRequired?: boolean;
}) {
  return (
    <TextField className="w-full" fullWidth value={value} onChange={onChange} isRequired={isRequired}>
      <Label>{label}</Label>
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
        className="focus:border-focus w-full resize-y rounded-xl border border-field-border bg-field px-3 py-2 text-sm text-field-foreground outline-none placeholder:text-field-placeholder"
      />
      {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
    </TextField>
  );
}

export function StringListInput({
  label,
  value,
  onChange,
  placeholder = 'One item per line',
  description,
  rows = 4,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  description?: ReactNode;
  rows?: number;
}) {
  return (
    <TextAreaInput
      label={label}
      value={value.join('\n')}
      onChange={(next) =>
        onChange(
          next
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
        )
      }
      placeholder={placeholder}
      rows={rows}
      description={description}
    />
  );
}

export function SelectInput<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  isDisabled,
  description,
}: {
  label?: string;
  value: T | null;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  placeholder?: string;
  isDisabled?: boolean;
  description?: ReactNode;
}) {
  const fieldLabel = useFilterFieldLabel();
  return (
    <div className="w-full">
      {label ? <Label className="mb-1 block">{label}</Label> : null}
      <Select
        fullWidth
        className="w-full"
        placeholder={placeholder}
        isDisabled={isDisabled}
        selectedKey={value ?? null}
        // Unlabelled filter selects still need an accessible name.
        aria-label={label ?? fieldLabel ?? placeholder}
        onSelectionChange={(key) => {
          if (key !== null) onChange(String(key) as T);
        }}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {options.map((option) => (
              <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                {option.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
    </div>
  );
}

export function ToggleInput({
  label,
  value,
  onChange,
  description,
  isDisabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: ReactNode;
  isDisabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface-secondary/60 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      <Switch isSelected={value} onChange={onChange} isDisabled={isDisabled} aria-label={label}>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch>
    </div>
  );
}

export function CheckInput({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: ReactNode;
}) {
  return (
    <Checkbox isSelected={value} onChange={onChange} className="items-start">
      <Checkbox.Control>
        <Checkbox.Indicator />
      </Checkbox.Control>
      <Checkbox.Content>
        <Label className="text-sm">{label}</Label>
        {description ? <p className="text-xs text-muted">{description}</p> : null}
      </Checkbox.Content>
    </Checkbox>
  );
}

export function FieldGrid({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 | 3 }) {
  const map = { 1: 'grid-cols-1', 2: 'grid-cols-1 md:grid-cols-2', 3: 'grid-cols-1 md:grid-cols-3' } as const;
  return <div className={`grid gap-3 ${map[columns]}`}>{children}</div>;
}

/* ================================================================ overlays == */

export function FormDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  submitLabel = 'Save',
  onSubmit,
  children,
  size = 'lg',
  destructive = false,
  disabled = false,
}: {
  trigger?: ReactNode;
  /** Controlled mode — pass both `open` and `onOpenChange` to drive the dialog yourself. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  submitLabel?: string;
  onSubmit: () => Promise<void> | void;
  children: ReactNode | ((close: () => void) => ReactNode);
  size?: 'sm' | 'md' | 'lg' | 'cover';
  destructive?: boolean;
  disabled?: boolean;
}) {
  const state = useOverlayState({ isOpen: open, onOpenChange });
  const [busy, setBusy] = useState(false);
  const close = state.close;

  async function submit() {
    setBusy(true);
    try {
      await onSubmit();
      close();
      setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  return (
    <>
      {trigger ? <div onClick={state.open}>{trigger}</div> : null}
      <Modal isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Backdrop>
          <Modal.Container size={size}>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{title}</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body className="admin-scroll max-h-[70vh] overflow-y-auto">
                {description ? <p className="mb-3 text-sm text-muted">{description}</p> : null}
                {typeof children === 'function' ? children(close) : children}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={close} isDisabled={busy}>
                  Cancel
                </Button>
                <Button
                  variant={destructive ? 'danger' : 'primary'}
                  onPress={submit}
                  isPending={busy}
                  isDisabled={disabled || busy}
                >
                  {submitLabel}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  reason = true,
  reasonLabel = 'Reason (recorded in the audit log)',
  destructive = true,
  onConfirm,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  reason?: boolean;
  reasonLabel?: string;
  destructive?: boolean;
  onConfirm: (reason: string) => Promise<void> | void;
  children?: ReactNode;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = !reason || text.trim().length >= 10;

  return (
    <FormDialog
      trigger={trigger}
      title={title}
      description={description}
      submitLabel={confirmLabel}
      destructive={destructive}
      disabled={!ready}
      onSubmit={async () => {
        setBusy(true);
        try {
          await onConfirm(text.trim());
        } finally {
          setBusy(false);
        }
      }}
      size="md"
    >
      {children}
      {reason ? (
        <TextAreaInput
          label={reasonLabel}
          value={text}
          onChange={setText}
          rows={3}
          placeholder="At least 10 characters."
          isRequired
        />
      ) : null}
      {!ready && reason ? <p className="mt-1 text-xs text-muted">Add at least 10 characters to continue.</p> : null}
      {busy ? null : null}
    </FormDialog>
  );
}

export interface DrawerField {
  label: string;
  value: ReactNode;
  full?: boolean;
}

export function DetailDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  chip,
  fields,
  sections,
  footer,
  children,
  placement = 'right',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  chip?: ReactNode;
  fields?: DrawerField[];
  sections?: Array<{ title: string; content: ReactNode }>;
  footer?: ReactNode;
  children?: ReactNode;
  placement?: 'right' | 'left' | 'bottom' | 'top';
}) {
  const state = useOverlayState({ isOpen: open, onOpenChange });
  return (
    <Drawer isOpen={state.isOpen} onOpenChange={state.setOpen}>
      <Drawer.Backdrop>
        <Drawer.Content placement={placement}>
          <Drawer.Dialog className="admin-scroll w-full max-w-2xl overflow-y-auto">
            <Drawer.Header className="border-b border-separator">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Drawer.Heading className="truncate">{title}</Drawer.Heading>
                  {chip}
                </div>
                {subtitle ? <div className="text-xs text-muted">{subtitle}</div> : null}
              </div>
              <Drawer.CloseTrigger />
            </Drawer.Header>
            <Drawer.Body className="space-y-5 py-4">
              {children}
              {fields?.length ? (
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  {fields.map((field) => (
                    <div key={field.label} className={field.full ? 'sm:col-span-2' : ''}>
                      <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">{field.label}</dt>
                      <dd className="mt-0.5 text-sm break-words text-foreground">{field.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {sections?.map((section) => (
                <div key={section.title}>
                  <Separator className="mb-3" />
                  <p className="font-ui mb-2 text-[13px] font-semibold text-foreground">{section.title}</p>
                  {section.content}
                </div>
              ))}
            </Drawer.Body>
            {footer ? (
              <Drawer.Footer className="flex-wrap gap-2 border-t border-separator">{footer}</Drawer.Footer>
            ) : null}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

export function JsonBlock({ value, title = 'Raw payload' }: { value: unknown; title?: string }) {
  return (
    <details className="rounded-xl border border-separator bg-surface-secondary/60">
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted">{title}</summary>
      <pre className="admin-scroll max-h-72 overflow-auto px-3 pb-3 font-mono text-[11px] leading-relaxed text-muted">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      isIconOnly
      aria-label={label}
      onPress={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast.success('Copied to clipboard', { description: value.slice(0, 80) });
        } catch {
          toast.danger('Copy failed', { description: 'Select the text manually.' });
        }
      }}
    >
      <Icon name="copy" size={14} />
    </Button>
  );
}

export function RowActions({
  items,
}: {
  items: Array<{ id: string; label: string; icon?: IconName; onAction: () => void; danger?: boolean }>;
}) {
  if (items.length === 0) return null;
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Button size="sm" variant="ghost" isIconOnly aria-label="Row actions">
          <Icon name="more" size={16} />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu>
          {items.map((item) => (
            <Dropdown.Item
              key={item.id}
              id={item.id}
              textValue={item.label}
              className={item.danger ? 'text-danger' : ''}
              onAction={item.onAction}
            >
              {item.icon ? <Icon name={item.icon} size={15} /> : null}
              {item.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export function InfoTip({ children, content }: { children: ReactNode; content: ReactNode }) {
  return (
    <Tooltip>
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
      <Tooltip.Content>{content}</Tooltip.Content>
    </Tooltip>
  );
}

/* ============================================================== filter bar == */

export interface FilterState {
  values: Record<string, string>;
  set: (key: string, value: string) => void;
  reset: () => void;
  clear: (key: string) => void;
}

const FilterContext = createContext<FilterState | null>(null);

/**
 * Carries the `FilterField` caption down to the control inside it so filter
 * selects and search boxes keep an accessible name without a visible label.
 */
const FilterFieldLabelContext = createContext<string | undefined>(undefined);

function useFilterFieldLabel(): string | undefined {
  return useContext(FilterFieldLabelContext);
}

export function useFilters(initial: Record<string, string> = {}): FilterState {
  const [values, setValues] = useState<Record<string, string>>(initial);
  return useMemo<FilterState>(
    () => ({
      values,
      set: (key, value) => setValues((current) => ({ ...current, [key]: value })),
      clear: (key) => setValues((current) => ({ ...current, [key]: '' })),
      reset: () => setValues(initial),
    }),
    [initial, values],
  );
}

export function FilterBar({
  children,
  leading,
  trailing,
}: {
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="admin-filter-card flex flex-wrap items-end gap-2.5">
      {leading}
      <div className="flex flex-1 flex-wrap items-end gap-2.5">{children}</div>
      {trailing ? <div className="flex items-center gap-1.5">{trailing}</div> : null}
    </div>
  );
}

export function FilterField({
  label,
  children,
  className = '',
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-[150px] flex-1 ${className}`}>
      {label ? (
        <p className="font-ui mb-1 text-[10px] font-extrabold tracking-[0.12em] text-[#A94700] uppercase dark:text-[#FF9526]">
          {label}
        </p>
      ) : null}
      <FilterFieldLabelContext.Provider value={label}>{children}</FilterFieldLabelContext.Provider>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  isDisabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isDisabled?: boolean;
}) {
  const fieldLabel = useFilterFieldLabel();
  return (
    <TextField
      className="w-full"
      fullWidth
      value={value}
      onChange={onChange}
      isDisabled={isDisabled}
      // The filter bar hides visible labels: the field caption or placeholder is the accessible name.
      aria-label={fieldLabel ?? placeholder}
    >
      <Input type="search" placeholder={placeholder} autoComplete="off" aria-label={fieldLabel ?? placeholder} />
    </TextField>
  );
}

/* =============================================================== utilities == */

export function RefreshButton({ onPress, pending }: { onPress: () => void; pending?: boolean }) {
  return (
    <Button variant="tertiary" size="sm" onPress={onPress} isPending={pending}>
      <Icon name="refresh" size={15} />
      Refresh
    </Button>
  );
}

export function definitionList(fields: Array<{ label: string; value: ReactNode }>, columns = 2) {
  return (
    <dl className={`grid grid-cols-1 gap-x-6 gap-y-3 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
      {fields.map((field) => (
        <div key={field.label}>
          <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">{field.label}</dt>
          <dd className="mt-0.5 text-sm break-words text-foreground">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Simple tab bar for in-page sections, driven by local state. */
export function TabStrip<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
}) {
  return (
    <div className="admin-scroll flex gap-1.5 overflow-x-auto rounded-2xl border border-[#0A2540]/10 bg-[#FFFDFA] p-1.5 shadow-2xs dark:border-white/10 dark:bg-[#0D1D30]">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`font-ui shrink-0 rounded-xl px-3.5 py-2 text-[13px] font-bold transition-all ${
              isActive
                ? 'bg-[#0A2540] text-white shadow-sm dark:bg-[#FF7B00]'
                : 'text-muted hover:bg-[#FFF2E5] hover:text-[#0A2540] dark:hover:bg-white/10 dark:hover:text-white'
            }`}
          >
            {option.label}
            {typeof option.count === 'number' ? (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
                  isActive
                    ? 'bg-[#FF7B00] text-white dark:bg-[#0A2540]'
                    : 'bg-[#F6F3ED] text-[#5E6358] dark:bg-white/10 dark:text-slate-300'
                }`}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TypedHeading({ children, type = 'h3' }: { children: ReactNode; type?: 'h1' | 'h2' | 'h3' | 'h4' }) {
  return (
    <Typography type={type} weight="semibold">
      {children}
    </Typography>
  );
}
