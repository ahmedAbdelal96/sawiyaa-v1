export const OPERATIONS_QUEUE_NAME = 'operations';
export const DAILY_ATTENDANCE_RECONCILIATION_JOB_NAME =
  'daily-attendance-reconciliation';

export type DailyAttendanceReconciliationJobData = {
  sessionId: string;
  observationVersion: number;
};

export type DailyAttendanceQueuePublishResult =
  | {
      enqueued: true;
      sessionId: string;
      observationVersion: number;
      jobId: string;
    }
  | {
      enqueued: false;
      sessionId: string;
      observationVersion: number;
      reason: 'QUEUE_DISABLED' | 'ENQUEUE_FAILED';
    };

export function dailyAttendanceReconciliationJobId(input: {
  sessionId: string;
  observationVersion: number;
}): string {
  return `daily-attendance-${input.sessionId}-${input.observationVersion}`;
}
