# Patient Hosted Checkout Real-Device Validation Checklist

Status: Pending manual execution on physical devices.
Scope: Patient mobile payment flow only.
Out of scope: Practitioner payment, push/device registration, patient forgot/reset password, Stripe native mobile SDK flow.

## Preconditions

- Backend and payment provider environments are configured for hosted checkout.
- Mobile app build uses app scheme `fayed://`.
- Test patient account has at least one `PENDING_PAYMENT` session.
- Test data includes at least one payable session that supports hosted checkout.

## Device Matrix

- [ ] iOS physical device
- [ ] Android physical device

## Manual Setup Steps

- [ ] Open the app on a physical device with a signed-in patient account.
- [ ] Open a real `PENDING_PAYMENT` patient session from the sessions list or session detail.
- [ ] Start checkout from the in-app payment screen, not from a mocked or manually typed deep link.
- [ ] Confirm the hosted checkout opens outside the app and that the app can receive the `fayed://` return.

## Core Scenarios

- [ ] Successful hosted checkout
  - Manual step: Complete payment in the hosted checkout and allow redirect back to the app.
  - Expected: Return screen shows verifying or confirmed state.
  - Expected: Session transitions out of `PENDING_PAYMENT` only after backend confirms.
  - Expected: App navigates to session detail when confirmed.

- [ ] Cancelled checkout
  - Manual step: Back out of hosted checkout or cancel before confirmation.
  - Expected: Return screen shows canceled state.
  - Expected: Clear next actions: retry payment or view session/list.

- [ ] Failed payment
  - Manual step: Use provider-supported failure conditions in sandbox or a controlled failure case.
  - Expected: Return screen shows failed state.
  - Expected: Retry payment action is available.

- [ ] Pending payment
  - Manual step: Use a provider path that returns success while backend confirmation is delayed.
  - Expected: Return screen uses honest pending/verifying messaging.
  - Expected: Polling stops automatically after timeout (no endless polling).

## Resilience Scenarios

- [ ] App killed during checkout, then reopened
  - Manual step: Force close the app before redirect completes, then reopen from the app icon and revisit the session.
  - Expected: Reopened app can recover by visiting session and return flow without false success.

- [ ] Slow network after return
  - Manual step: Throttle or simulate slow network before the app regains focus after checkout.
  - Expected: Retry path works and UI remains stable.
  - Expected: No fake success state is shown before backend confirmation.

- [ ] Invalid or missing redirect params
  - Manual step: Open the return route with missing or partial params during QA validation.
  - Expected: Return screen handles safely with clear next actions.
  - Expected: No crash and no technical enum leakage.

## UX and Localization

- [ ] Arabic RTL rendering in checkout and payment-return screens
  - Manual step: Repeat success, cancel, and pending scenarios with Arabic locale enabled.
  - Expected: Readable Arabic copy, correct alignment, comfortable spacing.
  - Expected: Touch targets remain comfortable and content does not hug screen edges.

- [ ] Session state after confirmed payment
  - Manual step: After confirmed payment, open session detail and sessions list to verify final navigation and state.
  - Expected: Patient can reach session detail or sessions list from return flow.

## Evidence Capture (Manual)

- [ ] Screenshots or recordings for each scenario above.
- [ ] Notes per scenario: device, OS, build version, result, and any issue IDs.

## Sign-Off

- Manual validation was not executed in this coding session.
- This checklist must be run by QA or product engineering on physical devices before production sign-off.
