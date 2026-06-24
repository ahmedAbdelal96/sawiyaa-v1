export const enAuthCatalog = {
  success: {
    patientGoogleAuthenticated:
      'Patient authenticated with Google successfully',
    patientRegistered: 'Patient account created successfully',
    patientLoggedIn: 'Patient logged in successfully',
    patientTokensRefreshed: 'Patient session refreshed successfully',
    patientLoggedOut: 'Patient session logged out successfully',
    practitionerRegistered: 'Practitioner account created successfully',
    practitionerOtpSent:
      'A practitioner login OTP has been sent to the verified channel',
    practitionerOtpVerified: 'Practitioner login verified successfully',
    practitionerTokensRefreshed: 'Practitioner session refreshed successfully',
    practitionerLoggedOut: 'Practitioner session logged out successfully',
    practitionerPasswordResetRequested: 'Password reset code has been sent',
    practitionerPasswordResetOtpVerified:
      'Code verified successfully. You can now set a new password',
    practitionerPasswordResetCompleted: 'Password has been reset successfully',
    patientPasswordResetRequested: 'Password reset code has been sent',
    patientPasswordResetOtpVerified:
      'Code verified successfully. You can now set a new password',
    patientPasswordResetCompleted: 'Password has been reset successfully',
    adminLoggedIn: 'Admin logged in successfully',
    adminTokensRefreshed: 'Admin session refreshed successfully',
    adminLoggedOut: 'Admin session logged out successfully',
    adminStepUpVerified: 'Step-up verification completed successfully',
  },
  notifications: {
    practitionerLoginOtpTitle: 'Practitioner login OTP',
    practitionerLoginOtpBody: 'Your practitioner login OTP is {{code}}',
    passwordResetTitle: 'Password reset code',
    passwordResetBody: 'Your password reset code is {{code}}',
  },
  errors: {
    invalidCredentials: 'Invalid email or password',
    accountNotActive: 'Account is not active',
    emailAlreadyRegistered: 'An account already exists for this email',
    patientRoleRequired:
      'This account is not registered for patient authentication',
    googleNonPatientLinked:
      'This Google account is linked to a non-patient auth flow',
    emailLinkedToAnotherFlow:
      'This email is already linked to a non-patient account',
    practitionerRoleRequired: 'Practitioner role is required for this flow',
    adminRoleRequired: 'Admin role is required for this route',
    verifiedOtpChannelRequired:
      'A verified OTP channel is required for practitioner authentication',
    otpChallengeInvalid: 'OTP challenge is invalid or expired',
    otpCodeInvalid: 'OTP code is invalid',
    otpDeliveryFailed: 'OTP delivery failed. Please try again shortly',
    otpResendTooSoon: 'Please wait before requesting another OTP',
    notificationTypeMissing: 'Notification type is not configured',
    passwordResetPractitionerOnly:
      'This email is registered as a patient account. Use patient password recovery.',
    passwordResetPatientOnly:
      'This email is registered as a practitioner account. Use practitioner password recovery.',
    passwordResetAccountNotFound: 'No account was found for this email.',
    passwordResetTokenInvalid: 'Password reset token is invalid or expired',
    invalidRegistrationCountryCode:
      'Country code is invalid for practitioner registration',
    invalidRegistrationSpecialtyCategoryId:
      'Primary specialty category is invalid for practitioner registration',
    invalidRegistrationSpecialtyIds:
      'One or more specialty ids are invalid for practitioner registration',
    invalidRegistrationSpecialtiesForCategory:
      'Selected specialties do not belong to the selected primary category',
    refreshTokenRequired: 'Refresh token is required',
    googleAuthNotConfigured: 'Google authentication is not configured',
    googleIdentityInvalid:
      'Google token payload is missing required identity claims',
    authSessionInvalid: 'Auth session is invalid or revoked',
    authSessionExpired: 'Refresh session has expired',
    refreshTokenMismatch: 'Refresh token does not match the active session',
    authFlowRoleMismatch:
      'Refresh token role does not match this authentication flow',
    authRoleRevoked: 'Authenticated user no longer has access to this flow',
    tokenVersionInvalid: 'Token version is no longer valid for this user',
    jwtTokenTypeInvalid: 'JWT token type is invalid for this route',
    accessTokenRequired: 'An access token is required for this route',
    refreshTokenTypeRequired: 'A refresh token is required for this route',
    authenticationRequired: 'Authentication is required for this route',
    csrfTokenRequired:
      'A CSRF token is required for this cookie-authenticated request',
    stepUpRequired: 'Step-up verification is required for this action',
  },
};
