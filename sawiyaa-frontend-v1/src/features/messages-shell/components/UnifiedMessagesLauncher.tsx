"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  ChevronDown,
  ChevronUp,
  LifeBuoy,
  MessageCircle,
  MessageSquare,
  PlayCircle,
  Sparkles,
  Stethoscope,
  Video,
  X,
} from "lucide-react";
import { useUnifiedMessagingShell } from "../hooks/use-unified-messaging-shell";
import {
  buildMessagesShellContinuityStorageKey,
  loadMessagesShellContinuitySnapshot,
  saveMessagesShellContinuitySnapshot,
} from "../lib/messages-shell-continuity";
import {
  listenOpenSessionChatInShell,
  listenOpenMessagesShell,
  listenToggleMessagesShell,
} from "../lib/messages-shell-events";
import type { ToggleMessagesShellEventPayload } from "../lib/messages-shell-events";
import type {
  UnifiedMessagingLane,
  UnifiedMessagingLaneItem,
  UnifiedMessagingRole,
  UnifiedSessionChatStatus,
} from "../types/messages-shell.types";
import { getMessagesPath } from "../utils/messages-routes";
import PractitionerLaneThread from "./PractitionerLaneThread";
import SessionLaneThread from "./SessionLaneThread";
import SupportLaneThread from "./SupportLaneThread";

type Props = {
  role: UnifiedMessagingRole;
  showFloatingTrigger?: boolean;
};
type SessionReadState = Record<
  string,
  { readAt: string; sessionStatus: UnifiedSessionChatStatus | null }
>;
function formatRelativeAt(value: string | null | undefined, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function initials(title: string) {
  const parts = title.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "M";
}

function LaneItem({
  item,
  locale,
  active,
  onSelect,
  inSessionLane,
  priorityBadge,
}: {
  item: UnifiedMessagingLaneItem;
  locale: string;
  active: boolean;
  onSelect: () => void;
  inSessionLane: boolean;
  priorityBadge: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative w-full rounded-2xl border p-3 text-start transition-all duration-200 ${
        active
          ? "border-primary/65 bg-gradient-to-br from-primary-light via-primary-light-hover to-white shadow-[0_22px_30px_-22px_rgba(68,161,148,0.6)] ring-1 ring-primary/25 dark:border-primary/45 dark:from-primary/30 dark:via-primary/16 dark:to-white/5 dark:ring-primary/30"
          : "border-border-light/85 bg-white hover:-translate-y-[1px] hover:border-primary/50 hover:shadow-[0_16px_24px_-20px_rgba(68,161,148,0.42)] dark:border-white/12 dark:bg-white/5 dark:hover:border-white/30"
      }`}
    >
      {inSessionLane && item.isSessionPriority ? (
        <span className="absolute top-2.5 start-2.5 inline-flex rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary dark:bg-primary/24 dark:text-primary-light">
          {priorityBadge}
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/24 to-primary/6 text-[12px] font-bold text-primary ring-1 ring-primary/25 dark:from-primary/35 dark:to-primary/15 dark:ring-primary/30">
            {item.hasUnread ? (
              <span className="absolute -top-0.5 -start-0.5 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white dark:ring-surface-secondary" />
            ) : null}
            {initials(item.title)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {item.title}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary dark:text-white/72">
              {item.note}
            </p>
            {item.status ? (
              <p className="mt-1 inline-flex rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary dark:bg-primary/24 dark:text-primary-light">
                {item.status}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {inSessionLane && item.isSessionPriority ? (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(52,211,153,0.16)]" />
          ) : null}
          {item.unreadCount && item.unreadCount > 0 ? (
            <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </span>
          ) : null}
          <span className="text-[10px] font-medium tracking-wide text-text-muted dark:text-white/58">
            {formatRelativeAt(item.at, locale)}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function UnifiedMessagesLauncher({
  role,
  showFloatingTrigger = true,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("messages-shell");
  const pathname = usePathname();
  const isRtl = locale.startsWith("ar");
  const copy = useMemo(() => ({
    title: t("title"),
    subtitle: t("subtitle"),
    lanes: {
      session: t("lanes.session"),
      practitioner: role === "practitioner"
        ? t("lanes.practitioner_practitioner")
        : t("lanes.practitioner_patient"),
      support: t("lanes.support"),
    },
    laneNotes: {
      session: t("laneNotes.session"),
      practitioner: t("laneNotes.practitioner"),
      support: t("laneNotes.support"),
    },
    openAll: t("openAll"),
    empty: t("empty"),
    loading: t("loading"),
    error: t("error"),
    retry: t("retry"),
    minimize: t("minimize"),
    restore: t("restore"),
    close: t("close"),
    notAvailable: t("notAvailable"),
    adminSessionHint: t("adminSessionHint"),
    sessionProminentBanner: t("sessionProminentBanner"),
    sessionLiveBanner: t("sessionLiveBanner"),
    sessionReadyBanner: t("sessionReadyBanner"),
    threadHeading: t("threadHeading"),
    threadHint: t("threadHint"),
    sessionReadOnlyHint: t("sessionReadOnlyHint"),
    sessionReadOnlyReview: t("sessionReadOnlyReview"),
    sessionReadOnlySendBlocked: t("sessionReadOnlySendBlocked"),
    composerPlaceholder: t("composerPlaceholder"),
    send: t("send"),
    activeSessionStripLabel: t("activeSessionStripLabel"),
    activeSessionStripAction: t("activeSessionStripAction"),
    localReadHint: t("localReadHint"),
    supportHeading: t("supportHeading"),
    supportNote: t("supportNote"),
    supportCreateHeading: t("supportCreateHeading"),
    supportCreateNote: t("supportCreateNote"),
    supportCreateSubject: t("supportCreateSubject"),
    supportCreateMessage: t("supportCreateMessage"),
    supportCreateAction: t("supportCreateAction"),
    supportCreating: t("supportCreating"),
    supportOpenFull: t("supportOpenFull"),
    practitionerHeading: t("practitionerHeading"),
    practitionerNote: t("practitionerNote"),
    practitionerPendingNote: t("practitionerPendingNote"),
    practitionerOpenFull: t("practitionerOpenFull"),
    sessionOpenFull: t("sessionOpenFull"),
    priorityBadge: t("priorityBadge"),
    viewConversations: t("viewConversations"),
    conversationsSwitcherSingle: t("conversationsSwitcherSingle"),
    conversationsSwitcherCount: (count: number) =>
      t("conversationsSwitcherCount", { count }),
  }), [t, role]);
  const isSupportDetailPageActive = useMemo(() => {
    const roleSegment =
      role === "admin" ? "admin" : role === "patient" ? "patient" : "practitioner";
    const marker = `/${roleSegment}/support/`;
    const markerIndex = pathname.indexOf(marker);

    if (markerIndex < 0) {
      return false;
    }

    const tail = pathname.slice(markerIndex + marker.length);
    return tail.length > 0 && !tail.includes("/");
  }, [pathname, role]);

  const continuityStorageKey = useMemo(
    () => buildMessagesShellContinuityStorageKey(role),
    [role],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [continuityReady, setContinuityReady] = useState(false);
  const [activeLane, setActiveLane] = useState<UnifiedMessagingLane>(
    role === "admin" ? "support" : "session"
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSupportTicketId, setSelectedSupportTicketId] = useState<string | null>(null);
  const [selectedPractitionerRequestId, setSelectedPractitionerRequestId] = useState<string | null>(null);
  const [localSessionReads, setLocalSessionReads] = useState<SessionReadState>({});
  const [dismissedPrioritySessionId, setDismissedPrioritySessionId] = useState<string | null>(
    null,
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const historyButtonRef = useRef<HTMLButtonElement | null>(null);
  const historyPopupRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [headerAnchorRect, setHeaderAnchorRect] = useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
  } | null>(null);

  const {
    sessionLane,
    practitionerLane,
    supportLane,
    unreadLikeCount,
    sessionRootHref,
    practitionerRootHref,
    supportRootHref,
    sessionSignal,
  } = useUnifiedMessagingShell(role, {
    laneDataEnabled: isOpen && !isMinimized,
    activeLane,
    suppressSupportLaneFetch: isSupportDetailPageActive,
  });

  const handleLauncherClick = useCallback(() => {
    if (!showFloatingTrigger) {
      setIsOpen((previous) => !previous);
      setIsMinimized(false);
      return;
    }

    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
      return;
    }
    setIsMinimized((previous) => !previous);
  }, [isOpen, showFloatingTrigger]);

  const laneMeta = useMemo(
    () => ({
      session: {
        icon: <Video className="h-4 w-4" />,
        lane: sessionLane,
        href: sessionRootHref,
      },
      practitioner: {
        icon: <Stethoscope className="h-4 w-4" />,
        lane: practitionerLane,
        href: practitionerRootHref,
      },
      support: {
        icon: <LifeBuoy className="h-4 w-4" />,
        lane: supportLane,
        href: supportRootHref,
      },
    }),
    [
      practitionerLane,
      practitionerRootHref,
      sessionLane,
      sessionRootHref,
      supportLane,
      supportRootHref,
    ],
  );

  useEffect(() => {
    // Avoid hydration mismatches: the server cannot read localStorage, so we always start from a
    // deterministic default and restore continuity after the component hydrates.
    const snapshot = loadMessagesShellContinuitySnapshot(continuityStorageKey);
    queueMicrotask(() => {
      if (snapshot) {
        let restoredLane = snapshot.activeLane;
        if (role === "admin" && restoredLane === "session") {
          restoredLane = "support";
        }
        setActiveLane(restoredLane);
        setSelectedSessionId(snapshot.selectedSessionId);
        setSelectedSupportTicketId(snapshot.selectedSupportTicketId);
        setSelectedPractitionerRequestId(snapshot.selectedPractitionerRequestId);
        setLocalSessionReads(snapshot.localSessionReads ?? {});
      }
      setContinuityReady(true);
    });
  }, [continuityStorageKey, role]);

  useEffect(() => {
    if (!continuityReady) return;
    saveMessagesShellContinuitySnapshot(continuityStorageKey, {
      activeLane,
      selectedSessionId,
      selectedSupportTicketId,
      selectedPractitionerRequestId,
      localSessionReads,
    });
  }, [
    activeLane,
    continuityStorageKey,
    continuityReady,
    localSessionReads,
    selectedPractitionerRequestId,
    selectedSessionId,
    selectedSupportTicketId,
  ]);

  useEffect(() => {
    if (!continuityReady) return;
    if (activeLane !== "session") return;
    if (sessionLane.items.length === 0) {
      const clear = window.setTimeout(() => setSelectedSessionId(null), 0);
      return () => window.clearTimeout(clear);
    }
    if (selectedSessionId && sessionLane.items.some((item) => item.id === selectedSessionId)) {
      return;
    }
    const pick = window.setTimeout(() => setSelectedSessionId(sessionLane.items[0].id), 0);
    return () => window.clearTimeout(pick);
  }, [activeLane, continuityReady, selectedSessionId, sessionLane.items]);

  useEffect(() => {
    if (!continuityReady) return;
    if (activeLane !== "support") return;
    if (supportLane.items.length === 0) {
      const clear = window.setTimeout(() => setSelectedSupportTicketId(null), 0);
      return () => window.clearTimeout(clear);
    }
    if (selectedSupportTicketId) {
      return;
    }
    const pick = window.setTimeout(() => setSelectedSupportTicketId(supportLane.items[0].id), 0);
    return () => window.clearTimeout(pick);
  }, [activeLane, continuityReady, selectedSupportTicketId, supportLane.items]);

  useEffect(() => {
    if (!continuityReady) return;
    if (activeLane !== "practitioner") return;
    if (practitionerLane.items.length === 0) {
      const clear = window.setTimeout(() => setSelectedPractitionerRequestId(null), 0);
      return () => window.clearTimeout(clear);
    }
    if (
      selectedPractitionerRequestId &&
      practitionerLane.items.some((item) => item.id === selectedPractitionerRequestId)
    ) {
      return;
    }
    const pick = window.setTimeout(
      () => setSelectedPractitionerRequestId(practitionerLane.items[0].id),
      0,
    );
    return () => window.clearTimeout(pick);
  }, [activeLane, continuityReady, practitionerLane.items, selectedPractitionerRequestId]);

  useEffect(() => {
    if (role === "admin") return;
    if (!sessionSignal.hasInProgress) return;
    const priorityId = sessionSignal.highestPrioritySessionId;
    if (!priorityId || dismissedPrioritySessionId === priorityId) return;

    const promote = window.setTimeout(() => {
      setActiveLane("session");
      setSelectedSessionId(priorityId);
      setIsOpen(true);
      setIsMinimized(false);
    }, 0);
    return () => window.clearTimeout(promote);
  }, [
    dismissedPrioritySessionId,
    role,
    sessionSignal.hasInProgress,
    sessionSignal.highestPrioritySessionId,
  ]);

  useEffect(() => {
    return listenOpenSessionChatInShell(({ sessionId }) => {
      setActiveLane("session");
      setSelectedSessionId(sessionId);
      setIsOpen(true);
      setIsMinimized(false);
    });
  }, []);

  useEffect(() => {
    return listenOpenMessagesShell((payload) => {
      if (payload?.lane) {
        setActiveLane(payload.lane);
      }
      if (payload?.lane === "session" && payload.threadId) {
        setSelectedSessionId(payload.threadId);
      }
      if (payload?.lane === "support" && payload.threadId) {
        setSelectedSupportTicketId(payload.threadId);
      }
      if (payload?.lane === "practitioner" && payload.threadId) {
        setSelectedPractitionerRequestId(payload.threadId);
      }
      if (!showFloatingTrigger && payload?.anchorRect) {
        setHeaderAnchorRect({
          top: payload.anchorRect.top,
          left: payload.anchorRect.left,
          right: payload.anchorRect.right,
          bottom: payload.anchorRect.bottom,
        });
      }
      setIsOpen(true);
      setIsMinimized(false);
    });
  }, [showFloatingTrigger]);

  useEffect(() => {
    return listenToggleMessagesShell((payload?: ToggleMessagesShellEventPayload) => {
      if (!showFloatingTrigger && payload?.anchorRect) {
        setHeaderAnchorRect({
          top: payload.anchorRect.top,
          left: payload.anchorRect.left,
          right: payload.anchorRect.right,
          bottom: payload.anchorRect.bottom,
        });
      }
      handleLauncherClick();
    });
  }, [handleLauncherClick, showFloatingTrigger]);

  useEffect(() => {
    if (showFloatingTrigger || !isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (panelRef.current?.contains(target)) return;
      if (target.closest(".messages-header-toggle")) return;
      setIsOpen(false);
      setIsHistoryOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
    };
  }, [isOpen, showFloatingTrigger]);

  useEffect(() => {
    if (!isHistoryOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsidePopup = historyPopupRef.current?.contains(target);
      const clickedButton = historyButtonRef.current?.contains(target);
      if (!clickedInsidePopup && !clickedButton) {
        setIsHistoryOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
    };
  }, [isHistoryOpen]);

  const selectedSessionItem = useMemo(
    () => sessionLane.items.find((item) => item.id === selectedSessionId) ?? null,
    [selectedSessionId, sessionLane.items],
  );
  const selectedSupportItem = useMemo(
    () => supportLane.items.find((item) => item.id === selectedSupportTicketId) ?? null,
    [selectedSupportTicketId, supportLane.items],
  );
  const selectedPractitionerItem = useMemo(
    () => practitionerLane.items.find((item) => item.id === selectedPractitionerRequestId) ?? null,
    [practitionerLane.items, selectedPractitionerRequestId],
  );
  const activePrioritySessionItem = useMemo(() => {
    if (!sessionSignal.highestPrioritySessionId) return null;
    return (
      sessionLane.items.find((item) => item.id === sessionSignal.highestPrioritySessionId) ?? null
    );
  }, [sessionLane.items, sessionSignal.highestPrioritySessionId]);

  const sessionDisplayAttentionCount = useMemo(() => {
    return role === "admin" ? 0 : sessionLane.attentionCount;
  }, [role, sessionLane.attentionCount]);

  const adjustedUnreadLikeCount = unreadLikeCount;

  const markSessionAsLocallyRead = useCallback(
    (sessionId: string, sessionStatus: UnifiedSessionChatStatus | undefined) => {
      if (!sessionStatus) return;
      setLocalSessionReads((current) => ({
        ...current,
        [sessionId]: {
          readAt: new Date().toISOString(),
          sessionStatus,
        },
      }));
    },
    [],
  );

  const handleClosePanel = () => {
    if (sessionSignal.highestPrioritySessionId && sessionSignal.hasInProgress) {
      setDismissedPrioritySessionId(sessionSignal.highestPrioritySessionId);
    }
    setIsHistoryOpen(false);
    setIsOpen(false);
  };

  const edgePlacement = isRtl ? "left-4 sm:left-6" : "right-4 sm:right-6";
  const isPanelVisible = showFloatingTrigger ? isOpen && !isMinimized : isOpen;
  const headerContainerStyle = !showFloatingTrigger
    ? {
        top:
          (headerAnchorRect?.bottom ?? (typeof window !== "undefined" ? 76 : 76)) + 8,
        left: isRtl ? (headerAnchorRect?.left ?? 12) : undefined,
        right:
          !isRtl && typeof window !== "undefined" && headerAnchorRect
            ? Math.max(window.innerWidth - headerAnchorRect.right, 12)
            : !isRtl
              ? 12
              : undefined,
      }
    : undefined;
  const sessionLanePriority = sessionSignal.hasInProgress || sessionSignal.hasReadyToJoin;
  const sessionBannerText = sessionSignal.hasInProgress
    ? copy.sessionLiveBanner
    : sessionSignal.hasReadyToJoin
      ? copy.sessionReadyBanner
      : null;
  const badgeValue = adjustedUnreadLikeCount > 99 ? "99+" : String(adjustedUnreadLikeCount);
  const activeLaneItems = laneMeta[activeLane].lane.items;

  const footerHref = useMemo(() => {
    const laneParam = activeLane === "practitioner" ? "care" : activeLane;
    return getMessagesPath(null, role, {
      lane: laneParam,
    });
  }, [role, activeLane]);

  return (
    <div
      ref={panelRef}
      style={headerContainerStyle}
      className={`fixed z-[75] ${
        showFloatingTrigger
          ? `${edgePlacement} bottom-4`
          : "top-0"
      }`}
    >
      {showFloatingTrigger && (!isOpen || isMinimized) ? (
        <button
          type="button"
          onClick={handleLauncherClick}
          className="group relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-active text-white shadow-[0_24px_42px_-14px_rgba(68,161,148,0.78)] transition hover:brightness-110"
          aria-label={copy.title}
          title={copy.title}
        >
          <MessageCircle className="h-5 w-5" />
          {adjustedUnreadLikeCount > 0 ? (
            <span className="absolute -top-1 -right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
              {badgeValue}
            </span>
          ) : null}
          {sessionSignal.hasInProgress ? (
            <span className="absolute -bottom-1 -left-1 inline-flex h-4 w-4 animate-pulse rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
          ) : null}
        </button>
      ) : null}

      <div
        className={`absolute w-[min(96vw,480px)] transition-all duration-200 ${
          isPanelVisible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        } ${
          showFloatingTrigger
            ? `bottom-[72px] ${isRtl ? "left-0 origin-bottom-left" : "right-0 origin-bottom-right"}`
            : `top-0 ${isRtl ? "left-0 origin-top-left" : "right-0 origin-top-right"}`
        }`}
      >
        <section className="flex h-[min(84vh,800px)] max-h-[calc(100vh-88px)] flex-col overflow-hidden rounded-[24px] border border-border-strong/60 bg-surface-primary shadow-[0_48px_100px_-44px_rgba(34,52,56,0.38),0_0_0_1px_rgba(68,161,148,0.06)] dark:border-white/10 dark:bg-surface-secondary">

          {/* ── Header ── */}
          <header className="shrink-0 border-b border-border-light/60 bg-gradient-to-b from-primary-light/80 via-primary-light/40 to-white/0 px-4 pb-3 pt-3.5 dark:border-white/8 dark:from-primary/30 dark:via-primary/10 dark:to-transparent">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold tracking-tight text-text-primary dark:text-white/95">
                  {copy.title}
                </h2>
                <p className="mt-0.5 truncate text-[11px] leading-tight text-text-secondary/80 dark:text-white/50">
                  {copy.subtitle}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {showFloatingTrigger ? (
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-light/80 text-text-secondary transition hover:bg-white hover:text-text-primary dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={copy.minimize}
                    title={copy.minimize}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleClosePanel}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-light/80 text-text-secondary transition hover:bg-white hover:text-text-primary dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label={copy.close}
                  title={copy.close}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {role !== "admin" && activePrioritySessionItem ? (
              <div className="mt-2.5 rounded-xl border border-primary/30 bg-gradient-to-r from-primary-light-hover to-primary-light px-3 py-2 shadow-[0_8px_24px_-20px_rgba(68,161,148,0.38)] dark:border-primary/30 dark:from-primary/22 dark:to-primary/8">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted dark:text-white/50">
                    {copy.activeSessionStripLabel}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveLane("session");
                      setSelectedSessionId(activePrioritySessionItem.id);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline dark:text-primary-light"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    {copy.activeSessionStripAction}
                  </button>
                </div>
                <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                  {activePrioritySessionItem.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-text-secondary dark:text-white/65">
                  {activePrioritySessionItem.status ?? activePrioritySessionItem.note}
                </p>
              </div>
            ) : null}

            {activeLane === "session" && sessionLanePriority ? (
              <div className="mt-2.5 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/18 to-primary/8 px-3 py-2 text-xs text-primary dark:border-primary/35 dark:from-primary/20 dark:to-primary/8 dark:text-primary-light">
                <p className="font-semibold">{copy.sessionProminentBanner}</p>
                {sessionBannerText ? <p className="mt-0.5 opacity-80">{sessionBannerText}</p> : null}
              </div>
            ) : null}
          </header>

          {/* ── Tab bar ── */}
          <div className="shrink-0 border-b border-border-light/60 bg-gray-50/60 px-2.5 pb-2 pt-2 dark:border-white/8 dark:bg-white/3">
            <div className={`grid ${role === "admin" ? "grid-cols-2" : "grid-cols-3"} gap-1 rounded-[14px] bg-gray-100/90 p-1 ring-1 ring-border-light/50 dark:bg-white/5 dark:ring-white/8`}>
              {(Object.keys(laneMeta) as UnifiedMessagingLane[])
                .filter((lane) => !(role === "admin" && lane === "session"))
                .map((lane) => {
                  const isActive = lane === activeLane;
                  const laneCount =
                    lane === "session"
                      ? sessionDisplayAttentionCount
                      : laneMeta[lane].lane.attentionCount;
                  return (
                    <button
                      key={lane}
                      type="button"
                      onClick={() => {
                        setActiveLane(lane);
                        setIsHistoryOpen(false);
                      }}
                      className={`relative inline-flex items-center justify-center gap-1.5 rounded-[10px] px-2 py-2.5 text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? "bg-white text-primary shadow-sm ring-1 ring-primary/15 dark:bg-white/12 dark:text-primary-light dark:ring-primary/25"
                          : "text-text-secondary hover:bg-white/70 hover:text-text-primary dark:text-white/55 dark:hover:bg-white/7 dark:hover:text-white/85"
                      }`}
                    >
                      <span className={`shrink-0 ${isActive ? "text-primary dark:text-primary-light" : "text-text-muted/70 dark:text-white/40"}`}>
                        {laneMeta[lane].icon}
                      </span>
                      <span className="truncate leading-tight">{copy.lanes[lane]}</span>
                      {laneCount > 0 ? (
                        <span className="inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm">
                          {laneCount > 9 ? "9+" : laneCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* ── Conversation switcher strip ── */}
          <div className="relative shrink-0 border-b border-border-light/60 bg-white/50 px-3 py-2 dark:border-white/8 dark:bg-transparent">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-[11px] text-text-secondary/75 dark:text-white/45">
                {copy.laneNotes[activeLane]}
              </p>
              <button
                ref={historyButtonRef}
                type="button"
                onClick={() => setIsHistoryOpen((previous) => !previous)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                  isHistoryOpen
                    ? "border-primary/35 bg-primary/8 text-primary dark:border-primary/30 dark:bg-primary/14 dark:text-primary-light"
                    : "border-border-light bg-white text-text-primary shadow-sm hover:border-primary/30 hover:text-primary dark:border-white/12 dark:bg-white/5 dark:text-white/80 dark:hover:border-primary/25 dark:hover:text-primary-light"
                }`}
                aria-expanded={isHistoryOpen}
                aria-label={copy.viewConversations}
                title={copy.viewConversations}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {activeLaneItems.length === 1
                    ? copy.conversationsSwitcherSingle
                    : copy.conversationsSwitcherCount(activeLaneItems.length)}
                </span>
                <ChevronDown className={`h-3 w-3 shrink-0 transition-transform duration-150 ${isHistoryOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {isHistoryOpen ? (
              <div
                ref={historyPopupRef}
                className={`absolute top-[calc(100%+6px)] z-30 max-h-[40vh] w-[min(94vw,430px)] overflow-hidden rounded-2xl border border-border-strong/60 bg-surface-primary shadow-[0_24px_60px_-28px_rgba(34,52,56,0.36)] dark:border-white/10 dark:bg-surface-secondary ${
                  isRtl ? "left-2" : "right-2"
                }`}
              >
                <div className="custom-scrollbar max-h-[40vh] overflow-y-auto p-3 pe-2">
                  <div className="space-y-2">
                    {role === "admin" && activeLane === "session" ? (
                      <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-4 text-sm text-text-secondary dark:border-white/10 dark:bg-white/5 dark:text-white/75">
                        <p>{copy.notAvailable}</p>
                        <p className="mt-1">{copy.adminSessionHint}</p>
                      </div>
                    ) : laneMeta[activeLane].lane.loading ? (
                      <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-4 text-sm text-text-secondary dark:border-white/10 dark:bg-white/5 dark:text-white/75">
                        {copy.loading}
                      </div>
                    ) : laneMeta[activeLane].lane.error ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                        <p>{copy.error}</p>
                        <button
                          type="button"
                          onClick={() => laneMeta[activeLane].lane.refetch()}
                          className="mt-2 text-xs font-semibold underline"
                        >
                          {copy.retry}
                        </button>
                      </div>
                    ) : activeLaneItems.length === 0 ? (
                      <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-4 text-sm text-text-secondary dark:border-white/10 dark:bg-white/5 dark:text-white/75">
                        {copy.empty}
                      </div>
                    ) : (
                      activeLaneItems.map((item) => (
                        <LaneItem
                          key={item.id}
                          item={item}
                          locale={locale}
                          active={
                            (activeLane === "session" && selectedSessionId === item.id) ||
                            (activeLane === "support" && selectedSupportTicketId === item.id) ||
                            (activeLane === "practitioner" &&
                              selectedPractitionerRequestId === item.id)
                          }
                          onSelect={() => {
                            if (activeLane === "session") setSelectedSessionId(item.id);
                            if (activeLane === "support") setSelectedSupportTicketId(item.id);
                            if (activeLane === "practitioner") {
                              setSelectedPractitionerRequestId(item.id);
                            }
                            setIsHistoryOpen(false);
                          }}
                          inSessionLane={activeLane === "session"}
                          priorityBadge={copy.priorityBadge}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Thread area ── */}
          <main className="min-h-0 flex-1 overflow-hidden bg-gradient-to-b from-white via-primary-light/55 to-primary-light/30 p-2.5 dark:from-transparent dark:to-transparent">
            {activeLane === "session" && role !== "admin" && selectedSessionItem ? (
              <SessionLaneThread
                sessionId={selectedSessionItem.id}
                sessionTitle={selectedSessionItem.title}
                sessionStatusLabel={selectedSessionItem.status}
                role={role}
                locale={locale}
                copy={{
                  threadHeading: copy.threadHeading,
                  threadHint: copy.threadHint,
                  sessionReadOnlyHint: copy.sessionReadOnlyHint,
                  sessionReadOnlyReview: copy.sessionReadOnlyReview,
                  sessionReadOnlySendBlocked: copy.sessionReadOnlySendBlocked,
                  openFullChat: copy.sessionOpenFull,
                  composerPlaceholder: copy.composerPlaceholder,
                  send: copy.send,
                  loading: copy.loading,
                  empty: copy.empty,
                  error: copy.error,
                }}
                onOpenFullChat={() => setIsOpen(false)}
                onThreadActive={() =>
                  markSessionAsLocallyRead(
                    selectedSessionItem.id,
                    selectedSessionItem.sessionStatus,
                  )
                }
              />
            ) : null}

            {activeLane === "support" ? (
              <SupportLaneThread
                role={role}
                ticketId={selectedSupportItem?.supportTicketId ?? selectedSupportTicketId}
                fullViewHref={getMessagesPath(null, role, { lane: "support", id: selectedSupportItem?.supportTicketId || selectedSupportTicketId || undefined })}
                locale={locale}
                copy={{
                  heading: copy.supportHeading,
                  note: copy.supportNote,
                  empty: copy.empty,
                  loading: copy.loading,
                  error: copy.error,
                  composerPlaceholder: copy.composerPlaceholder,
                  send: copy.send,
                  createHeading: copy.supportCreateHeading,
                  createNote: copy.supportCreateNote,
                  createSubjectPlaceholder: copy.supportCreateSubject,
                  createMessagePlaceholder: copy.supportCreateMessage,
                  createAction: copy.supportCreateAction,
                  creating: copy.supportCreating,
                  openFull: copy.supportOpenFull,
                }}
                onOpenFull={() => setIsOpen(false)}
                onCreatedTicket={(ticketId) => {
                  setSelectedSupportTicketId(ticketId);
                  laneMeta.support.lane.refetch();
                }}
              />
            ) : null}

            {activeLane === "practitioner" ? (
              <PractitionerLaneThread
                role={role}
                requestId={selectedPractitionerItem?.careRequestId ?? selectedPractitionerRequestId}
                conversationId={selectedPractitionerItem?.careConversationId ?? null}
                requestStatus={selectedPractitionerItem?.careRequestStatus}
                fullViewHref={getMessagesPath(null, role, { lane: "care", id: selectedPractitionerItem?.careRequestId || selectedPractitionerRequestId || undefined })}
                locale={locale}
                copy={{
                  heading: copy.practitionerHeading,
                  note: copy.practitionerNote,
                  pendingNote: copy.practitionerPendingNote,
                  empty: copy.empty,
                  loading: copy.loading,
                  error: copy.error,
                  composerPlaceholder: copy.composerPlaceholder,
                  send: copy.send,
                  openFull: copy.practitionerOpenFull,
                }}
                onOpenFull={() => setIsOpen(false)}
              />
            ) : null}
          </main>

          {/* ── Footer: View all messages ── */}
          <div className="shrink-0 border-t border-border-light/60 bg-gray-50/60 px-4 py-2.5 dark:border-white/8 dark:bg-transparent">
            <Link
              href={footerHref as never}
              onClick={() => setIsOpen(false)}
              className="group inline-flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold text-text-secondary transition hover:text-primary dark:text-white/55 dark:hover:text-primary-light"
            >
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/60 group-hover:text-primary dark:text-primary/50 dark:group-hover:text-primary-light" />
                <span>{copy.openAll}</span>
              </span>
              <ChevronUp className={`h-3.5 w-3.5 shrink-0 text-primary/50 transition-transform group-hover:-translate-y-0.5 group-hover:text-primary dark:text-primary/40 dark:group-hover:text-primary-light rtl:rotate-180`} />
            </Link>
          </div>
        </section>
      </div>

      {showFloatingTrigger && isOpen && isMinimized ? (
        <button
          type="button"
          onClick={handleLauncherClick}
          className={`absolute bottom-[72px] inline-flex items-center gap-2 rounded-full border border-border-light bg-surface-primary px-3 py-2 text-xs font-semibold text-text-primary shadow-lg transition hover:border-primary/35 hover:text-primary dark:border-white/15 dark:bg-surface-secondary dark:text-white/90 ${
            isRtl ? "left-0" : "right-0"
          }`}
          aria-label={copy.restore}
          title={copy.restore}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {copy.title}
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
