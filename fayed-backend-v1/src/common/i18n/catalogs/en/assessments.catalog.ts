export const enAssessmentsCatalog = {
  success: {
    listed: 'Assessments retrieved successfully',
    details: 'Assessment definition retrieved successfully',
    submitted: 'Assessment submitted successfully',
    history: 'Patient assessment history retrieved successfully',
    submissionDetails: 'Assessment submission details retrieved successfully',
  },
  errors: {
    definitionNotFound: 'Assessment definition was not found',
    patientProfileNotFound: 'Patient profile is required for assessments',
    submissionNotFound: 'Assessment submission was not found',
    assessmentSubmissionForbidden:
      'You cannot access this assessment submission',
    incompleteSubmissionNotSupported:
      'In-progress assessment submissions are not supported in this version',
    answersRequired: 'At least one answer is required',
    duplicateQuestionAnswer:
      'Each question can be answered only once in a single submission',
    invalidQuestionKey: 'One or more question keys are invalid',
    invalidOptionKey:
      'One or more option keys are invalid for selected questions',
    requiredQuestionsMissing: 'All required questions must be answered',
  },
};
