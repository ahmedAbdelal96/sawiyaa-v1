"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
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

type CopyPack = {
  title: string;
  subtitle: string;
  lanes: Record<UnifiedMessagingLane, string>;
  laneNotes: Record<UnifiedMessagingLane, string>;
  openAll: string;
  empty: string;
  loading: string;
  error: string;
  retry: string;
  minimize: string;
  restore: string;
  close: string;
  notAvailable: string;
  adminSessionHint: string;
  sessionProminentBanner: string;
  sessionLiveBanner: string;
  sessionReadyBanner: string;
  threadHeading: string;
  threadHint: string;
  sessionReadOnlyHint: string;
  sessionReadOnlyReview: string;
  sessionReadOnlySendBlocked: string;
  composerPlaceholder: string;
  send: string;
  activeSessionStripLabel: string;
  activeSessionStripAction: string;
  localReadHint: string;
  supportHeading: string;
  supportNote: string;
  supportCreateHeading: string;
  supportCreateNote: string;
  supportCreateSubject: string;
  supportCreateMessage: string;
  supportCreateAction: string;
  supportCreating: string;
  supportOpenFull: string;
  practitionerHeading: string;
  practitionerNote: string;
  practitionerPendingNote: string;
  practitionerOpenFull: string;
  sessionOpenFull: string;
  priorityBadge: string;
};

type SessionReadState = Record<
  string,
  { readAt: string; sessionStatus: UnifiedSessionChatStatus | null }
>;

function getCopy(locale: string): CopyPack {
  if (locale.startsWith("ar")) {
    return {
      title: "الرسائل",
      subtitle: "تواصل سريع وواضح بدون مغادرة الصفحة",
      lanes: {
        session: "محادثة الجلسة",
        practitioner: "رسائل المعالج",
        support: "الدعم",
      },
      laneNotes: {
        session: "الأولوية للجلسات الجاهزة أو الجارية.",
        practitioner: "تابع التواصل العلاجي مع المعالج من هنا.",
        support: "تواصل مع فريق الدعم مباشرة من نفس اللوحة.",
      },
      openAll: "عرض كل الرسائل",
      empty: "لا توجد محادثات في هذا القسم حاليًا.",
      loading: "جارٍ تحميل المحادثات...",
      error: "تعذر تحميل هذا القسم الآن.",
      retry: "إعادة المحاولة",
      minimize: "تصغير",
      restore: "استعادة",
      close: "إغلاق",
      notAvailable: "غير متاح في هذه المساحة حاليًا.",
      adminSessionHint: "يمكن متابعة الجلسات من شاشة إدارة الجلسات.",
      sessionProminentBanner: "محادثة الجلسة لها أولوية الآن",
      sessionLiveBanner: "هناك جلسة جارية الآن",
      sessionReadyBanner: "هناك جلسة جاهزة للانضمام",
      threadHeading: "محادثة الجلسة",
      threadHint: "هذه المحادثة اليومية الأساسية. العرض الكامل اختياري.",
      sessionReadOnlyHint: "هذه المحادثة للقراءة فقط الآن.",
      sessionReadOnlyReview: "يمكنك مراجعة رسائل الجلسة بعد انتهائها.",
      sessionReadOnlySendBlocked: "لا يمكن إرسال رسائل جديدة بعد انتهاء الجلسة.",
      composerPlaceholder: "اكتب رسالة واضحة ومختصرة",
      send: "إرسال",
      activeSessionStripLabel: "الجلسة الأهم الآن",
      activeSessionStripAction: "استئناف",
      localReadHint: "تم تحسين مؤشر القراءة محليًا لهذه الجلسة.",
      supportHeading: "محادثة الدعم",
      supportNote: "اقرأ ورد مباشرة من داخل اللوحة.",
      supportCreateHeading: "ابدأ رسالة جديدة للدعم",
      supportCreateNote: "اكتب عنوانًا واضحًا ثم تفاصيل رسالتك.",
      supportCreateSubject: "عنوان الرسالة",
      supportCreateMessage: "اكتب تفاصيل المشكلة أو الطلب",
      supportCreateAction: "بدء المحادثة",
      supportCreating: "جارٍ الإنشاء...",
      supportOpenFull: "فتح محادثة الدعم الكاملة (اختياري)",
      practitionerHeading: "رسائل المعالج",
      practitionerNote: "استكمل التواصل مع المعالج من داخل اللوحة.",
      practitionerPendingNote: "الطلب قيد المراجعة وسيظهر هنا بعد التفعيل.",
      practitionerOpenFull: "فتح المحادثة الكاملة (اختياري)",
      sessionOpenFull: "فتح محادثة الجلسة الكاملة (اختياري)",
      priorityBadge: "مهم",
    };
  }

  return {
    title: "Messages",
    subtitle: "Fast and clear messaging without leaving your page",
    lanes: {
      session: "Session Chat",
      practitioner: "Practitioner Messages",
      support: "Support",
    },
    laneNotes: {
      session: "Live and ready sessions are prioritized here.",
      practitioner: "Continue care communication with your practitioner.",
      support: "Contact support directly from this docked panel.",
    },
    openAll: "View all messages",
    empty: "No conversations in this lane right now.",
    loading: "Loading conversations...",
    error: "Could not load this lane right now.",
    retry: "Retry",
    minimize: "Minimize",
    restore: "Restore",
    close: "Close",
    notAvailable: "Not available in this area right now.",
    adminSessionHint: "Track sessions from the sessions management page.",
    sessionProminentBanner: "Session chat is top priority now",
    sessionLiveBanner: "A session is live now",
    sessionReadyBanner: "A session is ready to join",
    threadHeading: "Session conversation",
    threadHint: "This is your primary daily conversation surface.",
    sessionReadOnlyHint: "This session chat is read-only now.",
    sessionReadOnlyReview: "You can review session messages after the session ends.",
    sessionReadOnlySendBlocked: "New messages cannot be sent after the session ends.",
    composerPlaceholder: "Write a short, clear message",
    send: "Send",
    activeSessionStripLabel: "Most relevant session now",
    activeSessionStripAction: "Resume",
    localReadHint: "Read-state was refined locally for this app usage.",
    supportHeading: "Support conversation",
    supportNote: "Read and reply directly inside the shell.",
    supportCreateHeading: "Start a new support message",
    supportCreateNote: "Write a clear subject and your message.",
    supportCreateSubject: "Subject",
    supportCreateMessage: "Describe your issue or request",
    supportCreateAction: "Start conversation",
    supportCreating: "Creating...",
    supportOpenFull: "Open full support view (optional)",
    practitionerHeading: "Practitioner messages",
    practitionerNote: "Continue practitioner communication from this panel.",
    practitionerPendingNote: "Request is pending and appears here after activation.",
    practitionerOpenFull: "Open full conversation (optional)",
    sessionOpenFull: "Open full session chat (optional)",
    priorityBadge: "Priority",
  };
}

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
  const pathname = usePathname();
  const isRtl = locale.startsWith("ar");
  const copy = useMemo(() => getCopy(locale), [locale]);
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
  const [activeLane, setActiveLane] = useState<UnifiedMessagingLane>("session");
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
        setActiveLane(snapshot.activeLane);
        setSelectedSessionId(snapshot.selectedSessionId);
        setSelectedSupportTicketId(snapshot.selectedSupportTicketId);
        setSelectedPractitionerRequestId(snapshot.selectedPractitionerRequestId);
        setLocalSessionReads(snapshot.localSessionReads ?? {});
      }
      setContinuityReady(true);
    });
  }, [continuityStorageKey]);

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
        className={`absolute w-[min(96vw,460px)] transition-all duration-200 ${
          isPanelVisible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        } ${
          showFloatingTrigger
            ? `bottom-[72px] ${isRtl ? "left-0 origin-bottom-left" : "right-0 origin-bottom-right"}`
            : `top-0 ${isRtl ? "left-0 origin-top-left" : "right-0 origin-top-right"}`
        }`}
      >
        <section className="flex h-[min(84vh,780px)] max-h-[calc(100vh-92px)] flex-col overflow-hidden rounded-[26px] border border-border-strong/70 bg-surface-primary shadow-[0_44px_96px_-42px_rgba(34,52,56,0.36)] dark:border-white/12 dark:bg-surface-secondary">
          <header className="border-b border-border-light/70 bg-gradient-to-b from-primary-light via-primary-light-hover to-white px-4 py-2.5 dark:border-white/10 dark:from-primary/35 dark:via-primary/15 dark:to-transparent">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-text-primary dark:text-white/95">
                  {copy.title}
                </h2>
                <p className="text-xs text-text-secondary dark:text-white/65">{copy.subtitle}</p>
              </div>
              <div className="flex items-center gap-1">
                {showFloatingTrigger ? (
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-light text-text-secondary transition hover:bg-white hover:text-text-primary dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={copy.minimize}
                    title={copy.minimize}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleClosePanel}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-light text-text-secondary transition hover:bg-white hover:text-text-primary dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label={copy.close}
                  title={copy.close}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {role !== "admin" && activePrioritySessionItem ? (
              <div className="mt-2 rounded-xl border border-primary/35 bg-gradient-to-r from-primary-light-hover to-primary-light px-3 py-2 shadow-[0_12px_28px_-24px_rgba(68,161,148,0.42)] dark:border-primary/35 dark:from-primary/25 dark:to-primary/8">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted dark:text-white/55">
                    {copy.activeSessionStripLabel}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveLane("session");
                      setSelectedSessionId(activePrioritySessionItem.id);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    {copy.activeSessionStripAction}
                  </button>
                </div>
                <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                  {activePrioritySessionItem.title}
                </p>
                <p className="mt-1 truncate text-xs text-text-secondary dark:text-white/70">
                  {activePrioritySessionItem.status ?? activePrioritySessionItem.note}
                </p>
              </div>
            ) : null}

            {activeLane === "session" && sessionLanePriority ? (
              <div className="mt-2 rounded-xl border border-primary/35 bg-gradient-to-r from-primary/22 to-primary/10 px-3 py-2 text-xs text-primary dark:border-primary/40 dark:from-primary/24 dark:to-primary/10 dark:text-primary-light">
                <p className="font-semibold">{copy.sessionProminentBanner}</p>
                {sessionBannerText ? <p className="mt-1">{sessionBannerText}</p> : null}
              </div>
            ) : null}
          </header>

          <div className="border-b border-border-light/70 p-1.5 dark:border-white/10">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-50 p-1 ring-1 ring-border-light/85 dark:bg-white/5 dark:ring-white/10">
              {(Object.keys(laneMeta) as UnifiedMessagingLane[]).map((lane) => {
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
                    className={`relative inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "bg-gradient-to-br from-primary to-primary-active text-white shadow-[0_10px_20px_-12px_rgba(68,161,148,0.62)]"
                        : "text-text-secondary hover:bg-white hover:text-text-primary dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                    }`}
                  >
                    {laneMeta[lane].icon}
                    <span className="truncate">{copy.lanes[lane]}</span>
                    {laneCount > 0 ? (
                      <span className="inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                        {laneCount > 9 ? "9+" : laneCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative border-b border-border-light/70 bg-gradient-to-b from-white to-primary-light/60 p-2 dark:border-white/10 dark:from-transparent dark:to-transparent">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border-light/80 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-white/5">
              <p className="truncate text-xs text-text-secondary dark:text-white/65">
                {copy.laneNotes[activeLane]}
              </p>
              <button
                ref={historyButtonRef}
                type="button"
                onClick={() => setIsHistoryOpen((previous) => !previous)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border-light bg-surface-primary px-2.5 py-1.5 text-[11px] font-semibold text-text-primary transition hover:border-primary/35 hover:text-primary dark:border-white/12 dark:bg-surface-secondary dark:text-white/90"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {activeLaneItems.length}
              </button>
            </div>

            {isHistoryOpen ? (
              <div
                ref={historyPopupRef}
                className={`absolute top-[calc(100%+8px)] z-30 max-h-[40vh] w-[min(94vw,420px)] overflow-hidden rounded-2xl border border-border-strong/70 bg-surface-primary shadow-[0_24px_54px_-26px_rgba(34,52,56,0.34)] dark:border-white/12 dark:bg-surface-secondary ${
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

          <main className="min-h-0 flex-1 overflow-hidden bg-gradient-to-b from-white via-primary-light/70 to-primary-light/45 p-2 dark:from-transparent dark:to-transparent">
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

          <div className="border-t border-border-light/70 px-3 py-1.5 dark:border-white/10">
            <Link
              href={footerHref as never}
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {copy.openAll}
              <ChevronUp className="h-3.5 w-3.5 rtl:rotate-180" />
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
