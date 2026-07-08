export const enAcademyCatalog = {
  academyProgram: {
    errors: {
      notFound: 'Academy program was not found',
      registrationClosed: 'Academy program registration is closed',
      seatCapacityReached: 'Academy program seat capacity has been reached',
      missingPricing: 'Academy program pricing is missing',
      unsupportedCurrency:
        'Academy program currency is not supported by routing policy',
      enrollmentNotFound: 'Academy program enrollment was not found',
      learnersRestricted:
        'Academy program enrollment is available only to patients and practitioners',
      learnerContactAlreadyExists:
        'This phone number, WhatsApp number, or email is already linked to another learner',
      enrollmentAlreadyExists:
        'Enrollment already exists for this academy program and learner',
      invalidPrice: 'Academy program price is invalid',
      invalidDate: 'Academy program date is invalid',
      invalidWindow: 'Academy program date window is invalid',
      missingSlugSource: 'Academy program slug source is missing',
      categoryNotFound: 'Academy program category was not found',
      archivedProgramCannotBePublished:
        'Archived academy program cannot be published',
      archivedReadOnly: 'Archived academy program cannot be edited',
      sessionNotFound: 'Academy program session was not found',
      attendanceInvalidStatus: 'Academy program attendance status is invalid',
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
