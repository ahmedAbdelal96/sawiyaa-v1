# Backend Localized Messages Baseline

## الهدف
هذا النظام يضيف baseline بسيطة للرسائل المترجمة داخل الباك اند بدون إدخال i18n framework معقد في Phase 1.

## كيف يحدد الباك اند اللغة
ترتيب تحديد اللغة في كل request:
1. `x-lang`
2. `accept-language`
3. `APP_DEFAULT_LOCALE`

القيم المدعومة الآن:
- `ar`
- `en`

## كيف يرسل الفرونت اللغة
يفضل أن يرسل الفرونت:

```http
x-lang: ar
```

أو:

```http
x-lang: en
```

ويمكن إرسال `Accept-Language` كـ fallback.

## أين تحفظ اللغة داخل الطلب
الميدلوير:
- `LocaleContextMiddleware`

تقوم بقراءة headers ثم تضع اللغة داخل:
- `request.locale`

وهذا يسمح لباقي الطبقات باستخدام:
- `@CurrentLocale()`
- أو قراءة `request.locale` مباشرة عند الحاجة

## كيف تعمل الترجمة
الخدمة الأساسية:
- `I18nService`

الدالة الرئيسية:

```ts
t(key, locale, params?)
```

### السلوك
- تبحث عن المفتاح داخل catalog اللغة المطلوبة
- إذا لم تجده، تحاول default locale
- إذا لم تجده أيضًا، ترجع المفتاح نفسه وتسجل warning

## message catalogs الحالية
داخل:
- `src/common/i18n/catalogs/ar/`
- `src/common/i18n/catalogs/en/`

التقسيم الحالي:
- `auth`
- `common`
- `validation`
- `config`

## naming convention للمفاتيح
استخدم dot notation واضحة:
- `auth.success.patientLoggedIn`
- `auth.errors.invalidCredentials`
- `common.errors.internalServerError`
- `config.errors.endpointForbidden`

القاعدة:
- المجال أولًا
- ثم نوع الرسالة
- ثم اسم الحالة أو الفعل

## كيف تستخدم الموديولات هذا النظام

### للـ success messages
داخل controller:

```ts
return {
  message: this.i18nService.t('auth.success.patientLoggedIn', locale),
  ...result,
};
```

### للـ business errors
ارمِ exception تحتوي `messageKey` بدل النص النهائي:

```ts
throw new UnauthorizedException({
  messageKey: 'auth.errors.invalidCredentials',
  error: 'INVALID_CREDENTIALS',
});
```

ثم `AllExceptionsFilter` سيحوّل المفتاح إلى نص مترجم حسب `request.locale`.

## ماذا تم تطبيقه الآن
- baseline locale resolution
- typed locales
- common catalogs
- exception translation via `messageKey`
- success message localization داخل Auth Module
- auth business error localization داخل Auth Module
- auth notification snapshots localization baseline

## ما الذي تم تأجيله
- localization كاملة لرسائل validation decorators
- pluralization / ICU formatting
- nested namespace typing متقدمة للمفاتيح
- runtime loading من JSON أو DB
- multi-locale content management خارج الرسائل الثابتة

## ملاحظات مهمة
- لا تضع نصوص نهائية hardcoded داخل use cases الجديدة إذا كانت ستظهر للمستخدم
- استخدم `messageKey` في exceptions كلما كانت الرسالة user-facing
- استخدم `I18nService.t(...)` في controllers أو services التي تحتاج success messages أو notification snapshots
