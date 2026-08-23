"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  ChevronDown,
  ChevronUp,
  LifeBuoy,
  MessageSquare,
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
import NewSupportMessageAction from "./NewSupportMessageAction";

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
          ? "border-teal-500/50 bg-teal-50/60 shadow-[0_4px_16px_-4px_rgba(20,150,132,0.15)] ring-1 ring-teal-500/20 dark:border-teal-500/40 dark:bg-teal-950/30 dark:ring-teal-500/30"
          : "border-slate-200/80 bg-white hover:-translate-y-[1px] hover:border-teal-500/40 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
      }`}
    >
      {inSessionLane && item.isSessionPriority ? (
        <span className="absolute top-2.5 start-2.5 inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-500/20 dark:text-teal-300">
          {priorityBadge}
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/10 text-[12px] font-bold text-teal-700 ring-1 ring-teal-500/20 dark:from-teal-500/30 dark:to-teal-500/10 dark:text-teal-300 dark:ring-teal-500/30">
            {item.hasUnread ? (
              <span className="absolute -top-0.5 -start-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            ) : null}
            {initials(item.title)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white/95">
              {item.title}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-white/60">
              {item.hasUnread
                ? (locale.startsWith("ar") ? "رسالة جديدة" : "New message")
                : (locale.startsWith("ar") ? "محادثة نشطة" : "Active conversation")}
            </p>

            {item.status ? (
              <p className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-white/70">
                {item.status}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {inSessionLane && item.isSessionPriority ? (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950" />
          ) : null}
          {item.unreadCount && item.unreadCount > 0 ? (
            <span className="inline-flex items-center rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </span>
          ) : null}
          <span className="text-[10px] font-medium text-slate-400 dark:text-white/50">
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
    role === "admin" ? "support" : "practitioner"
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSupportTicketId, setSelectedSupportTicketId] = useState<string | null>(null);
  const [isSupportComposeOpen, setIsSupportComposeOpen] = useState(false);
  const [selectedPractitionerRequestId, setSelectedPractitionerRequestId] = useState<string | null>(null);
  const [localSessionReads, setLocalSessionReads] = useState<SessionReadState>({});
  const [headerAnchorRect, setHeaderAnchorRect] = useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
  } | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const historyButtonRef = useRef<HTMLButtonElement | null>(null);
  const historyPopupRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const {
    sessionLane,
    practitionerLane,
    supportLane,
    unreadLikeCount,
    sessionRootHref,
    practitionerRootHref,
    supportRootHref,
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
    if (isSupportComposeOpen) return;
    if (supportLane.items.length === 0) {
      const clear = window.setTimeout(() => setSelectedSupportTicketId(null), 0);
      return () => window.clearTimeout(clear);
    }
    if (selectedSupportTicketId) {
      return;
    }
    const pick = window.setTimeout(() => setSelectedSupportTicketId(supportLane.items[0].id), 0);
    return () => window.clearTimeout(pick);
  }, [activeLane, continuityReady, isSupportComposeOpen, selectedSupportTicketId, supportLane.items]);

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
    return listenToggleMessagesShell((payload) => {
      if (payload?.anchorRect) {
        setHeaderAnchorRect(payload.anchorRect);
      }
      setIsOpen((previous) => {
        const next = !previous;
        if (next) {
          setIsMinimized(false);
        }
        return next;
      });
    });
  }, []);

  useEffect(() => {
    return listenOpenMessagesShell((payload) => {
      setIsOpen(true);
      setIsMinimized(false);
      let targetLane = payload?.lane ?? activeLane;
      if (role === "admin" && targetLane === "session") {
        targetLane = "support";
      }
      setActiveLane(targetLane);
      if (payload?.threadId) {
        if (targetLane === "session") setSelectedSessionId(payload.threadId);
        if (targetLane === "support") {
          setIsSupportComposeOpen(false);
          setSelectedSupportTicketId(payload.threadId);
        }
        if (targetLane === "practitioner") setSelectedPractitionerRequestId(payload.threadId);
      }
    });
  }, [activeLane, role]);

  useEffect(() => {
    return listenOpenSessionChatInShell((payload) => {
      if (role === "admin") return;
      setIsOpen(true);
      setIsMinimized(false);
      setActiveLane("session");
      if (payload?.sessionId) {
        setSelectedSessionId(payload.sessionId);
      }
    });
  }, [role]);

  useEffect(() => {
    if (!isHistoryOpen) return;

    function handleOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        historyButtonRef.current?.contains(target) ||
        historyPopupRef.current?.contains(target)
      ) {
        return;
      }
      setIsHistoryOpen(false);
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isHistoryOpen]);

  const activeLaneItems = useMemo(() => {
    if (activeLane === "session") return sessionLane.items;
    if (activeLane === "support") return supportLane.items;
    return practitionerLane.items;
  }, [activeLane, practitionerLane.items, sessionLane.items, supportLane.items]);

  const selectedSessionItem = useMemo(() => {
    if (!selectedSessionId) return sessionLane.items[0] ?? null;
    return sessionLane.items.find((item) => item.id === selectedSessionId) ?? sessionLane.items[0] ?? null;
  }, [selectedSessionId, sessionLane.items]);

  const selectedSupportItem = useMemo(() => {
    if (!selectedSupportTicketId) return supportLane.items[0] ?? null;
    return supportLane.items.find((item) => item.id === selectedSupportTicketId) ?? supportLane.items[0] ?? null;
  }, [selectedSupportTicketId, supportLane.items]);

  const selectedPractitionerItem = useMemo(() => {
    if (!selectedPractitionerRequestId) return practitionerLane.items[0] ?? null;
    return (
      practitionerLane.items.find((item) => item.id === selectedPractitionerRequestId) ??
      practitionerLane.items[0] ??
      null
    );
  }, [practitionerLane.items, selectedPractitionerRequestId]);

  const markSessionAsLocallyRead = useCallback(
    (sessionId: string, sessionStatus: UnifiedSessionChatStatus | null) => {
      setLocalSessionReads((previous) => ({
        ...previous,
        [sessionId]: {
          readAt: new Date().toISOString(),
          sessionStatus: sessionStatus ?? null,
        },
      }));
    },
    [],
  );

  const sessionDisplayAttentionCount = useMemo(() => {
    let unreadCount = 0;
    for (const item of sessionLane.items) {
      const localRead = localSessionReads[item.id];
      const hasFreshUnread = localRead
        ? Boolean(item.unreadCount && item.unreadCount > 0)
        : Boolean(item.hasUnread);

      if (hasFreshUnread) {
        unreadCount += 1;
      }
    }
    return unreadCount;
  }, [localSessionReads, sessionLane.items]);

  const handleClosePanel = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const handleNewSupportMessage = useCallback(() => {
    setActiveLane("support");
    setIsSupportComposeOpen(true);
    setIsHistoryOpen(false);
  }, []);

  const isPanelVisible = isOpen && !isMinimized;

  const footerHref = useMemo(() => {
    if (activeLane === "session") return sessionRootHref;
    if (activeLane === "support") return supportRootHref;
    return practitionerRootHref;
  }, [activeLane, practitionerRootHref, sessionRootHref, supportRootHref]);

  if (!isOpen && !showFloatingTrigger) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className={showFloatingTrigger ? "relative z-50" : "fixed inset-0 pointer-events-none z-[100]"}
    >
      {showFloatingTrigger ? (
        <button
          type="button"
          onClick={handleLauncherClick}
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-[0_16px_32px_-10px_rgba(68,161,148,0.55)] transition-all duration-200 hover:scale-105 hover:bg-primary-hover active:scale-95 dark:shadow-[0_16px_32px_-10px_rgba(68,161,148,0.35)]"
          aria-label={copy.title}
          title={copy.title}
        >
          {unreadLikeCount > 0 ? (
            <span className="absolute -top-1 -start-1 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white shadow-sm">
              {unreadLikeCount > 99 ? "99+" : unreadLikeCount}
            </span>
          ) : null}
          <MessageSquare className="h-5 w-5" />
        </button>
      ) : null}

      <div
        style={
          !showFloatingTrigger && headerAnchorRect
            ? {
                top: `${headerAnchorRect.bottom + 8}px`,
                [isRtl ? "left" : "right"]: `${Math.max(16, isRtl ? headerAnchorRect.left : window.innerWidth - headerAnchorRect.right)}px`,
              }
            : undefined
        }
        className={`w-[min(96vw,480px)] transition-all duration-200 ${
          isPanelVisible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        } ${
          showFloatingTrigger
            ? `absolute bottom-[72px] ${isRtl ? "left-0 origin-bottom-left" : "right-0 origin-bottom-right"}`
            : `${
                headerAnchorRect
                  ? "fixed origin-top"
                  : `fixed top-16 ${isRtl ? "left-4 origin-top-left md:left-8" : "right-4 origin-top-right md:right-8"}`
              }`
        }`}
      >
        <section className="flex h-[min(84vh,800px)] max-h-[calc(100vh-88px)] flex-col overflow-hidden rounded-[26px] border border-slate-200/90 bg-white/95 backdrop-blur-2xl shadow-[0_32px_90px_-24px_rgba(15,23,42,0.25)] dark:border-white/10 dark:bg-slate-900/95">
          {/* ── Header ── */}
          <header className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent px-4 py-3.5 dark:border-white/8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    {copy.title}
                  </h2>
                  <p className="truncate text-[11px] text-slate-500 dark:text-white/50">
                    {copy.subtitle}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {showFloatingTrigger ? (
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={copy.minimize}
                    title={copy.minimize}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleClosePanel}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label={copy.close}
                  title={copy.close}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          {/* ── Segmented Tab bar ── */}
          <div className="shrink-0 border-b border-slate-100 bg-slate-50/60 p-2 dark:border-white/8 dark:bg-white/3">
            <div className={`grid ${role === "admin" ? "grid-cols-2" : "grid-cols-3"} gap-1.5 rounded-2xl bg-slate-200/60 p-1.5 dark:bg-white/5`}>
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
                        if (lane !== "support") setIsSupportComposeOpen(false);
                        setIsHistoryOpen(false);
                      }}
                      className={`relative inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-white text-teal-700 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800 dark:text-teal-300 dark:ring-white/10"
                          : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/90"
                      }`}
                    >
                      <span className={`shrink-0 ${isActive ? "text-teal-600 dark:text-teal-400" : "text-slate-400 dark:text-white/40"}`}>
                        {laneMeta[lane].icon}
                      </span>
                      <span className="truncate leading-tight">{copy.lanes[lane]}</span>
                      {laneCount > 0 ? (
                        <span className="inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-teal-600 px-1.5 text-[10px] font-bold leading-none text-white shadow-xs animate-pulse">
                          {laneCount > 9 ? "9+" : laneCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
            </div>
          </div>

          {activeLane === "support" ? (
            <NewSupportMessageAction
              role={role}
              locale={locale}
              onClick={handleNewSupportMessage}
              disabled={supportLane.loading}
            />
          ) : null}

          {/* ── Conversation switcher strip ── */}
          <div className="relative shrink-0 border-b border-slate-100 bg-white px-3 py-2 dark:border-white/8 dark:bg-transparent">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-[11px] font-medium text-slate-500 dark:text-white/50">
                {copy.laneNotes[activeLane]}
              </p>
              <button
                ref={historyButtonRef}
                type="button"
                onClick={() => setIsHistoryOpen((previous) => !previous)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  isHistoryOpen
                    ? "border-teal-500/40 bg-teal-50 text-teal-700 dark:border-teal-500/40 dark:bg-teal-950/40 dark:text-teal-300"
                    : "border-slate-200 bg-slate-50/80 text-slate-700 shadow-xs hover:border-teal-500/40 hover:bg-white hover:text-teal-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:border-teal-500/30 dark:hover:text-teal-300"
                }`}
                aria-expanded={isHistoryOpen}
                aria-label={copy.viewConversations}
                title={copy.viewConversations}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                <span>
                  {activeLaneItems.length === 1
                    ? copy.conversationsSwitcherSingle
                    : copy.conversationsSwitcherCount(activeLaneItems.length)}
                </span>
                <ChevronDown className={`h-3 w-3 shrink-0 transition-transform duration-200 ${isHistoryOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {isHistoryOpen ? (
              <div
                ref={historyPopupRef}
                className={`absolute top-[calc(100%+6px)] z-30 max-h-[40vh] w-[min(94vw,430px)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-2xl shadow-[0_24px_60px_-28px_rgba(15,23,42,0.3)] dark:border-white/10 dark:bg-slate-900/95 ${
                  isRtl ? "left-2" : "right-2"
                }`}
              >
                <div className="custom-scrollbar max-h-[40vh] overflow-y-auto p-3 pe-2">
                  <div className="space-y-2">
                    {role === "admin" && activeLane === "session" ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/75">
                        <p>{copy.notAvailable}</p>
                        <p className="mt-1">{copy.adminSessionHint}</p>
                      </div>
                    ) : laneMeta[activeLane].lane.loading ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/75">
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
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/75">
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
                            if (activeLane === "support") {
                              setIsSupportComposeOpen(false);
                              setSelectedSupportTicketId(item.id);
                            }
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
          <main className="min-h-0 flex-1 overflow-hidden bg-slate-50/40 p-2.5 dark:bg-slate-950/20">
            {activeLane === "session" && role !== "admin" && selectedSessionItem ? (
              <SessionLaneThread
                conversationId={selectedSessionItem.id}
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
                isVisible={isPanelVisible}
                onThreadActive={() =>
                  markSessionAsLocallyRead(
                    selectedSessionItem?.id ?? "",
                    selectedSessionItem?.sessionStatus ?? null,
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
                isVisible={isPanelVisible}
                onCreatedTicket={(ticketId) => {
                  setIsSupportComposeOpen(false);
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
                isVisible={isPanelVisible}
              />
            ) : null}
          </main>

          {/* ── Footer: View all messages ── */}
          <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-2.5 dark:border-white/8 dark:bg-transparent">
            <Link
              href={footerHref as never}
              onClick={() => setIsOpen(false)}
              className="group inline-flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-teal-700 dark:text-white/60 dark:hover:text-teal-300"
            >
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-600 group-hover:text-teal-700 dark:text-teal-400 dark:group-hover:text-teal-300" />
                <span>{copy.openAll}</span>
              </span>
              <ChevronUp className="h-3.5 w-3.5 shrink-0 text-teal-600 transition-transform group-hover:-translate-y-0.5 group-hover:text-teal-700 dark:text-teal-400 dark:group-hover:text-teal-300 rtl:rotate-180" />
            </Link>
          </div>
        </section>
      </div>

      {showFloatingTrigger && isOpen && isMinimized ? (
        <button
          type="button"
          onClick={handleLauncherClick}
          className={`absolute bottom-[72px] inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-900 shadow-xl transition hover:border-teal-500/40 hover:text-teal-700 dark:border-white/15 dark:bg-slate-900/95 dark:text-white ${
            isRtl ? "left-0" : "right-0"
          }`}
          aria-label={copy.restore}
          title={copy.restore}
        >
          <MessageSquare className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          {copy.title}
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
