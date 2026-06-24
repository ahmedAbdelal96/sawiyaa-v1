export const patientJourneyQueryKeys = {
  all: ["patient-journey"] as const,
  me: () => [...patientJourneyQueryKeys.all, "me"] as const,
};
