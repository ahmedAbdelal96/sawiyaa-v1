import {
  Search,
  CalendarCheck,
  Video,
  Lock,
  BadgeCheck,
  Clock,
  Globe2,
  Brain,
  Frown,
  Heart,
  Stethoscope,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type HowItWorksStep = {
  id: number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  offset?: boolean;
};

export type Specialty = {
  id: string;
  icon: LucideIcon;
};

export type Practitioner = {
  id: string;
  initials: string;
  rating: number;
  sessions: number;
};

export type Article = {
  id: string;
};

export type WhyFeature = {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  ringColor: string;
};

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    id: 1,
    icon: Search,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
  },
  {
    id: 2,
    icon: CalendarCheck,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    offset: true,
  },
  {
    id: 3,
    icon: Video,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
];

export const SPECIALTIES: Specialty[] = [
  { id: "anxiety", icon: Brain },
  { id: "depression", icon: Frown },
  { id: "relationships", icon: Heart },
  { id: "psychiatry", icon: Stethoscope },
];

export const FEATURED_PRACTITIONERS: Practitioner[] = [
  {
    id: "sara",
    initials: "سأ",
    rating: 4.9,
    sessions: 142,
  },
  {
    id: "faisal",
    initials: "فع",
    rating: 4.8,
    sessions: 98,
  },
  {
    id: "noura",
    initials: "نخ",
    rating: 5.0,
    sessions: 217,
  },
];

export const ARTICLES: Article[] = [
  { id: "article1" },
  { id: "article2" },
  { id: "article3" },
];

export const WHY_FEATURES: WhyFeature[] = [
  { id: "privacy", icon: Lock, iconColor: "text-emerald-600", bgColor: "bg-emerald-50", ringColor: "ring-emerald-200" },
  { id: "certified", icon: BadgeCheck, iconColor: "text-sky-600", bgColor: "bg-sky-50", ringColor: "ring-sky-200" },
  { id: "flexible", icon: Clock, iconColor: "text-indigo-600", bgColor: "bg-indigo-50", ringColor: "ring-indigo-200" },
  { id: "arabic", icon: Globe2, iconColor: "text-amber-600", bgColor: "bg-amber-50", ringColor: "ring-amber-200" },
];

/** Semantic icon color tokens for homepage components */
export const SEMANTIC_ICONS = {
  /** Guided care / matching — emerald/sage */
  guided: {
    bg: "bg-emerald-50",
    icon: "text-emerald-600",
    ring: "ring-emerald-200",
  },
  /** Booking / payment — sky blue */
  booking: {
    bg: "bg-sky-50",
    icon: "text-sky-600",
    ring: "ring-sky-200",
  },
  /** Sessions / video / care flow — indigo */
  session: {
    bg: "bg-indigo-50",
    icon: "text-indigo-600",
    ring: "ring-indigo-200",
  },
  /** Support / help / reassurance — amber/warm */
  support: {
    bg: "bg-amber-50",
    icon: "text-amber-600",
    ring: "ring-amber-200",
  },
  /** Trust / verified / privacy — teal */
  trust: {
    bg: "bg-teal-50",
    icon: "text-teal-600",
    ring: "ring-teal-200",
  },
  /** Content / academy — violet */
  content: {
    bg: "bg-violet-50",
    icon: "text-violet-600",
    ring: "ring-violet-200",
  },
} as const;

export type SemanticIconKey = keyof typeof SEMANTIC_ICONS;