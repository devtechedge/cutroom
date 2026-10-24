import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Click-outside backdrop shared by dialogs. Keyboard users close with Escape. */
export function Backdrop({ onClose, children, className }: { onClose: () => void; children: ReactNode; className?: string }): ReactNode {
  return (
    <div className={className ?? "dialog-backdrop"} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </div>
  );
}

export function Dialog({
  title,
  onClose,
  children,
  footer,
  wide,
  alert,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  alert?: boolean;
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<Element | null>(null);
  useEffect(() => {
    restoreTo.current = document.activeElement;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();
    return () => {
      if (restoreTo.current instanceof HTMLElement) restoreTo.current.focus();
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && ref.current) {
        const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return createPortal(
    <Backdrop onClose={onClose}>
      <div
        ref={ref}
        className={`dialog${wide ? " wide" : ""}`}
        role={alert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="dialog-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        <div className="dialog-body scroll-hover">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </Backdrop>,
    document.body,
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}): ReactNode {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      alert
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? "danger" : "primary"}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0 }}>{body}</p>
    </Dialog>
  );
}

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
}

export function Menu({
  items,
  onClose,
  align = "left",
  label,
  id,
}: {
  items: MenuItem[];
  onClose: (restoreFocus: boolean) => void;
  align?: "left" | "right";
  label?: string;
  id?: string;
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const first = ref.current?.querySelector<HTMLElement>('button[role="menuitem"]:not([disabled])');
    first?.focus();
    const onDown = (e: PointerEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (!ref.current) return;
      const nodes = [...ref.current.querySelectorAll<HTMLElement>('button[role="menuitem"]:not([disabled])')];
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose(true);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        onClose(true);
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) || nodes.length === 0) return;
      e.preventDefault();
      const current = nodes.indexOf(document.activeElement as HTMLElement);
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? nodes.length - 1
            : e.key === "ArrowDown"
              ? (current + 1) % nodes.length
              : (current - 1 + nodes.length) % nodes.length;
      nodes[next]?.focus();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);
  return (
    <div id={id} className="menu" ref={ref} role="menu" aria-label={label} style={align === "right" ? { right: 0 } : { left: 0 }}>
      {label && <div className="menu-label">{label}</div>}
      {items.map((item, i) => (
        <div key={i}>
          {item.separatorBefore && <div className="menu-sep" role="separator" />}
          <button
            type="button"
            role="menuitem"
            className={item.danger ? "danger" : undefined}
            disabled={item.disabled}
            onClick={() => {
              onClose(true);
              item.onSelect?.();
            }}
          >
            {item.icon}
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}

export function MenuButton({
  icon,
  label = "",
  ariaLabel,
  items,
  align,
}: {
  icon: ReactNode;
  label?: string;
  ariaLabel?: string;
  items: MenuItem[];
  align?: "left" | "right";
}): ReactNode {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const close = useCallback((restoreFocus: boolean): void => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        ref={triggerRef}
        type="button"
        className="icon-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel ?? label}
        data-pressed={open}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        {label ? <span className="hide-mobile">{label}</span> : null}
      </button>
      {open && <Menu id={menuId} items={items} onClose={close} align={align} />}
    </span>
  );
}

export function Toast({ message }: { message: string | null }): ReactNode {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}

/** Announces to screen readers without a visible toast. */
export function LiveStatus({ message }: { message: string }): ReactNode {
  const id = useId();
  return (
    <div id={id} role="status" aria-live="polite" className="visually-hidden">
      {message}
    </div>
  );
}
