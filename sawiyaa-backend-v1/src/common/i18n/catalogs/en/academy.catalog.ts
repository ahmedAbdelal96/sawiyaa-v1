export const enAcademyCatalog = {
  academyProgram: {
    errors: {
      notFound: 'Training program was not found',
      registrationClosed: 'Training program registration is closed',
      seatCapacityReached: 'The training program target trainee count has been reached',
      missingPricing: 'Training program pricing is missing',
      unsupportedCurrency:
        'Training program currency is not supported by routing policy',
      enrollmentNotFound: 'Training program enrollment was not found',
      learnersRestricted:
        'Training enrollment is available only to patients and practitioners',
      learnerContactAlreadyExists:
        'This phone number, WhatsApp number, or email is already linked to another trainee',
      enrollmentAlreadyExists:
        'Enrollment already exists for this training program and trainee',
      enrollmentCancellationReasonRequired:
        'A reason is required when cancelling a training enrollment',
      invalidPrice: 'Training program price is invalid',
      invalidDate: 'Training program date is invalid',
      invalidWindow: 'Training program date window is invalid',
      missingSlugSource: 'Training program slug source is missing',
      categoryNotFound: 'Training program category was not found',
      archivedProgramCannotBePublished:
        'Archived training program cannot be published',
      archivedReadOnly: 'Archived training program cannot be edited',
      archiveReasonRequired: 'A reason is required before archiving a training program',
      sessionNotFound: 'Training session was not found',
      attendanceInvalidStatus: 'Training attendance status is invalid',
      attendanceCorrectionReasonRequired:
        'A reason is required when correcting attendance',
      certificateFileRequired:
        'Please choose a certificate PDF before uploading',
      certificateInvalidType: 'Only PDF certificate files are allowed',
      certificateFileTooLarge:
        'Certificate file is too large. Maximum size is 10MB',
      certificateEnrollmentNotEligible:
        'Certificate can only be uploaded for a confirmed enrollment',
      certificateNotFound: 'Certificate file was not found',
      coverFileRequired: 'Please choose a cover image before uploading',
      coverInvalidType: 'Only JPG, PNG, or WebP cover images are allowed',
      coverFileTooLarge: 'Cover image file is too large. Maximum size is 10MB',
    },
  },
  errors: {
    notFound: 'Training course was not found',
    archivedReadOnly: 'Archived training course cannot be edited',
    missingLectureSchedule:
      'Training course requires a lecture schedule before publishing',
    invalidPlanWindow: 'Training program window is invalid',
    invalidLectureWindow: 'Lecture time window is invalid',
    missingLecturePlan: 'Lecture plan is required',
    lectureLimitReached: 'Lecture limit has been reached',
    lectureOverlap: 'Lecture time overlaps with another lecture',
    lectureOrderTaken: 'Lecture order is already used',
    missingPlan: 'Training program is required',
    invalidDuration: 'Training duration is invalid',
    invalidLectureCount: 'Training lecture count is invalid',
    missingPricing: 'Training pricing is missing',
    unsupportedCurrency: 'Training currency is not supported by routing policy',
    enrollmentNotFound: 'Enrollment was not found',
    learnersRestricted:
      'Training enrollment is available only to patients and practitioners',
    learnerContactAlreadyExists:
      'This phone number, WhatsApp number, or email is already linked to another trainee',
    enrollmentAlreadyExists:
      'Enrollment already exists for this course and trainee',
    legacyEnrollmentDisabled: 'Legacy training enrollment is disabled',
  },
  notifications: {
    enrollmentConfirmedTitle: 'Training enrollment confirmed',
    enrollmentConfirmedBody:
      'Your training enrollment is confirmed for {sessionAt}.',
    scheduleReminderTitle: 'Training starts soon',
    scheduleReminderBody: 'Reminder: your training session starts at {sessionAt}.',
    targetLearnerThresholdExceededTitle: 'Training target trainees exceeded',
    targetLearnerThresholdExceededBody:
      'The trainee count for {programTitle} has exceeded its target of {targetLearnerCount}. Current active trainees: {activeLearnerCount}.',
  },
};
