# مرجع تشغيل وإيقاف OTP للممارس في التطوير

آخر تحديث: 2026-04-26

هذا الملف مرجع سريع حتى نعرف أين نوقف OTP الخاص بدخول الممارس في بيئة التطوير فقط، وكيف نرجعه مرة أخرى لاحقًا بدون كسر أي شيء.

## الإعداد الحالي

- في بيئة `development` يمكن تعطيل خطوة OTP الخاصة بدخول الممارس.
- في `production` يظل OTP يعمل طبيعيًا.
- تعطيل OTP لا يغير مسار تسجيل الدخول نفسه، فقط يتخطى خطوة الرمز في التطوير ويصدر التوكنات مباشرة.

## المفتاح المسؤول

المفتاح المستخدم حاليًا:

```env
AUTH_PRACTITIONER_LOGIN_OTP_BYPASS_IN_DEV=true
```

مكان قراءته:

- [src/config/auth.config.ts](../src/config/auth.config.ts)

## مكان التنفيذ

المسار الذي يفصل بين الوضعين:

- [src/modules/auth/use-cases/login-practitioner-password.use-case.ts](../src/modules/auth/use-cases/login-practitioner-password.use-case.ts)

منطق التنفيذ:

- إذا كانت البيئة `development` والمفتاح مفعّلًا، يتم إصدار التوكنات مباشرة.
- إذا كانت البيئة غير ذلك، يبقى تدفق OTP كما هو: إنشاء challenge ثم إرسال الرمز ثم التحقق.

## التغيير في الواجهة

الواجهة الآن تقبل الحالتين:

- رد يحتوي على `challengeId` يعني أن OTP ما زال مطلوبًا.
- رد يحتوي على `tokens` يعني أن الدخول اكتمل مباشرة.

الملفات المرتبطة:

- [src/components/auth/SignInForm.tsx](../../sawiyaa-frontend-v1/src/components/auth/SignInForm.tsx)
- [src/features/auth/api/auth.api.ts](../../sawiyaa-frontend-v1/src/features/auth/api/auth.api.ts)
- [src/features/auth/types/auth.types.ts](../../sawiyaa-frontend-v1/src/features/auth/types/auth.types.ts)

## كيف أعيد OTP لاحقًا

1. افتح ملف `.env`.
2. غيّر:

```env
AUTH_PRACTITIONER_LOGIN_OTP_BYPASS_IN_DEV=false
```

أو احذف السطر بالكامل.

3. أعد تشغيل الـ backend dev server.
4. اعمل refresh للمتصفح.

بعد ذلك سيعود الممارس إلى مسار OTP المعتاد.

## ملفات يجب مراجعتها إذا تغير السلوك مستقبلًا

- [src/modules/auth/controllers/practitioner-auth.controller.ts](../src/modules/auth/controllers/practitioner-auth.controller.ts)
- [src/modules/auth/use-cases/login-practitioner-password.use-case.ts](../src/modules/auth/use-cases/login-practitioner-password.use-case.ts)
- [src/config/validation/env.schema.ts](../src/config/validation/env.schema.ts)
- [src/config/auth.config.ts](../src/config/auth.config.ts)
- [src/components/auth/SignInForm.tsx](../../sawiyaa-frontend-v1/src/components/auth/SignInForm.tsx)

## ملاحظة مهمة

هذا التعطيل مخصص للتطوير فقط. لا يُنصح بإبقائه مفعّلًا في الإنتاج.
