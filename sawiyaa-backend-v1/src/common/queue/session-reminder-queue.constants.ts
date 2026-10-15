export const SESSION_REMINDER_EXECUTION_QUEUE_NAME =
  'session-reminder-execution';
export const SESSION_REMINDER_EXECUTION_JOB_NAME = 'session-reminder-execution';

export type SessionReminderExecutionJobData = {
  reminderId: string;
  scheduleRevision: number;
};

export function sessionReminderExecutionJobId(input: {
  reminderId: string;
  scheduleRevision: number;
}): string {
  return `session-reminder-${input.reminderId}-r${input.scheduleRevision}`;
}
