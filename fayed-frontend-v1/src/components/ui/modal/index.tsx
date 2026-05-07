"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info, X } from "lucide-react";
import Button from "@/components/ui/button/Button";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl";
type DrawerSide = "bottom" | "left" | "right";
type NoticeTone = "neutral" | "primary" | "warning";

type ModalContextValue = {
  titleId: string;
  descriptionId: string;
  onClose: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("Modal subcomponents must be used inside Modal.");
  }
  return context;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  isFullscreen?: boolean;
  size?: ModalSize;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  ariaLabel?: string;
  backdropClassName?: string;
}

interface ModalSectionProps {
  children?: React.ReactNode;
  className?: string;
}

interface ModalHeaderProps extends ModalSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
}

interface FormModalProps extends Omit<ModalProps, "children" | "className"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  submitDisabled?: boolean;
  submitLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  stickyFooter?: boolean;
  destructive?: boolean;
  footer?: React.ReactNode;
}

interface ConfirmModalProps extends Omit<ModalProps, "children" | "className"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  confirmLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
  confirmVariant?: "primary" | "outline" | "danger";
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

interface NoticeDialogProps extends Omit<ModalProps, "children" | "className"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  tone?: NoticeTone;
  acknowledgeLabel?: React.ReactNode;
  onAcknowledge?: () => void;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

interface DrawerProps extends Omit<ModalProps, "children" | "className" | "size" | "isFullscreen"> {
  side?: DrawerSide;
  children: React.ReactNode;
  className?: string;
  showHandle?: boolean;
  inset?: boolean;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
  );
}

function useOverlayLifecycle({
  isOpen,
  closeOnEscape,
  onClose,
  initialFocusRef,
  containerRef,
}: {
  isOpen: boolean;
  closeOnEscape: boolean;
  onClose: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const mounted = typeof window !== "undefined";

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeOnEscape, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    // Lock both documentElement and body to prevent background scrolling across browsers.
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const panel = containerRef.current;
    const focusTarget = initialFocusRef?.current;
    const focusables = panel ? getFocusableElements(panel) : [];
    const firstFocusable = focusTarget ?? focusables[0] ?? panel;
    firstFocusable?.focus();

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !panel) return;

      const items = getFocusableElements(panel);
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleTab);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.removeEventListener("keydown", handleTab);
      previousActiveElementRef.current?.focus?.();
    };
  }, [containerRef, initialFocusRef, isOpen]);

  return mounted;
}

function OverlayBackdrop({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full bg-[rgba(25,52,57,0.18)] backdrop-blur-[10px] ${className ?? ""}`}
      // Click handling is done on the overlay wrapper so the backdrop can't be "covered" by layout containers.
      onClick={onClick}
      onPointerDown={onClick}
    />
  );
}

function OverlayCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border-light bg-white text-text-muted shadow-[0_8px_18px_-12px_rgba(25,52,57,0.18)] transition hover:border-border-strong hover:bg-surface-secondary hover:text-text-primary dark:bg-surface-tertiary dark:shadow-[0_8px_18px_-12px_rgba(0,0,0,0.38)] sm:end-5 sm:top-5"
    >
      <X className="h-5 w-5" />
    </button>
  );
}

function panelShellClassName(extra?: string) {
  return `relative overflow-hidden rounded-[32px] border border-border-light bg-white shadow-[0_30px_84px_-36px_rgba(25,52,57,0.26)] dark:bg-surface-secondary dark:shadow-[0_30px_84px_-36px_rgba(0,0,0,0.5)] ${extra ?? ""}`;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  isFullscreen = false,
  size = "lg",
  closeOnEscape = true,
  closeOnOutsideClick = true,
  initialFocusRef,
  ariaLabel,
  backdropClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useOverlayLifecycle({
    isOpen,
    closeOnEscape,
    onClose,
    initialFocusRef,
    containerRef: panelRef,
  });
  const titleId = useId();
  const descriptionId = useId();

  const contextValue = useMemo(
    () => ({ titleId, descriptionId, onClose }),
    [descriptionId, onClose, titleId],
  );

  if (!mounted || !isOpen) return null;

  const contentClasses = isFullscreen
    ? "h-full w-full"
    : `${panelShellClassName()} w-full ${SIZE_CLASSES[size]} max-h-[calc(100vh-2rem)]`;

  return createPortal(
    <div className="fixed inset-0 z-[99999]">
      {!isFullscreen ? (
        <OverlayBackdrop
          onClick={closeOnOutsideClick ? onClose : undefined}
          className={backdropClassName}
        />
      ) : null}

      <div
        className="relative flex min-h-full items-center justify-center overflow-y-auto p-4 sm:p-6"
        onClick={closeOnOutsideClick ? onClose : undefined}
        onPointerDown={closeOnOutsideClick ? onClose : undefined}
      >
        <ModalContext.Provider value={contextValue}>
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            aria-label={ariaLabel}
            tabIndex={-1}
            className={`${contentClasses} ${className ?? ""}`}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {showCloseButton && <OverlayCloseButton onClose={onClose} />}
            {children}
          </div>
        </ModalContext.Provider>
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({
  title,
  description,
  eyebrow,
  children,
  className,
}: ModalHeaderProps) {
  const { titleId, descriptionId } = useModalContext();

  return (
    <div className={`border-b border-border-light/80 bg-white px-6 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7 ${className ?? ""}`}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      ) : null}
      {title ? (
        <h2 id={titleId} className="mt-2 text-xl font-semibold text-text-primary dark:text-white/95">
          {title}
        </h2>
      ) : null}
      {description ? (
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-text-secondary">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export function ModalBody({ children, className }: ModalSectionProps) {
  return (
    <div className={`overflow-y-auto px-6 py-5 sm:px-7 sm:py-6 ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function ModalFooter({ children, className }: ModalSectionProps) {
  return (
    <div className={`border-t border-border-light/80 bg-surface-secondary/40 px-6 py-4 dark:bg-surface-secondary/85 sm:px-7 ${className ?? ""}`}>
      <div className="flex flex-wrap justify-end gap-2">{children}</div>
    </div>
  );
}

export function FormModal({
  title,
  description,
  eyebrow,
  children,
  loading = false,
  submitDisabled = false,
  submitLabel,
  cancelLabel,
  onSubmit,
  onCancel,
  stickyFooter = true,
  destructive = false,
  footer,
  ...modalProps
}: FormModalProps) {
  return (
    <Modal {...modalProps}>
      <div className="flex max-h-[calc(100vh-2rem)] flex-col">
        <ModalHeader title={title} description={description} eyebrow={eyebrow} />
        <ModalBody>{children}</ModalBody>
        {footer ? (
          <ModalFooter className={stickyFooter ? "sticky bottom-0" : ""}>{footer}</ModalFooter>
        ) : submitLabel || cancelLabel ? (
          <ModalFooter className={stickyFooter ? "sticky bottom-0" : ""}>
            <Button variant="outline" onClick={onCancel ?? modalProps.onClose} disabled={loading}>
              {cancelLabel ?? "Cancel"}
            </Button>
            {submitLabel ? (
            <Button
              variant={destructive ? "danger" : "primary"}
              onClick={onSubmit}
              disabled={loading || submitDisabled}
            >
              {submitLabel}
            </Button>
            ) : null}
          </ModalFooter>
        ) : null}
      </div>
    </Modal>
  );
}

export function ConfirmModal({
  title,
  description,
  eyebrow,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
  confirmVariant = "primary",
  footer,
  children,
  size = "md",
  ...modalProps
}: ConfirmModalProps) {
  return (
    <Modal {...modalProps} size={size}>
      <div className="flex max-h-[calc(100vh-2rem)] flex-col">
        <ModalHeader title={title} description={description} eyebrow={eyebrow} />
        {children ? <ModalBody>{children}</ModalBody> : null}
        {footer ? (
          <ModalFooter className="sticky bottom-0">{footer}</ModalFooter>
        ) : (
          <ModalFooter className="sticky bottom-0">
            <Button variant="outline" onClick={onCancel ?? modalProps.onClose} disabled={loading}>
              {cancelLabel ?? "Cancel"}
            </Button>
            <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
              {confirmLabel}
            </Button>
          </ModalFooter>
        )}
      </div>
    </Modal>
  );
}

export function DestructiveConfirmModal(props: Omit<ConfirmModalProps, "confirmVariant">) {
  return <ConfirmModal {...props} confirmVariant="danger" />;
}

export function NoticeDialog({
  title,
  description,
  eyebrow,
  tone = "neutral",
  acknowledgeLabel,
  onAcknowledge,
  footer,
  children,
  size = "md",
  ...modalProps
}: NoticeDialogProps) {
  const toneClass =
    tone === "primary"
      ? "border-primary/15 bg-primary-light text-text-brand shadow-[0_14px_28px_-24px_rgba(68,161,148,0.28)] dark:border-primary/20 dark:bg-primary/10 dark:text-primary-light"
      : tone === "warning"
        ? "border-warning-200 bg-warning-50 text-warning-800 shadow-[0_14px_28px_-24px_rgba(245,158,11,0.24)] dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300"
        : "border-border-light bg-surface-secondary text-text-secondary shadow-[0_14px_28px_-24px_rgba(25,52,57,0.12)] dark:bg-surface-tertiary";

  const Icon = tone === "warning" ? AlertTriangle : Info;

  return (
    <Modal {...modalProps} size={size}>
      <div className="flex max-h-[calc(100vh-2rem)] flex-col">
        <ModalHeader title={title} description={description} eyebrow={eyebrow} />
        <ModalBody>
          <div className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm ${toneClass}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </ModalBody>
        {footer ? (
          <ModalFooter className="sticky bottom-0">{footer}</ModalFooter>
        ) : acknowledgeLabel ? (
          <ModalFooter className="sticky bottom-0">
            <Button onClick={onAcknowledge ?? modalProps.onClose}>{acknowledgeLabel}</Button>
          </ModalFooter>
        ) : null}
      </div>
    </Modal>
  );
}

export function Drawer({
  isOpen,
  onClose,
  children,
  className,
  side = "right",
  showCloseButton = true,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  initialFocusRef,
  ariaLabel,
  showHandle = true,
  inset = true,
  backdropClassName,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useOverlayLifecycle({
    isOpen,
    closeOnEscape,
    onClose,
    initialFocusRef,
    containerRef: panelRef,
  });
  const titleId = useId();
  const descriptionId = useId();

  const contextValue = useMemo(
    () => ({ titleId, descriptionId, onClose }),
    [descriptionId, onClose, titleId],
  );

  if (!mounted || !isOpen) return null;

  const layoutClass = (() => {
    if (side === "bottom") return inset ? "items-end justify-center p-0 sm:p-4" : "items-end justify-center p-0";
    if (side === "left") return inset ? "items-stretch justify-start p-0 sm:p-4" : "items-stretch justify-start p-0";
    return inset ? "items-stretch justify-end p-0 sm:p-4" : "items-stretch justify-end p-0";
  })();

  const panelClass = (() => {
    if (side === "bottom") {
      return `${panelShellClassName(
        inset
          ? "max-h-[88vh] w-full rounded-b-none sm:max-w-2xl sm:rounded-[32px]"
          : "max-h-[88vh] w-full rounded-b-none",
      )} ${className ?? ""}`;
    }

    // Side drawers: edge-to-edge on mobile app surfaces when inset=false.
    if (!inset) {
      return `relative h-[100dvh] w-full max-w-xl overflow-hidden rounded-none bg-white shadow-2xl dark:bg-surface-secondary ${className ?? ""}`;
    }

    return `${panelShellClassName("h-full w-full max-w-xl rounded-none sm:h-[calc(100vh-2rem)] sm:rounded-[32px]")} ${className ?? ""}`;
  })();

  return createPortal(
    <div className="fixed inset-0 z-[99999]">
      <OverlayBackdrop
        onClick={closeOnOutsideClick ? onClose : undefined}
        className={backdropClassName}
      />
      <div
        className={`relative flex min-h-full ${layoutClass}`}
        onClick={closeOnOutsideClick ? onClose : undefined}
        onPointerDown={closeOnOutsideClick ? onClose : undefined}
      >
        <ModalContext.Provider value={contextValue}>
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            aria-label={ariaLabel}
            tabIndex={-1}
            className={panelClass}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {showCloseButton ? <OverlayCloseButton onClose={onClose} /> : null}
            {showHandle && side === "bottom" ? (
              <div className="flex justify-center px-6 pt-3 sm:hidden">
                <span className="h-1.5 w-14 rounded-full bg-border-strong/50" />
              </div>
            ) : null}
            <div className="flex h-full max-h-[inherit] flex-col">{children}</div>
          </div>
        </ModalContext.Provider>
      </div>
    </div>,
    document.body,
  );
}
