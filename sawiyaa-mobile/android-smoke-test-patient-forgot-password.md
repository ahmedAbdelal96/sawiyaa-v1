# Patient Forgot Password - Manual Android Smoke Test Plan

## Test Environment Setup

- Android Emulator or Device with Sawiyaa Mobile App installed
- Backend running at http://localhost:3000 (or remote API URL)
- Test patient account: patient@test.com / password: TestPass123

## Test Cases

### TC-1: Request Password Reset (Happy Path)

**Steps:**

1. Open app, go to patient sign-in screen
2. Tap "Forgot your password?" link
3. Enter valid patient email: patient@test.com
4. Tap "Send reset code" button
5. Observe response

**Expected Results:**

- Button disabled while submitting
- Success message shown: "localized auth.success.patientPasswordResetRequested"
- Code input field appears
- New password field appears
- "Back to sign in" link available

**Actual Results:**
[Screenshot placeholder for success flow]

---

### TC-2: Submit Invalid OTP Code

**Steps:**

1. From TC-1 success state
2. Enter invalid code: 111111
3. Tap "Set new password" button
4. Observe error response

**Expected Results:**

- Error message shown
- Error code: OTP_CODE_INVALID or OTP_CHALLENGE_INVALID
- User stays on reset form
- Can retry with correct code

**Actual Results:**
[Screenshot placeholder for error handling]

---

### TC-3: Submit Valid OTP and Reset Password (requires manual OTP from backend logs)

**Steps:**

1. From TC-1, check backend logs for generated OTP code
2. Enter correct 6-digit code from logs
3. Enter new password: NewPass123456
4. Tap "Set new password" button
5. Observe response

**Expected Results:**

- Success message: "localized auth.success.patientPasswordResetCompleted"
- Automatically redirected to patient sign-in screen
- Old password no longer works for login
- New password logs in successfully

**Actual Results:**
[Screenshot placeholder for successful reset]

---

### TC-4: Expired/Consumed OTP Code

**Steps:**

1. Wait >15 minutes after requesting code (OTP TTL)
2. Or enter code twice (first attempt consumes it)
3. Enter expired/consumed code
4. Tap "Set new password"
5. Observe error

**Expected Results:**

- Error message shown
- Error code: OTP_CHALLENGE_INVALID
- Message indicates challenge expired/invalid
- User can request new code

**Actual Results:**
[Screenshot placeholder for expired OTP handling]

---

### TC-5: Non-existent Email Anti-enumeration

**Steps:**

1. Go to forgot password screen
2. Enter non-existent email: fakeemail@notreal.com
3. Tap "Send reset code"
4. Observe response

**Expected Results:**

- Same generic success message as TC-1
- No indication whether email exists or not
- No OTP actually sent (backend skips delivery)

**Actual Results:**
[Screenshot placeholder for anti-enumeration response]

---

### TC-6: Sessions Invalidated After Reset

**Steps:**

1. In Terminal 1: Patient signs in, gets access/refresh tokens
2. In Terminal 2: Patient resets password (TC-3 flow)
3. In Terminal 1: Patient tries to use old access token (refresh, check /auth/me)
4. Observe token rejection

**Expected Results:**

- Old tokens return 401 Unauthorized
- tokenVersion incremented on user record
- All active sessions revoked
- Patient must log in again with new password

**Actual Results:**
[Screenshot placeholder for token invalidation verification]

---

### TC-7: Practitioner Flow Unaffected

**Steps:**

1. Go to practitioner sign-in screen
2. Tap "Forgot your password?" link
3. Enter practitioner email
4. Proceed through OTP flow
5. Reset password

**Expected Results:**

- Practitioner forgot-password still works
- No changes to existing practitioner flow
- Same OTP/reset mechanism as before
- No regressions

**Actual Results:**
[Screenshot placeholder for practitioner flow]

---

### TC-8: UI/UX Verification

**Steps:**

1. Open patient sign-in screen
2. Tap "Forgot your password?" link
3. Review all text and labels
4. Check RTL (if locale is Arabic)
5. Verify button states and disabled state
6. Check error message styling
7. Verify success message styling

**Expected Results:**

- All text in correct locale (English or Arabic as selected)
- No "contract-blocked" messages
- Buttons properly styled and accessible
- RTL layout correct for Arabic
- Error messages have error styling (red background)
- Success messages have success styling (green background)
- No typos or placeholder text

**Actual Results:**
[Screenshot placeholder for UI/UX review]

---

### TC-9: Rate Limiting - Forgot Password

**Steps:**

1. Tap "Send reset code" 5+ times rapidly for same email
2. Observe throttle response

**Expected Results:**

- First 5 requests succeed (within 1-hour window policy)
- 6th request returns 429 Too Many Requests
- Retry-After header present
- Generic error message (no enumeration leak)

**Actual Results:**
[Screenshot placeholder for rate limiting test]

---

### TC-10: Rate Limiting - Resend Cooldown

**Steps:**

1. Tap "Send reset code" once
2. Immediately tap again
3. Observe error

**Expected Results:**

- Second immediate request returns OTP_RESEND_COOLDOWN error
- Message: "Please wait before requesting another code"
- Wait 30+ seconds, then can request again

**Actual Results:**
[Screenshot placeholder for resend cooldown]

---

## Summary

| Test Case                     | Status    | Notes |
| ----------------------------- | --------- | ----- |
| TC-1: Happy Path              | PASS/FAIL |       |
| TC-2: Invalid OTP             | PASS/FAIL |       |
| TC-3: Valid OTP + Reset       | PASS/FAIL |       |
| TC-4: Expired OTP             | PASS/FAIL |       |
| TC-5: Non-existent Email      | PASS/FAIL |       |
| TC-6: Sessions Invalidated    | PASS/FAIL |       |
| TC-7: Practitioner Unaffected | PASS/FAIL |       |
| TC-8: UI/UX Correct           | PASS/FAIL |       |
| TC-9: Throttle Limit          | PASS/FAIL |       |
| TC-10: Resend Cooldown        | PASS/FAIL |       |

## Test Execution Notes

- Date: [Date of test run]
- Tester: [Name/ID]
- Environment: Android Emulator / Device (specify)
- Backend URL: [URL]
- App Version: [Version]
- Issues Found: [List any failures]

## Sign-off

All smoke tests passed: YES / NO

Test completed by: ********\_******** Date: ****\_****

