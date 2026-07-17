# Sawiyaa Session Rating System

## 1. Overview

Sawiyaa has a post-session rating system that allows patients to rate completed therapy/consultation sessions.

The system is designed specifically for a healthcare and mental-health context, so it balances two goals:

1. Make it easy for patients to give quick feedback after a session.
2. Protect practitioners from unfair public rating damage caused by temporary emotional states, misunderstanding, or non-representative session feedback.

The rating system is not a generic public review system. It is a controlled session-feedback system with moderation rules.

---

## 2. Main Principles

The system follows these principles:

- A patient can rate only their own completed and paid session.
- A session can be rated only once.
- No default rating is ever created.
- If the patient skips or closes the popup, the session remains unrated.
- Unrated sessions do not affect the practitioner public rating.
- The original patient rating is always preserved internally.
- The public/display rating is stored separately.
- Public users do not see patient-written comments.
- Low ratings are reviewed by admin before they affect the practitioner’s public average.
- Admin can decide whether a low rating should be published, adjusted for public display, rejected, converted to internal feedback, or excluded from the average.

---

## 3. User Roles

### Patient

The patient can:

- Rate a completed paid session.
- Choose a star rating from 1 to 5.
- Add an optional private note.
- Submit the rating.
- Skip the rating for later.

The patient does not see internal moderation decisions.

### Admin

The admin can review low ratings and decide what happens to them publicly.

Admin can:

- Approve the rating as-is.
- Edit the public/display rating and approve it.
- Reject publishing the rating.
- Convert the rating into an internal note only.
- Exclude the rating from the practitioner public average.

The admin can see the original patient rating and the public/display rating separately.

### Public Visitor / Patient Browsing Practitioners

Public users can see:

- Practitioner average rating.
- Number of public-approved ratings.

Public users do not see:

- Patient-written comments.
- Original rating if admin adjusted it.
- Admin moderation reason.
- Moderator identity.
- Internal notes.

### Practitioner

Practitioners are affected only by public-approved, countable ratings.

Pending, rejected, internal-only, hidden, archived, or excluded ratings do not affect their public average.

---

## 4. When a Patient Can Rate a Session

A session is eligible for rating only if all conditions are true:

- The authenticated user is the patient who owns the session.
- The session is completed.
- The session payment is captured/paid.
- The session has not already been reviewed.
- The session is not cancelled.
- The session is not no-show.
- The session is not upcoming or in progress.

The backend is the source of truth for eligibility.

Web and mobile should not duplicate rating eligibility logic independently.

---

## 5. Post-Session Reminder Flow

After a session becomes completed and eligible for review, the patient should be reminded to rate it.

The reminder appears on:

- Web patient app.
- Mobile patient app.

The popup/modal is intentionally simple:

- Star rating from 1 to 5.
- Optional note.
- Submit button.
- Later button.

If the patient clicks “Later”, closes the popup, closes the app, or leaves the page:

- No review is created.
- No default rating is submitted.
- The session remains unrated.
- The session can appear again later as a pending review reminder.

The reminder dismissal is currently session-based on web/mobile, not a server-side permanent dismissal.

---

## 6. Pending Review Endpoint

The backend provides a patient reminder endpoint:

`GET /patients/me/reviews/pending`

This endpoint returns sessions that:

- Belong to the authenticated patient.
- Are completed.
- Are paid/captured.
- Have not already been reviewed.
- Are eligible for review.
- Should be shown as rating reminders.

The endpoint sorts pending sessions by most recent first.

Web and mobile use this same endpoint to decide whether to show the rating reminder.

---

## 7. Review Submission Behavior

The patient submits a review through the session review endpoint.

The patient submits:

- Star rating from 1 to 5.
- Optional note/comment.

The backend then applies the publication policy.

---

## 8. Publication Policy

### 4 or 5 Stars

If the patient submits 4 or 5 stars:

- The review is automatically published.
- The review counts in the practitioner public average.
- The public/display rating is set to the submitted rating.
- The moderation decision is marked as auto-approved positive.
- The review does not need admin moderation.

Patient-written text is not shown publicly.

### 1, 2, or 3 Stars

If the patient submits 1, 2, or 3 stars:

- The review remains pending moderation.
- It does not count in the practitioner public average.
- It is not shown publicly.
- Admin must review it before it can affect public ratings.

This protects practitioners from immediate public damage caused by potentially non-representative low ratings.

---

## 9. Rating Data Concepts

The system separates the original patient rating from the public/display rating.

### Original Patient Rating

`ratingValue`

This is the original rating submitted by the patient.

Important rules:

- It is preserved forever.
- It should not be overwritten by admin decisions.
- It represents what the patient actually submitted.
- It is visible internally/admin-side.
- It is not necessarily the value used in public rating averages.

### Public / Display Rating

`publicRatingValue`

This is the rating used for public display and public aggregation.

Important rules:

- It is set only when a review is public-approved.
- It may be the same as the original patient rating.
- It may be different if admin edits the public/display rating.
- Public users only see the final public rating result, not the original-vs-edited difference.

### Counts in Public Average

`countsInPublicAverage`

This controls whether the review contributes to the practitioner public average.

Important rules:

- True only for public-approved, countable reviews.
- False for pending, rejected, internal-only, hidden, archived, or excluded reviews.
- Unrated sessions have no review row and do not count.

### Moderation Decision

`moderationDecision`

This stores the decision taken on the review.

Possible decisions:

- Auto-approved positive.
- Approved as-is.
- Edited and approved.
- Rejected publishing.
- Internal note only.
- Excluded from public average.

### Moderation Reason

`moderationReason`

This is an internal reason added by admin for decisions that need explanation.

It is not shown to public users or patients.

### Moderated By / Moderated At

The system stores who made the moderation decision and when.

If a human moderator name is not available in the admin UI, the UI shows a clean fallback such as:

- Arabic: مسؤول من الفريق
- English: Reviewed by a team admin

Raw technical IDs must not be shown in the UI.

---

## 10. Admin Moderation Decisions

Low ratings require admin review.

### Approve As-Is

Meaning:

The admin accepts the patient’s original rating exactly as submitted.

Result:

- Original rating stays preserved.
- Public rating becomes the same as the original rating.
- Review becomes published.
- Review counts in the practitioner average.

### Edit and Approve

Meaning:

The admin decides that the original rating is not fully representative for public display and chooses a different public rating.

Result:

- Original patient rating stays preserved.
- Public/display rating is set by admin.
- Review becomes published.
- Review counts in the practitioner average using the public/display rating.
- Moderation reason is required.

Important:

The system must not overwrite the original patient rating.

### Reject Publishing

Meaning:

The admin decides the review should not be published.

Result:

- Original patient rating stays preserved.
- Public rating is cleared.
- Review does not count in public average.
- Review is not shown publicly.
- Moderation reason is required.

### Internal Note Only

Meaning:

The review is useful internally but should not be public.

Result:

- Original patient rating and note remain available internally.
- Review does not show publicly.
- Review does not count in public average.
- Moderation reason is required.

### Exclude From Public Average

Meaning:

The admin decides the rating is not representative of the session and should not affect the practitioner’s average.

Result:

- Original patient rating stays preserved.
- Review does not count in public average.
- Review remains internal/non-public according to the current moderation behavior.
- Moderation reason is required.

---

## 11. Public Practitioner Rating Calculation

The public practitioner average uses only public-approved, countable reviews.

A review is counted only when:

- Review status is published.
- Published date exists.
- Hidden date is empty.
- Archived date is empty.
- It is marked as countable in public average.
- Public/display rating exists.

The calculation uses:

- Public/display rating only.

The calculation does not use:

- Original patient rating directly.
- Pending moderation ratings.
- Rejected ratings.
- Hidden ratings.
- Archived ratings.
- Internal-note-only ratings.
- Excluded ratings.
- Unrated sessions.

---

## 12. Public Text Privacy

Patient-written review text is not shown publicly.

This is an intentional product decision because Sawiyaa operates in a healthcare and mental-health context.

Patients may write private notes, but those notes are for internal/admin understanding only.

Public practitioner surfaces should show only:

- Average rating.
- Number of ratings.

They should not show:

- Patient review text.
- Review title.
- Sensitive health details.
- Moderation reason.
- Admin decision details.

---

## 13. Web Behavior

On the web patient app:

- The patient app shell checks for pending reviews.
- If an eligible unrated session exists, the rating modal appears.
- The most recent pending review is shown first.
- The patient can submit stars and optional note.
- The patient can click “Later”.
- “Later” closes the popup without submitting anything.
- After successful submission, the pending review list is refreshed.
- The popup should not appear again for the same reviewed session.

The completed session detail screen may remain as a fallback place to submit a review, but the reminder popup should be the primary flow.

---

## 14. Mobile Behavior

On the mobile patient app:

- The patient layout checks for pending reviews.
- If an eligible unrated session exists, a native modal/bottom sheet appears.
- The modal uses the same backend contract as web.
- The patient can submit stars and optional note.
- The patient can click “Later”.
- “Later” does not submit a review.
- After submission, the modal should not appear again for that reviewed session.

Mobile must not create fake local ratings.

---

## 15. Admin UI Behavior

The admin review UI supports the new moderation workflow.

Admin list should show:

- Original patient rating.
- Public/display rating when present.
- Counts-in-average state.
- Moderation decision.
- Review status.
- Practitioner name.
- Patient name or anonymous label.
- Submitted date.
- Patient note preview internally.

Admin detail should show:

- Original rating from patient.
- Public rating shown to users.
- Whether the rating enters the practitioner average.
- Moderation decision.
- Moderation reason.
- Moderated by.
- Moderated at.
- Session details.
- Patient note internally.

Admin UI should not show raw enum values such as:

- PENDING_MODERATION
- EDITED_AND_APPROVED
- INTERNAL_NOTE_ONLY
- EXCLUDED_FROM_PUBLIC_AVERAGE

Admin UI should show clean labels instead.

---

## 16. Arabic Admin Copy

Preferred Arabic labels:

- مراجعة تقييمات الجلسات
- تقييمات تحتاج مراجعة
- التقييم الأصلي من المريض
- التقييم الظاهر للعامة
- يدخل في متوسط تقييم المختص
- لا يدخل في متوسط تقييم المختص
- قرار المراجعة
- سبب القرار
- اعتماد التقييم كما هو
- تعديل واعتماد التقييم
- رفض نشر التقييم
- تحويله لملاحظة داخلية فقط
- استبعاده من متوسط تقييم المختص
- ملاحظة المريض
- هذا القرار داخلي ولا يظهر للمريض أو للزوار
- مسؤول من الفريق

The Arabic copy should be human, simple, and not a literal translation.

---

## 17. Public Zero State

If a practitioner has no public-approved ratings, the UI should not show a fake numeric rating.

Preferred zero state:

Arabic:

لا توجد تقييمات بعد

English:

No ratings yet

Avoid showing:

- 0.0 · 0 reviews
- undefined
- null
- raw keys

---

## 18. What Must Never Happen

The system must never:

- Create an automatic default 5-star rating.
- Count an unrated session.
- Let a patient review another patient’s session.
- Allow duplicate reviews for the same session.
- Publish low ratings before admin moderation.
- Overwrite the original patient rating.
- Use original rating directly in public aggregation.
- Expose patient-written comments publicly.
- Show raw technical IDs to admin users.
- Show raw enum values to users.
- Show undefined, null, mojibake, or raw translation keys.

---

## 19. Current Known Limitation

The reminder dismissal is currently session-based on web/mobile.

This means:

- If the patient clicks “Later”, the popup is suppressed for the current app/browser session.
- The reminder may appear again in a later app/session open.
- There is no server-side permanent dismissal or audit trail for reminder suppression.

This is intentional for the current version because it keeps the system simple and avoids adding unnecessary reminder-tracking complexity.

---

## 20. QA Status

The rating system has passed final QA by code review, targeted tests, typecheck, and builds.

Validated areas:

- Backend review policy.
- Review creation behavior.
- Low-rating moderation behavior.
- Public rating aggregation.
- Public text privacy.
- Pending review endpoint.
- Web reminder popup.
- Mobile reminder popup.
- Admin moderation UI.
- Arabic/English translation validity.
- No raw moderator ID fallback in admin review detail.

Validation commands passed during implementation included:

- Backend typecheck.
- Backend build.
- Prisma validation.
- Backend targeted review tests.
- Web i18n check.
- Web typecheck.
- Web build.
- Mobile typecheck.

---

## 21. Related Implementation Areas

Backend review areas:

- Patient review controller.
- Review creation use case.
- Pending review list use case.
- Review moderation use case.
- Review repository.
- Public rating aggregation service.
- Review presenters.

Web areas:

- Patient app shell.
- Patient review reminder modal.
- Patient session review card.
- Admin reviews list.
- Admin review detail.
- Reviews API client/hooks/types.
- Review translations.

Mobile areas:

- Patient app layout.
- Patient review API/hooks/types.
- Mobile review reminder modal.
- Mobile translations.

---

## 22. Summary

The Sawiyaa session rating system is designed as a fair, privacy-aware, moderated review system.

Patients can easily rate sessions, but public practitioner reputation is protected through clear moderation rules.

The system separates:

- What the patient originally submitted.
- What is shown publicly.
- What counts in the practitioner average.

This separation is essential for a healthcare and mental-health platform.

The current system is considered complete for:

- Backend policy.
- Web reminder.
- Mobile reminder.
- Admin moderation.
- Public privacy.
- Public practitioner rating aggregation.
