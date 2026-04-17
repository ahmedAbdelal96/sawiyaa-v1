# Backend Access Control / Guards Baseline

## الهدف
هذا الملف يثبت baseline الحماية قبل تنفيذ Auth Module نفسه، حتى تكون الأسماء والمسؤوليات والـ route protection واضحة من البداية.

## الفرق بين Guard و Policy
- `Guard`: يتحقق هل الطلب مسموح له بالدخول إلى route أم لا.
- `Policy`: يصف قاعدة قرار أوسع يمكن أن تستخدمها use case أو service أو guard.
- في هذا المشروع:
  - guards ستتعامل مع `request.user` وmetadata على الـ route
  - policies ستأتي لاحقًا عندما نحتاج قواعد أكثر تركيبًا من مجرد role/state/ownership checks

## الطلب الطبيعي للحماية داخل route
1. `JwtAccessAuthGuard` أو `JwtRefreshAuthGuard`
2. guard دور/نوع مستخدم إذا لزم
3. guard حالة الحساب إذا لزم
4. guard ownership أو internal check إذا لزم

## قائمة الـ Guards

### Authentication
- `JwtAccessAuthGuard`
  - يحمي معظم routes الطبيعية
  - يتوقع `request.user.authMethod = 'access'`
- `JwtRefreshAuthGuard`
  - يستخدم فقط في refresh/logout/session rotation routes
  - يتوقع `request.user.authMethod = 'refresh'`

### Role / Authorization
- `RolesGuard`
  - guard عامة تقرأ `@Roles(...)`
- `AdminGuard`
  - عندما نريد صلاحية admin فقط
- `SupportAgentGuard`
  - لواجهات الدعم
- `ContentReviewerGuard`
  - لمسارات المراجعة والمودريشن

### Account State
- `ActiveAccountGuard`
- `VerifiedEmailGuard`
- `VerifiedPhoneGuard`

### Practitioner-Specific
- `PractitionerOtpVerifiedGuard`
- `PractitionerOnboardingGuard`
- `PractitionerApprovedGuard`

### Resource / Ownership
- `ResourceOwnerGuard`
  - يقارن user مع param أو owner id محمّل مسبقًا على request
- `PractitionerApplicationOwnerGuard`
  - خاص بطلب/ملف practitioner application

### Internal
- `ConfigInternalGuard`
  - internal-only header token
- `FeatureFlagGuard`
  - baseline design فقط الآن

## Route Protection Matrix

### Patient routes
- public:
  - register
  - login
  - forgot password
- protected:
  - `JwtAccessAuthGuard`
  - `ActiveAccountGuard`
- sensitive profile/security routes:
  - `JwtAccessAuthGuard`
  - `ActiveAccountGuard`
  - `VerifiedEmailGuard` أو `VerifiedPhoneGuard` حسب الحالة
- own profile/resources:
  - `JwtAccessAuthGuard`
  - `ResourceOwnerGuard`

### Practitioner routes
- login step 1:
  - `Public`
  - `ThrottlePolicy('auth-practitioner-login')`
- login step 2 OTP:
  - `Public`
  - `ThrottlePolicy('auth-practitioner-otp')`
- authenticated setup routes:
  - `JwtAccessAuthGuard`
  - `ActiveAccountGuard`
- practitioner-only protected actions:
  - `JwtAccessAuthGuard`
  - `PractitionerOtpVerifiedGuard`
  - `PractitionerOnboardingGuard`
- operational practitioner actions after approval:
  - `JwtAccessAuthGuard`
  - `PractitionerOtpVerifiedGuard`
  - `PractitionerApprovedGuard`
- practitioner application self-service:
  - `JwtAccessAuthGuard`
  - `PractitionerApplicationOwnerGuard`

### Admin routes
- `JwtAccessAuthGuard`
- `AdminGuard`
- optional:
  - `ActiveAccountGuard`
  - `VerifiedEmailGuard`

### Support / Reviewer routes
- support:
  - `JwtAccessAuthGuard`
  - `SupportAgentGuard`
- content review:
  - `JwtAccessAuthGuard`
  - `ContentReviewerGuard`

### Internal routes
- `ConfigInternalGuard`
- later if needed:
  - internal service auth
  - IP allowlisting
  - service token rotation

## Security Helpers Baseline
- `@ThrottlePolicy(policyKey)`
  - توضع الآن على routes الحساسة
  - التنفيذ الفعلي للـ throttling سيأتي مع Auth Module
- الأماكن التي يجب أن تبدأ بها:
  - login
  - OTP request
  - OTP verify
  - forgot password
  - reset password
  - refresh token

## ما الذي سيبنيه Auth Module لاحقًا
- JWT strategy/verification وربطها مع `request.user`
- session context normalization
- role mapping من DB إلى `AppRole`
- refresh token rotation
- login/logout guards usage في controllers الفعلية
- throttling enforcement الفعلي على endpoints الحساسة

## ملاحظات تصميم
- لا نضع business logic داخل guards
- guards لا تقوم بقراءة Prisma مباشرة إلا إذا كان ذلك guard مخصصًا جدًا ولا يوجد بديل أوضح
- ownership الأفضل أن يعتمد على resource تم تحميله مسبقًا أو param واضح
- use cases تبقى مسؤولة عن منطق القرار التجاري بعد عبور الحماية الأساسية
