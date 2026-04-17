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
};

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    id: 1,
    icon: Search,
    iconBg: "bg-primary-light",
    iconColor: "text-primary",
  },
  {
    id: 2,
    icon: CalendarCheck,
    iconBg: "bg-secondary/20",
    iconColor: "text-text-primary",
    offset: true,
  },
  {
    id: 3,
    icon: Video,
    iconBg: "bg-accent/20",
    iconColor: "text-accent",
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
  { id: "privacy", icon: Lock, iconColor: "text-primary", bgColor: "bg-primary/10" },
  { id: "certified", icon: BadgeCheck, iconColor: "text-secondary", bgColor: "bg-secondary/15" },
  { id: "flexible", icon: Clock, iconColor: "text-accent", bgColor: "bg-accent/15" },
  { id: "arabic", icon: Globe2, iconColor: "text-primary", bgColor: "bg-surface-tertiary" },
];


