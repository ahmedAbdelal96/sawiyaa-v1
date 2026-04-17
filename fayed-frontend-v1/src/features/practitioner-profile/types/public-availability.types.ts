/**
 * Frontend types for the public practitioner availability viewer.
 * Derived from backend PublicPractitionerAvailabilityWindowsDataResponseDto.
 */

export type PublicAvailabilityWindow = {
  /** UTC ISO 8601 string — inclusive start of the available window */
  startsAt: string;
  /** UTC ISO 8601 string — exclusive end of the available window */
  endsAt: string;
};

export type PublicAvailabilityWindowsData = {
  /** IANA timezone of the practitioner (informational — display is in user's local time) */
  timezone: string;
  /** Echoed back range from the request */
  range: {
    from: string;
    to: string;
  };
  /** Computed available windows for the requested range */
  windows: PublicAvailabilityWindow[];
};
