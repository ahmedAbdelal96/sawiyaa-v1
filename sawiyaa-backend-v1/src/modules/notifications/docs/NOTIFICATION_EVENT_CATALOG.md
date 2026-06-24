# NOTIFICATION_EVENT_CATALOG

This catalog documents the Phase P0 session notification contract for the backend.

| Event | Recipient | Title (AR) | Body (AR) | routePath | idempotencyKey | Status |
| --- | --- | --- | --- | --- | --- | --- |
| session confirmed | patient | تم تأكيد الجلسة | تم تأكيد جلستك في {{sessionAt}}. | `/ar/patient/sessions/:sessionId` | `sessions.session-confirmed:{sessionId}:{userId}` | موجود حاليًا |
| session confirmed | practitioner | جلسة جديدة مؤكدة | تم تأكيد جلسة بتاريخ {{sessionAt}}. | `/ar/practitioner/sessions/:sessionId` | `sessions.session-confirmed-practitioner:{sessionId}:{userId}` | موجود حاليًا |
| session cancelled | patient | تم إلغاء الجلسة | تم إلغاء جلستك المجدولة في {{sessionAt}}. | `/ar/patient/sessions/:sessionId` | `sessions.session-cancelled:{sessionId}:{userId}` | موجود حاليًا |
| session cancelled | practitioner | تم إلغاء الجلسة بواسطة المريض | قام المريض بإلغاء جلسة مجدولة في {{sessionAt}}. | `/ar/practitioner/sessions/:sessionId` | `sessions.session-cancelled-practitioner:{sessionId}:{userId}` | موجود حاليًا |
| session join available | patient | جلستك جاهزة للدخول | تبدأ جلستك قريبًا. افتح صفحة الجلسة للانضمام بأمان. | `/ar/patient/sessions/:sessionId` | `sessions.session-join-available:{sessionId}:{userId}` | موجود حاليًا |
| session join available | practitioner | جلستك جاهزة للدخول | تبدأ جلستك قريبًا. افتح صفحة الجلسة للانضمام بأمان. | `/ar/practitioner/sessions/:sessionId` | `sessions.session-join-available:{sessionId}:{userId}` | موجود حاليًا |
| session reminder 60 minutes | patient | تذكير بموعد جلستك | جلستك تبدأ بعد ساعة. | `/ar/patient/sessions/:sessionId` | `sessions.session-reminder-60:{sessionId}:{userId}` | جديد |
| session reminder 60 minutes | practitioner | لديك جلسة بعد ساعة | راجع تفاصيل الجلسة واستعد للدخول في الموعد. | `/ar/practitioner/sessions/:sessionId` | `sessions.session-reminder-60:{sessionId}:{userId}` | جديد |
| session reminder 15 minutes | patient | جلستك ستبدأ قريبًا | جلستك تبدأ بعد 15 دقيقة. | `/ar/patient/sessions/:sessionId` | `sessions.session-reminder-15:{sessionId}:{userId}` | جديد |
| session reminder 15 minutes | practitioner | جلستك ستبدأ بعد 15 دقيقة | افتح صفحة الجلسة عند وقت الدخول. | `/ar/practitioner/sessions/:sessionId` | `sessions.session-reminder-15:{sessionId}:{userId}` | جديد |

## Notes

- IDs stay in metadata/route only. They are not included in title/body.
- Reminders are scheduled using the existing notification delivery runner.
- If a session becomes cancelled/completed/no-show/expired before delivery, the domain validity guard suppresses the queued notification.
