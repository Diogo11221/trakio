import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useAdmin } from '../data/store';
import { Icon } from './Icon';
import s from './ui.module.css';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <header className={s.pageHeader}>
      <div>
        <h1 className={s.pageTitle}>{title}</h1>
        <p className={s.pageSubtitle}>{subtitle}</p>
      </div>
      {actions}
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`${s.card} ${className}`}>{children}</section>;
}

export type TabOption<T extends string> = { value: T; label: string; count?: number };

/** Filter tabs — dark when active (Por rever / Aprovados / …). */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className={s.tabs} role="tablist" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`${s.tab} ${active ? s.tabActive : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {option.count !== undefined ? <span className={s.tabCount}>{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export type Tone = 'success' | 'warning' | 'danger' | 'neutral';

export function StatusPill({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className={`${s.pill} ${s[tone]}`}>
      <span className={s.pillDot} />
      {label}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'dark' | 'outline' | 'dangerText';
  size?: 'md' | 'sm';
};

export function Button({ variant = 'dark', size = 'md', className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={`${s.button} ${s[variant]} ${size === 'sm' ? s.small : ''} ${className}`} {...rest} />;
}

export function SearchField({
  value,
  onChange,
  placeholder,
  width = 300,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  width?: number;
}) {
  return (
    <label className={s.search} style={{ width }}>
      <Icon name="search" size={15} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

type DialogProps = {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Asks for a short written reason before the confirm button unlocks. */
  reasonLabel?: string;
  reasonPlaceholder?: string;
  danger?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  children?: ReactNode;
};

/** Confirmation for anything that changes money, accounts or public content. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancelar',
  reasonLabel,
  reasonPlaceholder,
  danger = false,
  onConfirm,
  onClose,
  children,
}: DialogProps) {
  const [reason, setReason] = useState('');
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  if (!open) return null;
  const blocked = Boolean(reasonLabel) && reason.trim().length < 3;

  return createPortal(
    <div className={s.scrim} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={s.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className={s.dialogTitle}>
          {title}
        </h2>
        {body ? <div className={s.dialogBody}>{body}</div> : null}
        {children}
        {reasonLabel ? (
          <label className={s.field}>
            {reasonLabel}
            <textarea
              className={s.textarea}
              value={reason}
              placeholder={reasonPlaceholder}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
          </label>
        ) : null}
        <div className={s.dialogActions}>
          <Button variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant="dark"
            disabled={blocked}
            style={danger ? { background: 'var(--color-danger-text)' } : undefined}
            onClick={() => {
              onConfirm(reason.trim());
              setReason('');
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export type MenuItem = { label: string; onSelect: () => void; danger?: boolean };

/** "⋯" row menu; closes on outside click or Escape. */
export function RowMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={s.menuWrap} ref={ref}>
      <button
        type="button"
        className={s.menuButton}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Icon name="more" size={18} />
      </button>
      {open ? (
        <div className={s.menu} role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`${s.menuItem} ${item.danger ? s.menuDanger : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Short confirmation at the bottom of the screen after an action. */
export function Toast() {
  const { toast } = useAdmin();
  const [visible, setVisible] = useState<typeof toast>(null);

  useEffect(() => {
    if (!toast) return;
    setVisible(toast);
    const id = setTimeout(() => setVisible(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  if (!visible) return null;
  return createPortal(
    <div key={visible.id} className={s.toast} role="status">
      <span className={s.toastDot} />
      {visible.text}
    </div>,
    document.body,
  );
}

export const fieldStyles = { field: s.field, input: s.input, textarea: s.textarea };

/** Compact select (month picker) styled like the Figma field. */
export function Dropdown<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className={s.menuWrap} ref={ref}>
      <button type="button" className={s.dropdown} aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((v) => !v)}>
        {current?.label}
        <Icon name="chevronDown" size={12} className={open ? s.flip : ''} />
      </button>
      {open ? (
        <div className={s.menu} role="listbox">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`${s.menuItem} ${o.value === value ? s.menuSelected : ''}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
