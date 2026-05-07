import { CourseStatus, CourseVisibility } from '@prisma/client';

export const ACADEMY_DEFAULT_PAGE = 1;
export const ACADEMY_DEFAULT_LIMIT = 12;
export const ACADEMY_ADMIN_DEFAULT_LIMIT = 20;

export const ACADEMY_PUBLIC_LIST_VISIBILITIES: CourseVisibility[] = [
  CourseVisibility.PUBLIC,
];

export const ACADEMY_PUBLIC_DETAIL_VISIBILITIES: CourseVisibility[] = [
  CourseVisibility.PUBLIC,
];

export const ACADEMY_PUBLIC_COURSE_STATUSES: CourseStatus[] = [
  CourseStatus.PUBLISHED,
];

export type AcademyCourseStats = {
  totalEnrollments: number;
  pendingPayments: number;
  paidEnrollments: number;
  failedPayments: number;
  confirmedEnrollments: number;
};

export type AcademyLearnerInput = {
  fullName: string;
  phoneNumber: string;
  whatsappNumber?: string | null;
  email?: string | null;
  countryCode?: string | null;
  countryCodeDeclared?: string | null;
  countryCodeSource?: string | null;
  countryCodeMismatch?: boolean;
  sourceLabel?: string | null;
};
