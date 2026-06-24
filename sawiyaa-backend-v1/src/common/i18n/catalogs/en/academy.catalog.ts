export const enAcademyCatalog = {
  errors: {
    notFound: 'Academy course was not found',
    archivedReadOnly: 'Archived academy course cannot be edited',
    missingLectureSchedule:
      'Academy course requires a lecture schedule before publishing',
    invalidPlanWindow: 'Academy plan window is invalid',
    invalidLectureWindow: 'Lecture time window is invalid',
    missingLecturePlan: 'Lecture plan is required',
    lectureLimitReached: 'Lecture limit has been reached',
    lectureOverlap: 'Lecture time overlaps with another lecture',
    lectureOrderTaken: 'Lecture order is already used',
    missingPlan: 'Academy plan is required',
    invalidDuration: 'Academy duration is invalid',
    invalidLectureCount: 'Academy lecture count is invalid',
    missingPricing: 'Academy pricing is missing',
    unsupportedCurrency: 'Academy currency is not supported by routing policy',
    enrollmentNotFound: 'Enrollment was not found',
    learnersRestricted:
      'Academy enrollment is available only to patients and practitioners',
    learnerContactAlreadyExists:
      'This phone number, WhatsApp number, or email is already linked to another learner',
    enrollmentAlreadyExists:
      'Enrollment already exists for this course and learner',
  },
  notifications: {
    enrollmentConfirmedTitle: 'Academy enrollment confirmed',
    enrollmentConfirmedBody:
      'Your academy enrollment is confirmed for {sessionAt}.',
    scheduleReminderTitle: 'Academy starts soon',
    scheduleReminderBody: 'Reminder: your academy session starts at {sessionAt}.',
  },
};
