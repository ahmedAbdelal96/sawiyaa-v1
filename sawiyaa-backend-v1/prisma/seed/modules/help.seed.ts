import { PrismaClient } from '@prisma/client';
import { SeedModule } from '../shared/seed.types';

type HelpQuestionSeed = {
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  sortOrder: number;
};

type HelpCategorySeed = {
  slug: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  sortOrder: number;
  questions: HelpQuestionSeed[];
};

// Development/staging seed content only.
const HELP_CATEGORY_SEEDS: HelpCategorySeed[] = [
  {
    slug: 'account-and-sign-in',
    titleAr: 'الحساب والدخول',
    titleEn: 'Account and sign-in',
    descriptionAr: 'إجابات سريعة عن إنشاء الحساب وتسجيل الدخول واسترجاع كلمة المرور.',
    descriptionEn: 'Quick answers about account creation, sign-in, and password recovery.',
    sortOrder: 1,
    questions: [
      {
        questionAr: 'كيف أنشئ حسابًا جديدًا؟',
        questionEn: 'How do I create a new account?',
        answerAr: 'يمكنك إنشاء حساب جديد باستخدام البريد الإلكتروني أو رقم الهاتف من صفحة التسجيل.',
        answerEn: 'You can create a new account using your email address or phone number from the sign-up page.',
        sortOrder: 1,
      },
      {
        questionAr: 'ماذا أفعل إذا نسيت كلمة المرور؟',
        questionEn: 'What should I do if I forget my password?',
        answerAr: 'استخدم خيار نسيت كلمة المرور من صفحة الدخول واتبع خطوات إعادة التعيين.',
        answerEn: 'Use the Forgot password option on the sign-in page and follow the reset steps.',
        sortOrder: 2,
      },
    ],
  },
  {
    slug: 'sessions-and-bookings',
    titleAr: 'الجلسات والحجوزات',
    titleEn: 'Sessions and bookings',
    descriptionAr: 'معلومات عن الحجز وإعادة الجدولة وإدارة مواعيد الجلسات.',
    descriptionEn: 'Information about booking, rescheduling, and managing session appointments.',
    sortOrder: 2,
    questions: [
      {
        questionAr: 'كيف أحجز جلسة؟',
        questionEn: 'How do I book a session?',
        answerAr: 'اختر الأخصائي المناسب ثم حدد الموعد المتاح وأكمل خطوات الدفع.',
        answerEn: 'Choose the right practitioner, select an available time, and complete the payment steps.',
        sortOrder: 1,
      },
      {
        questionAr: 'هل يمكنني تغيير موعد الجلسة؟',
        questionEn: 'Can I reschedule a session?',
        answerAr: 'إذا كان الموعد يسمح بذلك، يمكنك طلب إعادة الجدولة من صفحة الجلسة أو من خلال الدعم.',
        answerEn: 'If the appointment allows it, you can request a reschedule from the session page or through support.',
        sortOrder: 2,
      },
    ],
  },
  {
    slug: 'payments-and-refunds',
    titleAr: 'المدفوعات والاسترجاع',
    titleEn: 'Payments and refunds',
    descriptionAr: 'شرح مبسط لطرق الدفع وسياسات الاسترجاع ومتى يظهر المبلغ النهائي.',
    descriptionEn: 'Simple guidance on payment methods, refund policies, and when the final amount is shown.',
    sortOrder: 3,
    questions: [
      {
        questionAr: 'متى يتم خصم المبلغ؟',
        questionEn: 'When is the amount charged?',
        answerAr: 'يتم خصم المبلغ عند إتمام عملية الدفع بنجاح وفقًا للطريقة المختارة.',
        answerEn: 'The amount is charged when the payment is completed successfully using the selected method.',
        sortOrder: 1,
      },
      {
        questionAr: 'أين أقرأ سياسة الاسترجاع؟',
        questionEn: 'Where can I read the refund policy?',
        answerAr: 'ستظهر لك سياسة الاسترجاع قبل تأكيد الدفع، ويمكنك فتح النسخة الكاملة من نفس الشاشة.',
        answerEn: 'You will see the refund policy before confirming payment, and you can open the full version from the same screen.',
        sortOrder: 2,
      },
    ],
  },
  {
    slug: 'packages',
    titleAr: 'الباقات',
    titleEn: 'Packages',
    descriptionAr: 'أسئلة شائعة حول باقات الجلسات والتفعيل والاستخدام.',
    descriptionEn: 'Common questions about session packages, activation, and usage.',
    sortOrder: 4,
    questions: [
      {
        questionAr: 'كيف أشتري باقة؟',
        questionEn: 'How do I buy a package?',
        answerAr: 'اختر الباقة المناسبة ثم أكمل خطوات الحجز والدفع من صفحة الباقات.',
        answerEn: 'Choose the right package and complete the booking and payment steps from the package page.',
        sortOrder: 1,
      },
      {
        questionAr: 'ماذا يحدث بعد شراء الباقة؟',
        questionEn: 'What happens after I buy a package?',
        answerAr: 'سيتم حفظ الباقة في حسابك ويمكنك استخدام الجلسات المتاحة حسب شروط الباقة.',
        answerEn: 'The package is saved in your account and you can use the available sessions according to the package terms.',
        sortOrder: 2,
      },
    ],
  },
  {
    slug: 'support-and-help',
    titleAr: 'الدعم والمساعدة',
    titleEn: 'Support and help',
    descriptionAr: 'كيف تصل إلى الدعم وما الذي يمكن لفريق المساعدة فعله لك.',
    descriptionEn: 'How to reach support and what the support team can help with.',
    sortOrder: 5,
    questions: [
      {
        questionAr: 'كيف أتواصل مع الدعم؟',
        questionEn: 'How can I contact support?',
        answerAr: 'يمكنك فتح صفحة الدعم من القائمة الرئيسية وإرسال طلبك من هناك.',
        answerEn: 'You can open the support page from the main menu and send your request from there.',
        sortOrder: 1,
      },
      {
        questionAr: 'متى أستخدم الدعم بدلًا من الحجز؟',
        questionEn: 'When should I use support instead of booking?',
        answerAr: 'استخدم الدعم إذا كانت لديك مشكلة تقنية أو سؤال عن حسابك أو مدفوعاتك.',
        answerEn: 'Use support if you have a technical issue or a question about your account or payments.',
        sortOrder: 2,
      },
    ],
  },
];

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

async function seedCategory(prisma: PrismaClient, seed: HelpCategorySeed) {
  const existing = await prisma.helpCategory.findUnique({
    where: { slug: seed.slug },
    include: {
      questions: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!existing) {
    const category = await prisma.helpCategory.create({
      data: {
        slug: seed.slug,
        titleAr: seed.titleAr,
        titleEn: seed.titleEn,
        descriptionAr: seed.descriptionAr,
        descriptionEn: seed.descriptionEn,
        sortOrder: seed.sortOrder,
        isActive: true,
      },
    });

    await prisma.helpQuestion.createMany({
      data: seed.questions.map((question) => ({
        categoryId: category.id,
        questionAr: question.questionAr,
        questionEn: question.questionEn,
        answerAr: question.answerAr,
        answerEn: question.answerEn,
        sortOrder: question.sortOrder,
        isActive: true,
      })),
    });

    return;
  }

  const isPlaceholder = isBlank(existing.titleAr) && isBlank(existing.titleEn) && existing.questions.length === 0;
  if (!isPlaceholder) {
    return;
  }

  await prisma.helpCategory.update({
    where: { id: existing.id },
    data: {
      titleAr: seed.titleAr,
      titleEn: seed.titleEn,
      descriptionAr: seed.descriptionAr,
      descriptionEn: seed.descriptionEn,
      sortOrder: seed.sortOrder,
      isActive: true,
    },
  });

  await prisma.helpQuestion.createMany({
    data: seed.questions.map((question) => ({
      categoryId: existing.id,
      questionAr: question.questionAr,
      questionEn: question.questionEn,
      answerAr: question.answerAr,
      answerEn: question.answerEn,
      sortOrder: question.sortOrder,
      isActive: true,
    })),
  });
}

export const helpSeedModule: SeedModule = {
  name: 'help',
  async run(prisma: PrismaClient): Promise<void> {
    for (const category of HELP_CATEGORY_SEEDS) {
      await seedCategory(prisma, category);
    }
  },
};
