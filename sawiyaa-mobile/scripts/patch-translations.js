const fs = require('fs');

const enPatch = {
  publicTabs: {
    home: "Home",
    practitioners: "Specialists",
    specialties: "Specialties",
    packages: "Packages"
  },
  publicHome: {
    signIn: "Sign In",
    heroTitle: "The right support starts with the right specialist",
    heroSubtitle: "Explore specialists based on your needs and choose a time that works for you.",
    browseCta: "Browse Specialists",
    specialtiesTitle: "Browse by Specialty",
    viewAll: "View all",
    specialistsTitle: "Available Specialists",
    priceLabel: "Starts from",
    perSession30: "/ 30m session",
    howItWorks: {
      title: "How it works",
      step1Title: "Choose Specialist",
      step1Desc: "Find a verified therapist suited to your needs.",
      step2Title: "Book Time",
      step2Desc: "Pick an available slot and confirm instantly.",
      step3Title: "Start Session",
      step3Desc: "Join your private session safely on mobile."
    },
    ctas: {
      patientTitle: "Ready to get started?",
      patientDesc: "Create an account to book sessions, chat with specialists, and buy discount packages.",
      patientButton: "Create Patient Account",
      practitionerTitle: "Are you a practitioner?",
      practitionerButton: "Join as a Practitioner"
    },
    placeholders: {
      comingSoon: "Coming Soon",
      comingSoonDesc: "This feature will be available in the next phase. Stay tuned!",
      noSpecialists: "No specialists available right now.",
      noSpecialties: "No specialties found.",
      errorLoading: "Failed to load content",
      retry: "Retry"
    }
  },
  authGateway: {
    title: "Authentication Required",
    description: "Please sign in or create a patient account to continue with this action.",
    signIn: "Sign In",
    signUp: "Create Account",
    cancel: "Cancel"
  }
};

const arPatch = {
  publicTabs: {
    home: "الرئيسية",
    practitioners: "المختصون",
    specialties: "التخصصات",
    packages: "الباقات"
  },
  publicHome: {
    signIn: "تسجيل الدخول",
    heroTitle: "الدعم المناسب يبدأ باختيار المختص المناسب",
    heroSubtitle: "تصفح المختصين حسب احتياجك، واختار الموعد الأنسب ليك.",
    browseCta: "تصفح المختصين",
    specialtiesTitle: "تصفح حسب التخصص",
    viewAll: "عرض الكل",
    specialistsTitle: "مختصون متاحون",
    priceLabel: "يبدأ من",
    perSession30: "/ جلسة 30 دقيقة",
    howItWorks: {
      title: "كيف تعمل المنصة",
      step1Title: "اختار المختص",
      step1Desc: "ابحث عن معالج معتمد يناسب احتياجاتك.",
      step2Title: "حدد الموعد",
      step2Desc: "اختر وقتًا متاحًا وأكد الحجز فورًا.",
      step3Title: "ابدأ جلستك",
      step3Desc: "انضم لجلسة خاصة وآمنة تمامًا على هاتفك.",
    },
    ctas: {
      patientTitle: "جاهز للبدء؟",
      patientDesc: "أنشئ حسابًا لحجز الجلسات، والتحدث مع المختصين، وشراء باقات الخصم.",
      patientButton: "إنشاء حساب مريض",
      practitionerTitle: "هل أنت مختص؟",
      practitionerButton: "انضم كمعالج معنا"
    },
    placeholders: {
      comingSoon: "قريباً",
      comingSoonDesc: "هذه الميزة ستكون متاحة في المرحلة القادمة. تابعنا!",
      noSpecialists: "لا يوجد مختصين متاحين حالياً.",
      noSpecialties: "لم يتم العثور على تخصصات.",
      errorLoading: "فشل تحميل المحتوى",
      retry: "إعادة المحاولة"
    }
  },
  authGateway: {
    title: "مطلوب تسجيل الدخول",
    description: "يرجى تسجيل الدخول أو إنشاء حساب مريض للمتابعة.",
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    cancel: "إلغاء"
  }
};

function patchJson(filePath, patch) {
  const content = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(content);
  Object.assign(json, patch);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
  console.log(`Patched ${filePath} successfully.`);
}

patchJson('src/i18n/locales/en.json', enPatch);
patchJson('src/i18n/locales/ar.json', arPatch);
