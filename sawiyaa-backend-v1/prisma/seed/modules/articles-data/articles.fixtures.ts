import type { ArticleSeedEntry } from './articles.types';
import { buildArabicContent, buildEnglishContent } from './articles.content';

// Author keys map to real seeded practitioner profile IDs
// practitionerB is the APPROVED practitioner in curated-dev seed.
const AUTHOR_KEYS = ['practitionerB', 'practitionerB', 'practitionerB', 'practitionerB', 'practitionerB'] as const;

// ─── Topics per category ────────────────────────────────────────────────────
// All Arabic is clean. All English titles are separate and distinct.

const MH_TOPICS = [
  {
    // EN: Calming Your Thoughts Before Your First Session
    titleAr: 'كيف تهدئ أفكارك قبل أول جلسة؟',
    subtitleAr: 'القلق قبل الجلسات الأولى',
    bullet1Ar: 'سجّل ما تريد مناقشته مع المختص مسبقًا',
    bullet2Ar: 'احرص على عدم تناول الكافيين قبل الجلسة بساعة',
    bullet3Ar: 'ادّرب نفسك على تمرين التنفس العميق: شهيق ٤ ثوانٍ، حبس ٤، زفير ٦',
    bullet4Ar: 'تذكّر أن المختص يريدك أن تنجح، لا يوجد تقييم في الجلسة الأولى',
    seekSupport1Ar: 'إذا استمر القلق لأسابيع وأثر على حياتك اليومية',
    seekSupport2Ar: 'إذا صاحب القلق أعراض جسدية مثل ضربات القلب السريعة المستمرة',
    // English
    titleEn: 'Calming Your Thoughts Before Your First Session',
    subtitleEn: 'Managing pre-session anxiety',
    bullet1En: 'Write down what you want to discuss with your therapist in advance',
    bullet2En: 'Avoid caffeine at least an hour before your session',
    bullet3En: 'Practice deep breathing: inhale for 4 seconds, hold for 4, exhale for 6',
    bullet4En: 'Remember your therapist wants you to succeed — there is no judgment in the first session',
    seekSupport1En: 'If anxiety persists for weeks and affects your daily life',
    seekSupport2En: 'If anxiety is accompanied by physical symptoms like rapid heartbeat',
  },
  {
    // EN: Signs You May Need Professional Mental Health Support
    titleAr: 'علامات تخبرك أنك تحتاج إلى دعم نفسي',
    subtitleAr: 'معرفة متى يحتاج الشخص لدعم متخصص',
    bullet1Ar: 'تغيّر ملحوظ في المزاج أو مستوى الطاقة يمتد لأسابيع',
    bullet2Ar: 'صعوبة في النوم أو الأكل بشكل مستمر دون سبب واضح',
    bullet3Ar: 'الانسحاب من الأنشطة الاجتماعية التي كنت تستمتع بها',
    bullet4Ar: 'صعوبة في اتخاذ قرارات بسيطة كانت سهلة من قبل',
    seekSupport1Ar: 'إذا أصبحت الحياة اليومية صعبة الإدارة بشكل مستمر',
    seekSupport2Ar: 'إذا بدأت أفكار سلبية تؤثر على عملك أو علاقاتك',
    // English
    titleEn: 'Signs You May Need Professional Mental Health Support',
    subtitleEn: 'Recognizing when you need specialized support',
    bullet1En: 'Noticeable change in mood or energy levels that lasts for weeks',
    bullet2En: 'Persistent difficulty sleeping or eating without a clear reason',
    bullet3En: 'Withdrawing from social activities you once enjoyed',
    bullet4En: 'Struggling to make simple decisions that used to be easy',
    seekSupport1En: 'If daily life becomes consistently difficult to manage',
    seekSupport2En: 'If negative thoughts begin affecting your work or relationships',
  },
  {
    // EN: Managing Morning Anxiety Before It Takes Over
    titleAr: 'كيف تتعامل مع القلق في بداية اليوم؟',
    subtitleAr: 'إدارة القلق الصباحي بطريقة عملية',
    bullet1Ar: 'استيقظ قبل موعدك المعتاد بخمس عشرة دقيقة وتمدّد بهدوء',
    bullet2Ar: 'تجنّب الشاشات في أول عشر دقائق بعد الاستيقاظ',
    bullet3Ar: 'اشرب كوب ماء دافئ مع ليمون قبل أي طعام',
    bullet4Ar: 'إذا شعرت بقلق شديد، توقف فورًا وخذ نفسًا عميقًا واحدًا',
    seekSupport1Ar: 'إذا أصبح القلق الصباحي يرافقك كل يوم بشكل متكرر',
    seekSupport2Ar: 'إذا أثر القلق على أدائك في العمل أو الدراسة',
    // English
    titleEn: 'Managing Morning Anxiety Before It Takes Over',
    subtitleEn: 'Practical strategies for morning anxiety',
    bullet1En: 'Wake up fifteen minutes earlier than usual and stretch gently',
    bullet2En: 'Avoid screens for the first ten minutes after waking',
    bullet3En: 'Drink a glass of warm water with lemon before eating anything',
    bullet4En: 'If you feel intense anxiety, stop immediately and take one deep breath',
    seekSupport1En: 'If morning anxiety occurs every day consistently',
    seekSupport2En: 'If anxiety starts affecting your performance at work or school',
  },
  {
    // EN: Understanding the Difference Between Temporary Sadness and Prolonged Stress
    titleAr: 'الفرق بين الحزن العابر والضغط المستمر',
    subtitleAr: 'معرفة الفرق بين الحالتين',
    bullet1Ar: 'الحزن العابر يزول تدريجيًا ولا يؤثر على أدائك اليومي',
    bullet2Ar: 'الضغط المستمر يبقى لأسابيع ولا يتحسن حتى مع الراحة',
    bullet3Ar: 'الضغط المستمر يظهر في تغيرات جسدية مثل اضطراب النوم والأكل',
    bullet4Ar: 'إذا لم تلاحظ تحسّنًا خلال شهرين، فقد تحتاج إلى متابعة متخصصة',
    seekSupport1Ar: 'إذا استمر الحزن أو الضغط لأسابيع وأثر على حياتك اليومية',
    seekSupport2Ar: 'إذا صاحب ذلك أفكار سلبية عن النفس أو الحياة',
    // English
    titleEn: 'Understanding the Difference Between Temporary Sadness and Prolonged Stress',
    subtitleEn: 'How to distinguish between the two conditions',
    bullet1En: 'Temporary sadness fades gradually and does not affect your daily performance',
    bullet2En: 'Prolonged stress persists for weeks and does not improve even with rest',
    bullet3En: 'Chronic stress shows up as physical changes like sleep and appetite disruption',
    bullet4En: 'If you notice no improvement after two months, you may need professional support',
    seekSupport1En: 'If sadness or stress continues for weeks affecting your daily life',
    seekSupport2En: 'If accompanied by negative thoughts about yourself or life in general',
  },
  {
    // EN: Small Daily Habits That Help Regulate Your Emotions
    titleAr: 'عادات صغيرة تساعدك على تنظيم مشاعرك',
    subtitleAr: 'بناء عادات يومية بسيطة للمزاج',
    bullet1Ar: 'خصّص خمس دقائق كل مساء لتسجيل ما شعرت به اليوم ولماذا',
    bullet2Ar: 'خذ ثلاث أنفاس عميقة قبل أي قرار مهم خلال اليوم',
    bullet3Ar: 'حافظ على حركة جسدية معتدلة ثلاثين دقيقة يوميًا على الأقل',
    bullet4Ar: 'تعلّم أن تقول لا بدون الشعور بالذنب، هذا يحمي طاقتك النفسية',
    seekSupport1Ar: 'إذا شعرت أن المشاعر تسيطر عليك بطريقة يصعب إدارتها',
    seekSupport2Ar: 'إذا لاحظ المحيطون بك تغيّرات في مزاجك',
    // English
    titleEn: 'Small Daily Habits That Help Regulate Your Emotions',
    subtitleEn: 'Building simple daily habits for emotional balance',
    bullet1En: 'Spend five minutes each evening writing down how you felt and why',
    bullet2En: 'Take three deep breaths before any important decision during the day',
    bullet3En: 'Maintain at least thirty minutes of moderate physical activity daily',
    bullet4En: 'Learn to say no without guilt — it protects your mental energy',
    seekSupport1En: 'If you feel emotions are taking over in ways that are hard to manage',
    seekSupport2En: 'If people around you notice changes in your mood',
  },
];

const NUTR_TOPICS = [
  {
    // EN: The Connection Between Food and Mood
    titleAr: 'العلاقة بين الطعام والمزاج',
    subtitleAr: 'كيف تؤثر خياراتنا الغذائية على حالتنا النفسية',
    bullet1Ar: 'التغذية غير المنتظمة تؤدي إلى تقلبات في الطاقة والمزاج',
    bullet2Ar: 'نقص البروتين يؤثر على التركيز ومستوى الطاقة خلال اليوم',
    bullet3Ar: 'الدهون الصحية مهمة لوظائف الدماغ والاستقرار العاطفي',
    bullet4Ar: 'السكريات المكررة تسبب ارتفاعات سريعة في الطاقة تليها انخفاضات حادة',
    seekSupport1Ar: 'إذا كنت تعاني من اضطراب في الأكل أو علاقة مضطربة بالطعام',
    seekSupport2Ar: 'إذا أثرت المشاكل الغذائية على صحتك الجسدية بشكل ملحوظ',
    // English
    titleEn: 'The Connection Between Food and Mood',
    subtitleEn: 'How your dietary choices affect your mental state',
    bullet1En: 'Irregular eating leads to fluctuations in energy and mood',
    bullet2En: 'Protein deficiency affects focus and energy levels throughout the day',
    bullet3En: 'Healthy fats are essential for brain function and emotional stability',
    bullet4En: 'Refined sugars cause rapid energy spikes followed by sharp crashes',
    seekSupport1En: 'If you struggle with an eating disorder or unhealthy relationship with food',
    seekSupport2En: 'If dietary issues are noticeably affecting your physical health',
  },
  {
    // EN: Starting a Healthy Diet Without Feeling Deprived
    titleAr: 'كيف تبدأ نظامًا غذائيًا بدون حرمان؟',
    subtitleAr: 'بناء عادات غذائية مستدامة',
    bullet1Ar: 'أضف عنصرًا صحيًا واحدًا لكل وجبة بدلاً من إزالة ما تحبه',
    bullet2Ar: 'اشرب كوبًا من الماء قبل كل وجبة لتساعدك على الشبع بشكل أسرع',
    bullet3Ar: 'كل ببطء ولاحظ متى تشعر بالشبع قبل أن تمتلئ تمامًا',
    bullet4Ar: 'المكافآت المخططة مسموحة ولا بأس بها ضمن حدود معقولة',
    seekSupport1Ar: 'إذا كانت لديك علاقة مضطربة بالطعام أو حرمان متكرر',
    seekSupport2Ar: 'إذا أثرت المشاكل الغذائية على وزنك أو صحتك بشكل كبير',
    // English
    titleEn: 'Starting a Healthy Diet Without Feeling Deprived',
    subtitleEn: 'Building sustainable eating habits',
    bullet1En: 'Add one healthy element to each meal instead of removing foods you love',
    bullet2En: 'Drink a glass of water before each meal to help you feel full faster',
    bullet3En: 'Eat slowly and notice when you feel satisfied before becoming full',
    bullet4En: 'Planned treats are allowed within reasonable limits',
    seekSupport1En: 'If you have a troubled relationship with food or repeated restriction',
    seekSupport2En: 'If dietary problems are significantly affecting your weight or health',
  },
  {
    // EN: Simple Meals That Help You Stay Focused
    titleAr: 'وجبات بسيطة تساعدك على التركيز',
    subtitleAr: 'ما تأكله فعلاً يؤثر على تركيزك',
    bullet1Ar: 'البيض مع الخبز الأسمر في الصباح يحافظ على طاقة مستقرة',
    bullet2Ar: 'السمك المشوي مع السلطة الخفيفة يوفر تركيزًا جيدًا دون ثقل الهضم',
    bullet3Ar: 'حفنة من اللوز مع تفاحة وجبة خفيفة مغذية وسريعة التحضير',
    bullet4Ar: 'تجنّب الوجبات الثقيلة قبل المهام التي تحتاج تركيزًا عاليًا',
    seekSupport1Ar: 'إذا كنت تعاني من صعوبة مستمرة في التركيز رغم النوم الكافي',
    seekSupport2Ar: 'إذا صاحب التركيز مشاكل في الذاكرة بشكل يومي',
    // English
    titleEn: 'Simple Meals That Help You Stay Focused',
    subtitleEn: 'What you eat truly affects your concentration',
    bullet1En: 'Eggs with whole-grain bread in the morning maintain stable energy',
    bullet2En: 'Grilled fish with a light salad provides good focus without digestive heaviness',
    bullet3En: 'A handful of almonds with an apple is a nutritious and quick snack',
    bullet4En: 'Avoid heavy meals before tasks that require high concentration',
    seekSupport1En: 'If you struggle with concentration despite adequate sleep',
    seekSupport2En: 'If concentration problems are accompanied by memory issues daily',
  },
  {
    // EN: Learning to Read Your Hunger and Fullness Signals
    titleAr: 'كيف تقرأ إشارات الجوع والشبع؟',
    subtitleAr: 'إعادة التواصل مع إشارات جسمك الطبيعية',
    bullet1Ar: 'لا تنتظر حتى تكون جائعًا جدًا، هذا يؤدي إلى الأكل المفرط',
    bullet2Ar: 'توقف عن الأكل عند الشعور بالراحة، لا عند الامتلاء الكامل',
    bullet3Ar: 'كل بدون شاشات حتى تلاحظ إشارات الشبع بشكل أفضل',
    bullet4Ar: 'سجّل مستوى الجوع من واحد إلى عشرة قبل كل وجبة وبعدها',
    seekSupport1Ar: 'إذا فقدت القدرة على التمييز بين الجوع والمشاعر الأخرى',
    seekSupport2Ar: 'إذا كنت تأكل بشكل غير واعٍ طوال اليوم دون توقف',
    // English
    titleEn: 'Learning to Read Your Hunger and Fullness Signals',
    subtitleEn: "Reconnecting with your body's natural signals",
    bullet1En: 'Do not wait until very hungry — this leads to overeating',
    bullet2En: 'Stop eating when you feel comfortable, not when completely full',
    bullet3En: 'Eat without screens so you can better notice fullness signals',
    bullet4En: 'Record your hunger level from one to ten before and after each meal',
    seekSupport1En: 'If you have lost the ability to distinguish hunger from other feelings',
    seekSupport2En: 'If you find yourself eating unconsciously throughout the day',
  },
  {
    // EN: Common Mistakes People Make When Starting a Nutrition Plan
    titleAr: 'أخطاء شائعة في بداية أي خطة تغذية',
    subtitleAr: 'ما الذي يجعل الحميات تفشل عادةً',
    bullet1Ar: 'تغيير كل شيء دفعة واحدة يتطلب الكثير من الإرادة في وقت واحد',
    bullet2Ar: 'حساب السعرات الحرارية بطريقة مهووسة يزيد التوتر بدلًا من المساعدة',
    bullet3Ar: 'توقع نتائج سريعة خلال أسابيع قليلة يسبب الإحباط',
    bullet4Ar: 'تجاهل شرب الماء يؤثر على عملية الأيض بشكل سلبي',
    seekSupport1Ar: 'إذا كنت تعاني من اضطراب في الأكل أو سلوكيات قهرية مرتبطة بالطعام',
    seekSupport2Ar: 'إذا أدت المشاكل الغذائية إلى مشاكل صحية جسدية واضحة',
    // English
    titleEn: 'Common Mistakes People Make When Starting a Nutrition Plan',
    subtitleEn: 'Why diets usually fail',
    bullet1En: 'Changing everything at once requires too much willpower simultaneously',
    bullet2En: 'Obsessively counting calories increases stress instead of helping',
    bullet3En: 'Expecting quick results within a few weeks leads to discouragement',
    bullet4En: 'Ignoring water intake negatively affects your metabolism',
    seekSupport1En: 'If you struggle with an eating disorder or compulsive food behaviors',
    seekSupport2En: 'If dietary problems have led to obvious physical health issues',
  },
];

const FITNESS_TOPICS = [
  {
    // EN: How to Start Moving Again After a Period of Inactivity
    titleAr: 'كيف تبدأ الحركة بعد فترة خمول؟',
    subtitleAr: 'العودة للرياضة بشكل آمن وتدريجي',
    bullet1Ar: 'ابدأ بعشر دقائق فقط ثلاث مرات أسبوعيًا في الأسبوعين الأولين',
    bullet2Ar: 'المشي هو أفضل نقطة بداية، لا تحتاج معدات أو صالة',
    bullet3Ar: 'تمارين الإطالة يوميًا ضرورة وليست خيارًا، خاصة بعد فترة خمول',
    bullet4Ar: 'لا تحاول الوصول لنفس المستوى الذي كنت عليه، الجسم تغير',
    seekSupport1Ar: 'إذا شعرت بألم مفصلي أو عضلي مستمر يمنع الحركة',
    seekSupport2Ar: 'إذا كان لديك مشكلة صحية تمنع النشاط البدني، استشر طبيبك أولًا',
    // English
    titleEn: 'How to Start Moving Again After a Period of Inactivity',
    subtitleEn: 'Returning to exercise safely and gradually',
    bullet1En: 'Start with just ten minutes three times a week for the first two weeks',
    bullet2En: 'Walking is the best starting point — no equipment or gym needed',
    bullet3En: 'Daily stretching is essential, especially after a period of inactivity',
    bullet4En: 'Do not try to reach the same level you were at before — your body has changed',
    seekSupport1En: 'If you feel persistent joint or muscle pain that prevents movement',
    seekSupport2En: 'If you have a health condition that limits physical activity, consult your doctor first',
  },
  {
    // EN: Simple Exercises to Boost Your Daily Energy
    titleAr: 'تمارين بسيطة لتحسين الطاقة اليومية',
    subtitleAr: 'عشر دقائق صباحًا تصنع فرقًا في يومك',
    bullet1Ar: 'تمارين القفز في المكان أو المشي السريع لمدة دقيقتين تنشّط الدورة الدموية',
    bullet2Ar: 'سكوات خفيفة ثلاث مجموعات تحسّن المزاج والطاقة معًا',
    bullet3Ar: 'إطالة رئيسية لخمس دقائق تحرر العضلات من التيبس',
    bullet4Ar: 'تمارين التنفس العميق لمدة دقيقتين تقلل التوتر فورًا',
    seekSupport1Ar: 'إذا كان لديك إصابة حالية أو ألم مزمن يمنع الحركة',
    seekSupport2Ar: 'إذا كنت تعاني من إرهاق مزمن لا يتحسن مع الراحة',
    // English
    titleEn: 'Simple Exercises to Boost Your Daily Energy',
    subtitleEn: 'Ten minutes in the morning makes a difference',
    bullet1En: 'Jumping in place or brisk walking for two minutes boosts circulation',
    bullet2En: 'Light squats in three sets improve mood and energy together',
    bullet3En: 'Five minutes of main stretching releases muscle stiffness',
    bullet4En: 'Two minutes of deep breathing reduces stress immediately',
    seekSupport1En: 'If you have a current injury or chronic pain that limits movement',
    seekSupport2En: 'If you suffer from chronic fatigue that does not improve with rest',
  },
  {
    // EN: Why Rest Is an Essential Part of Your Workout
    titleAr: 'لماذا الراحة جزء من التمرين؟',
    subtitleAr: 'البناء يحدث خلال الراحة وليس خلال التمرين',
    bullet1Ar: 'العضلات تنمو وتتقوى خلال فترات الراحة بين التمارين',
    bullet2Ar: 'النوم الكافي هو أهم عامل في التعافي وبناء القوة',
    bullet3Ar: 'الراحة النشطة مثل المشي الخفيف تحافظ على تدفق الدم دون إجهاد',
    bullet4Ar: 'الأسبوع الأول يجب أن يكون خفيفًا جدًا لتقليل خطر الإصابة',
    seekSupport1Ar: 'إذا كنت تعاني من إصابات متكررة عند ممارسة الرياضة',
    seekSupport2Ar: 'إذا لم تلاحظ أي تحسّن رغم الانتظام في التمارين',
    // English
    titleEn: 'Why Rest Is an Essential Part of Your Workout',
    subtitleEn: 'Muscle building happens during rest, not during exercise',
    bullet1En: 'Muscles grow and strengthen during rest periods between workouts',
    bullet2En: 'Adequate sleep is the most important factor in recovery and strength building',
    bullet3En: 'Active rest like light walking maintains blood flow without strain',
    bullet4En: 'The first week should be very light to reduce injury risk',
    seekSupport1En: 'If you suffer from repeated injuries when exercising',
    seekSupport2En: 'If you notice no improvement despite consistent exercise',
  },
  {
    // EN: Choosing the Right Activity Based on Your Energy Levels
    titleAr: 'كيف تختار نشاطًا يناسب يومك؟',
    subtitleAr: 'التخطيط المرن خير من الروتين الجامد',
    bullet1Ar: 'قيّم طاقتك قبل اختيار النشاط، لا تتبع جدولًا صارمًا',
    bullet2Ar: 'في الأيام عالية الطاقة:جري أو سباحة أو تمارين قوية',
    bullet3Ar: 'في الأيام منخفضة الطاقة: مشي قصير أو إطالة أو تمارين خفيفة',
    bullet4Ar: 'خمس دقائق أفضل من صفر، أي حركة خير من لا شيء',
    seekSupport1Ar: 'إذا فقدت الدافع للرياضة بشكل كامل ومستمر لأسابيع',
    seekSupport2Ar: 'إذا كانت لديك إصابات تمنعك من معظم الأنشطة البدنية',
    // English
    titleEn: 'Choosing the Right Activity Based on Your Energy Levels',
    subtitleEn: 'Flexible planning beats a rigid routine',
    bullet1En: 'Assess your energy before choosing an activity — do not follow a strict schedule',
    bullet2En: 'On high-energy days: running, swimming, or strength exercise',
    bullet3En: 'On low-energy days: a short walk, stretching, or light exercises',
    bullet4En: 'Five minutes is better than zero — any movement is better than none',
    seekSupport1En: 'If you have completely lost motivation for exercise for weeks',
    seekSupport2En: 'If injuries prevent you from most physical activities',
  },
  {
    // EN: Safe Steps to Build a Lasting Fitness Habit
    titleAr: 'خطوات آمنة لبناء عادة رياضية',
    subtitleAr: 'الاستمرار أهم من الكمال',
    bullet1Ar: 'حدد هدفًا واقعيًا: كم دقيقة في الأسبوع؟ ابدأ صغيرة',
    bullet2Ar: 'اربط التمرين عادة موجودة مثل: بعد الاستيقاظ أو بعد القهوة',
    bullet3Ar: 'استخدم تقويمًا لتتبع أيام الاستمرار، الاستمرار هو الهدف',
    bullet4Ar: 'لا تقارن نفسك بأيام كنت فيها في قمة اللياقة، تقدمك هو المهم',
    seekSupport1Ar: 'إذا فقدت الدافع تمامًا ولا تستطيع الالتزام بتمرين واحد',
    seekSupport2Ar: 'إذا كنت تعاني من إصابات متكررة تعيقك عن الاستمرار',
    // English
    titleEn: 'Safe Steps to Build a Lasting Fitness Habit',
    subtitleEn: 'Consistency matters more than perfection',
    bullet1En: 'Set a realistic goal: how many minutes per week? Start small',
    bullet2En: 'Tie exercise to an existing habit like after waking up or after coffee',
    bullet3En: 'Use a calendar to track your consistency days — that is the real goal',
    bullet4En: 'Do not compare yourself to when you were at peak fitness — your progress is what counts',
    seekSupport1En: 'If you have completely lost motivation and cannot commit to even one session',
    seekSupport2En: 'If repeated injuries prevent you from continuing',
  },
];

const SLEEP_TOPICS = [
  {
    // EN: An Evening Routine That Helps You Fall Asleep Faster
    titleAr: 'روتين مسائي يساعدك على النوم',
    subtitleAr: 'تحضير الجسم للنوم يبدأ قبل ساعة على الأقل',
    bullet1Ar: 'أطفئ الشاشات قبل النوم بساعة على الأقل، الضوء الأزرق يثبط الميلاتونين',
    bullet2Ar: 'اخفت الأضواء في المنزل في الساعة الأخيرة قبل النوم',
    bullet3Ar: 'دفّن أفكارك في دفتر لمدة خمس دقائق لتفريغ العقل',
    bullet4Ar: 'حافظ على موعد نوم واستيقاظ ثابت حتى في العطلات',
    seekSupport1Ar: 'إذا كنت تعاني من الأرق المزمن ولا تستطيع النوم رغم التعب',
    seekSupport2Ar: 'إذا كنت تستيقظ مرارًا خلال الليل ولا تعود للنوم بسهولة',
    // English
    titleEn: 'An Evening Routine That Helps You Fall Asleep Faster',
    subtitleEn: 'Preparing your body for sleep starts at least one hour before',
    bullet1En: 'Turn off screens at least one hour before bed — blue light suppresses melatonin',
    bullet2En: 'Dim the lights in your home during the last hour before sleep',
    bullet3En: 'Jot down your thoughts in a notebook for five minutes to clear your mind',
    bullet4En: 'Keep a consistent sleep and wake time even on weekends',
    seekSupport1En: 'If you suffer from chronic insomnia and cannot sleep despite fatigue',
    seekSupport2En: 'If you wake up multiple times during the night and cannot fall back asleep easily',
  },
  {
    // EN: How Poor Sleep Affects Your Mood and Emotions
    titleAr: 'كيف يؤثر النوم على المزاج؟',
    subtitleAr: 'عدم النوم الكافي يجعلك سريع الغضب',
    bullet1Ar: 'عدم النوم الكافي يجعل المنطقة المسؤولة عن العواطف في الدماغ أكثر نشاطًا',
    bullet2Ar: 'اتخاذ القرارات يتأثر بشكل كبير بعد ليلة بلا نوم كافية',
    bullet3Ar: 'البالغون يحتاجون بين سبع وتسع ساعات نوم فعلي',
    bullet4Ar: 'النوم الجيد يتحسن بالثبات في مواعيد النوم والاستيقاظ',
    seekSupport1Ar: 'إذا كنت تعاني من الأرق المزمن الذي يؤثر على حياتك اليومية',
    seekSupport2Ar: 'إذا كنت تستيقظ متعبًا رغم النوم ثماني ساعات أو أكثر',
    // English
    titleEn: 'How Poor Sleep Affects Your Mood and Emotions',
    subtitleEn: 'Not getting enough sleep makes you quick to anger',
    bullet1En: 'Insufficient sleep makes the brain region responsible for emotions more reactive',
    bullet2En: 'Decision-making is significantly affected after even one night of poor sleep',
    bullet3En: 'Adults need between seven and nine hours of actual sleep',
    bullet4En: 'Good sleep improves with consistent sleep and wake times',
    seekSupport1En: 'If you suffer from chronic insomnia that affects your daily life',
    seekSupport2En: 'If you wake up tired despite sleeping eight or more hours',
  },
  {
    // EN: What to Do When You Wake Up Feeling Exhausted
    titleAr: 'ماذا تفعل عندما تستيقظ مرهقًا؟',
    subtitleAr: 'التحقق من أسباب الليلة الماضية',
    bullet1Ar: 'افتح النافذة واحصل على ضوء شمس خلال خمس عشرة دقيقة من الاستيقاظ',
    bullet2Ar: 'اشرب كوبًا كاملًا من الماء، الجفاف يسبب إرهاقًا إضافيًا',
    bullet3Ar: 'قم بتمارين إطالة خفيفة لمدة خمس دقائق لتنشيط الدورة الدموية',
    bullet4Ar: 'راجع: هل كانت الغرفة باردة أو ساخنة أكثر من اللازم؟',
    seekSupport1Ar: 'إذا استمر الإرهاق لأسابيع رغم تحسين عادات النوم',
    seekSupport2Ar: 'إذا كان الإرهاق مصحوبًا بأعراض جسدية أخرى مستمرة',
    // English
    titleEn: 'What to Do When You Wake Up Feeling Exhausted',
    subtitleEn: 'Investigating last night\'s causes',
    bullet1En: 'Open a window and get sunlight within fifteen minutes of waking',
    bullet2En: 'Drink a full glass of water — dehydration causes additional fatigue',
    bullet3En: 'Do light stretching for five minutes to boost blood circulation',
    bullet4En: 'Ask yourself: was the room too cold or too warm?',
    seekSupport1En: 'If exhaustion persists for weeks despite improving sleep habits',
    seekSupport2En: 'If exhaustion is accompanied by other persistent physical symptoms',
  },
  {
    // EN: Reducing Phone Use Before Bed for Better Sleep Quality
    titleAr: 'تقليل استخدام الهاتف قبل النوم',
    subtitleAr: 'الشاشات تؤثر على جودة النوم أكثر مما نتوقع',
    bullet1Ar: 'انقل شاحن الهاتف إلى مكان بعيد عن السرير',
    bullet2Ar: 'فعّل وضع إضاءة الليل على الهاتف وحدد السطوع لأدنى مستوى',
    bullet3Ar: 'استخدم تطبيقًا لحظر وسائل التواصل في الساعة الأخيرة قبل النوم',
    bullet4Ar: 'البديل الأفضل للتصفح هو كتاب مادي أو دفتر يوميات',
    seekSupport1Ar: 'إذا كنت تعاني من الأرق ولا تستطيع النوم قبل منتصف الليل',
    seekSupport2Ar: 'إذا كنت تستيقظ كثيرًا خلال الليل خاصة بعد استخدام الهاتف المتكرر',
    // English
    titleEn: 'Reducing Phone Use Before Bed for Better Sleep Quality',
    subtitleEn: 'Screens affect sleep quality more than we expect',
    bullet1En: 'Move your phone charger to a place away from the bed',
    bullet2En: 'Enable night light mode and set brightness to the lowest level',
    bullet3En: 'Use an app to block social media during the last hour before bed',
    bullet4En: 'A better alternative to browsing is a physical book or a journal',
    seekSupport1En: 'If you suffer from insomnia and cannot sleep before midnight',
    seekSupport2En: 'If you wake up frequently during the night especially after heavy phone use',
  },
  {
    // EN: Signs Your Body Is Telling You It Needs Rest
    titleAr: 'علامات أن جسمك يحتاج إلى راحة',
    subtitleAr: 'الجسم يرسل إشارات قبل الإنهاك الكامل',
    bullet1Ar: 'إرهاق مستمر لا يتحسن حتى بعد نوم كامل علامة مهمة',
    bullet2Ar: 'أمراض بسيطة ومتكررة تدل على أن الجهاز المناعي يحتاج دعماً',
    bullet3Ar: 'ألم مفصلي أو عضلي يظهر بعد نشاط بدني أقل من المعتاد',
    bullet4Ar: 'الأداء في التمرين ينخفض بشكل ملحوظ يومًا بعد يوم',
    seekSupport1Ar: 'إذا استمر الإرهاق لأسابيع رغم النوم والراحة الكافيين',
    seekSupport2Ar: 'إذا صاحب الإرهاق أعراض قلق أو اكتئاب واضحة ومستمرة',
    // English
    titleEn: 'Signs Your Body Is Telling You It Needs Rest',
    subtitleEn: 'The body sends signals before complete burnout',
    bullet1En: 'Persistent fatigue that does not improve even after full sleep is an important sign',
    bullet2En: 'Frequent minor illnesses indicate your immune system needs support',
    bullet3En: 'Joint or muscle pain appearing after less activity than usual',
    bullet4En: 'Exercise performance drops noticeably day after day',
    seekSupport1En: 'If fatigue persists for weeks despite adequate sleep and rest',
    seekSupport2En: 'If fatigue is accompanied by clear and persistent anxiety or depression symptoms',
  },
];

const RELATIONSHIPS_TOPICS = [
  {
    // EN: How to Ask for Support from Someone Close to You
    titleAr: 'كيف تطلب الدعم من شخص قريب؟',
    subtitleAr: 'طلب المساعدة علامة قوة وليست ضعف',
    bullet1Ar: 'كن محددًا: ماذا تحتاج بالضبط؟ الدعم المعنوي أم النصيحة أم الاستماع فقط',
    bullet2Ar: 'اختر لحظة هادئة للطلب، ليس في وسط خلاف',
    bullet3Ar: 'امنح الشخص وقتًا للتفكير قبل أن يتوقع ردًا فوريًا',
    bullet4Ar: 'إذا قال لا، لا تأخذه بشكل شخصي، الشخص قد لا يستطيع في هذا الوقت',
    seekSupport1Ar: 'إذا كنت تمر بأزمة علاقة تؤثر على صحتك النفسية بشكل كبير',
    seekSupport2Ar: 'إذا طلبت الدعم عدة مرات من أشخاص مختلفين ولم تحصل على استجابة',
    // English
    titleEn: 'How to Ask for Support from Someone Close to You',
    subtitleEn: 'Asking for help is a sign of strength, not weakness',
    bullet1En: 'Be specific: what do you actually need? Emotional support, advice, or just listening?',
    bullet2En: 'Choose a calm moment to ask — not in the middle of a conflict',
    bullet3En: 'Give the person time to think before expecting an immediate response',
    bullet4En: 'If they say no, do not take it personally — they may not be able to right now',
    seekSupport1En: 'If you are going through a relationship crisis that significantly affects your mental health',
    seekSupport2En: 'If you have asked for support multiple times from different people with no response',
  },
  {
    // EN: Setting Healthy Boundaries in Your Daily Relationships
    titleAr: 'حدود صحية في العلاقات اليومية',
    subtitleAr: 'الحدود الواضحة تجعل العلاقات أقوى',
    bullet1Ar: 'الحدود الصحية تعني أنك تعرف ما تقبله وما لا',
    bullet2Ar: 'عبّر عن حدودك بوضوح وبهدوء، لا بشكل هجومي',
    bullet3Ar: 'الحدود لا تعني أن تحرم الآخر، بل تحمي طاقتك النفسية',
    bullet4Ar: 'الاستمرارية في تطبيق الحدود هي ما يجعلها فعّالة',
    seekSupport1Ar: 'إذا كنت تشعر بالاستنزاف بعد كل تفاعل مع شخص محدد',
    seekSupport2Ar: 'إذا وجدت نفسك تقول نعم دائمًا بينما تريد أن تقول لا',
    // English
    titleEn: 'Setting Healthy Boundaries in Your Daily Relationships',
    subtitleEn: 'Clear boundaries actually make relationships stronger',
    bullet1En: 'Healthy boundaries mean you know what you are willing to accept and what you are not',
    bullet2En: 'Communicate your boundaries clearly and calmly, not aggressively',
    bullet3En: 'Boundaries do not mean depriving the other person — they protect your own energy',
    bullet4En: 'Consistency in applying boundaries is what makes them work',
    seekSupport1En: 'If you feel drained after every interaction with a specific person',
    seekSupport2En: 'If you find yourself always saying yes when you want to say no',
  },
  {
    // EN: Handling Conflicts Without Escalation
    titleAr: 'التعامل مع الخلافات بدون تصعيد',
    subtitleAr: 'فن الحوار الهادئ عند ارتفاع المشاعر',
    bullet1Ar: 'قبل أن ترد، خذ نفسًا عميقًا واسأل نفسك: هل يستحق هذا العناء؟',
    bullet2Ar: 'استخدم جمل أنا: شعرت بـ بدلًا من أن تقول أنت دائمًا أو أبدًا',
    bullet3Ar: 'إذا ارتفعت المشاعر، اطلب استراحة عشرين دقيقة و عُد لاحقًا',
    bullet4Ar: 'الهدف ليس التحدي بل إيجاد حل يناسب الطرفين',
    seekSupport1Ar: 'إذا تحولت الخلافات المتكررة إلى صراعات لفظية أو جسدية',
    seekSupport2Ar: 'إذا كنت تعاني من قلق أو خوف قبل كل محادثة صعبة',
    // English
    titleEn: 'Handling Conflicts Without Escalation',
    subtitleEn: 'The art of calm dialogue when emotions run high',
    bullet1En: 'Before responding, take a deep breath and ask yourself: is this worth the energy?',
    bullet2En: 'Use I-statements: I felt hurt rather than you always/never',
    bullet3En: 'If emotions rise, ask for a twenty-minute break and return later',
    bullet4En: 'The goal is not winning the argument — it is finding a resolution that works for both',
    seekSupport1En: 'If repeated conflicts turn into verbal or physical confrontations',
    seekSupport2En: 'If you suffer from anxiety or dread before every difficult conversation',
  },
  {
    // EN: When Does a Family Need Counseling?
    titleAr: 'متى تحتاج الأسرة إلى جلسة إرشاد؟',
    subtitleAr: 'العلاج الأسري خيار وليس اعترافًا بالفشل',
    bullet1Ar: 'عندما يستمر سوء الفهم بين أفراد الأسرة لأسابيع بدون حل',
    bullet2Ar: 'عندما تتسبب مرحلة انتقالية كبيرة في توتر على جميع أفراد الأسرة',
    bullet3Ar: 'عندما يظهر أحد أفراد الأسرة علامات صراع واضحة يلاحظها الآخرون',
    bullet4Ar: 'جلسة واحدة تقييمية يمكن أن توفر توجيهًا واضحًا',
    seekSupport1Ar: 'إذا كانت الخلافات الأسرية تؤثر على الأداء في العمل أو الدراسة',
    seekSupport2Ar: 'إذا رفض جميع أفراد الأسرة المشاركة حتى في محادثة واحدة',
    // English
    titleEn: 'When Does a Family Need Counseling?',
    subtitleEn: 'Family therapy is an option, not an admission of failure',
    bullet1En: 'When misunderstanding among family members persists for weeks without resolution',
    bullet2En: 'When a major life transition creates strain on all family members',
    bullet3En: 'When one family member shows signs of struggle that others have noticed',
    bullet4En: 'One assessment session can provide clear direction',
    seekSupport1En: 'If family conflicts are affecting school or work performance',
    seekSupport2En: 'If all family members refuse to participate even in one conversation',
  },
  {
    // EN: How to Really Listen to Someone Going Through a Hard Time
    titleAr: 'كيف تستمع لشخص يمر بضغط؟',
    subtitleAr: 'الاستماع الجيد هو أحسن هدية يمكنك تقديمها',
    bullet1Ar: 'أعطِ انتباهك الكامل، أطفئ الشاشات وحافظ على التواصل البصري',
    bullet2Ar: 'أعد صياغة ما سمعته: إذن ما أفهمه هو أنك تشعر بـ',
    bullet3Ar: 'اسأل أسئلة مفتوحة: كيف جعلك ذلك تشعر؟ بدلًا من محاولة الإصلاح',
    bullet4Ar: 'لا تقلل من مشاعره ولا تقارن تجربتك بتجربته',
    seekSupport1Ar: 'إذا شعرت أن شخصًا قريبًا يمر بأزمة ولا تستطيع مساعدته بمفردك',
    seekSupport2Ar: 'إذا كان الشخص يذكر أفكارًا عن إيذاء النفس',
    // English
    titleEn: 'How to Really Listen to Someone Going Through a Hard Time',
    subtitleEn: 'Good listening is the best gift you can give',
    bullet1En: 'Give your full attention — turn off screens and maintain eye contact',
    bullet2En: 'Paraphrase what you heard: so what I understand is that you feel',
    bullet3En: 'Ask open questions: how did that make you feel? rather than trying to fix it',
    bullet4En: 'Do not minimize their feelings or compare your experience to theirs',
    seekSupport1En: 'If someone close is going through a crisis and you cannot help alone',
    seekSupport2En: 'If the person mentions thoughts of self-harm',
  },
];

const DAILY_HABITS_TOPICS = [
  {
    // EN: One Small Habit That Can Change Your Entire Day
    titleAr: 'عادة واحدة صغيرة قد تغير يومك',
    subtitleAr: 'عادة واحدة في الوقت هو الأسلوب المستدام',
    bullet1Ar: 'اختر عادة واحدة فقط، عندما تصبح تلقائية أضف التالية',
    bullet2Ar: 'اربطها بعادة موجودة: بعد الاستيقاظ أو بعد تنظيف الأسنان',
    bullet3Ar: 'خمس دقائق هي المدة القصوى للمحافظة على الاستمرار',
    bullet4Ar: 'سجّل تقدمك في تقويم، الاستمرار هو ما يحفز',
    seekSupport1Ar: 'إذا كنت غير قادر على الالتزام حتى عادة واحدة بسيطة لمدة أسبوعين',
    seekSupport2Ar: 'إذا كانت هناك أسباب نفسية أعمق تمنعك من بناء أي روتين',
    // English
    titleEn: 'One Small Habit That Can Change Your Entire Day',
    subtitleEn: 'One habit at a time is the sustainable approach',
    bullet1En: 'Choose only one habit — when it becomes automatic, add the next',
    bullet2En: 'Tie it to an existing habit: after waking up or after brushing your teeth',
    bullet3En: 'Five minutes maximum is the key to maintaining consistency',
    bullet4En: 'Track your progress on a calendar — consistency is what motivates',
    seekSupport1En: 'If you cannot commit to even one simple habit for two weeks',
    seekSupport2En: 'If deeper psychological reasons prevent you from building any routine',
  },
  {
    // EN: How to Stick to a Simple Routine Without Overcomplicating It
    titleAr: 'كيف تلتزم بروتين بسيط؟',
    subtitleAr: 'البساطة تتفوق على التعقيد الذي يؤدي إلى الفشل',
    bullet1Ar: 'لا تحاول تطبيق كل شيء دفعة واحدة، غيّر سلوكًا واحدًا في كل مرة',
    bullet2Ar: 'راجع أسبوعك كل جمعة: ما الذي نجح؟ ماذا يحتاج تعديل؟',
    bullet3Ar: 'عد إلى الروتين فورًا إذا فوّت يومًا، لا تستسلم تمامًا',
    bullet4Ar: 'السماحة والمرونة لا تجعل الخطة عديمة المعنى، خطط أسبوعيًا لا يوميًا',
    seekSupport1Ar: 'إذا وجدت نفسك غير قادر على الالتزام بأي روتين رغم محاولات متعددة',
    seekSupport2Ar: 'إذا كان عدم الاستقرار في الروتين يؤثر على مزاجك أو إنتاجيتك بشكل يومي',
    // English
    titleEn: 'How to Stick to a Simple Routine Without Overcomplicating It',
    subtitleEn: 'Simplicity beats the complexity that leads to failure',
    bullet1En: 'Do not try to apply everything at once — change one behavior at a time',
    bullet2En: 'Review your week every Friday: what worked? What needs adjustment?',
    bullet3En: 'Return to the routine immediately if you miss a day — do not give up entirely',
    bullet4En: 'Allow flexibility without making it meaningless — plan weekly not daily',
    seekSupport1En: 'If you find yourself unable to maintain any routine despite multiple attempts',
    seekSupport2En: 'If lack of routine is affecting your mood or productivity daily',
  },
  {
    // EN: Organizing Your Day When You Are Feeling Exhausted
    titleAr: 'تنظيم اليوم عند الشعور بالإرهاق',
    subtitleAr: 'التخطيط بأقل قدر ممكن يتصدى من الفوضى',
    bullet1Ar: 'المهام الثلاث فقط في اليوم، ابدأ بالأصعب',
    bullet2Ar: 'قطع المهام غير الضرورية: الاجتماعات والالتزامات غير الضرورية',
    bullet3Ar: 'قسّم العمل إلى أجزاء من 25 دقيقة مع استراحة 25 دقيقة بينها',
    bullet4Ar: 'النجاح في يوم صعب لا يزال انتصارًا، إنجاز وليس فشلًا',
    seekSupport1Ar: 'إذا كان الإرهاق المزمن يمنعك من أداء المهام اليومية الأساسية',
    seekSupport2Ar: 'إذا كان الإرهاق مصحوبًا بأعراض اكتئاب أو قلق واضحة',
    // English
    titleEn: 'Organizing Your Day When You Are Feeling Exhausted',
    subtitleEn: 'Minimal planning protects you from chaos',
    bullet1En: 'Only three tasks per day — start with the hardest one first',
    bullet2En: 'Cut unnecessary tasks: non-essential meetings and commitments',
    bullet3En: 'Break work into twenty-five minute chunks with breaks between',
    bullet4En: 'Surviving a hard day is still a win — that is not failure',
    seekSupport1En: 'If chronic exhaustion prevents you from performing basic daily tasks',
    seekSupport2En: 'If exhaustion is accompanied by clear symptoms of depression or anxiety',
  },
  {
    // EN: Using a Notebook to Reduce Mental Overwhelm
    titleAr: 'استخدام دفتر الملاحظات لتخفيف التشتت',
    subtitleAr: 'نقل الأفكار من الرأس إلى الورق يحرر الذاكرة العاملة',
    bullet1Ar: 'سجّل أي شيء يشغل بالك: مهام، مخاوف، أفكار، أفكار',
    bullet2Ar: 'الفعل الكتابة هو المهم، وليس جودة ما تكتبه',
    bullet3Ar: 'دفتر الهموم منفصل عن دفتر حل المشكلات',
    bullet4Ar: 'خمس دقائق قبل النوم لتفريغ قائمة المهام لليوم التالي',
    seekSupport1Ar: 'إذا كنت تعاني من أفكار متسارعة تمنعك من النوم',
    seekSupport2Ar: 'إذا كنت غير قادر على التركيز في العمل بسبب الحمل الذهني',
    // English
    titleEn: 'Using a Notebook to Reduce Mental Overwhelm',
    subtitleEn: 'Transferring thoughts from your head to paper frees working memory',
    bullet1En: 'Write down anything on your mind: tasks, worries, ideas, thoughts',
    bullet2En: 'The act of writing itself is what matters — not the quality of what you write',
    bullet3En: 'Keep a worry journal separate from a problem-solving journal',
    bullet4En: 'Five minutes before bed to clear the mental to-do list for tomorrow',
    seekSupport1En: 'If racing thoughts prevent you from falling asleep',
    seekSupport2En: 'If you cannot concentrate at work due to mental overload',
  },
  {
    // EN: A Calm Way to Review Your Week Without Self-Judgment
    titleAr: 'كيف تراجع أسبوعك بهدوء؟',
    subtitleAr: 'مراجعة أسبوعية قصيرة بدون أحكام',
    bullet1Ar: 'ما الذي نجح جيدًا هذا الأسبوع؟ عنصرين أو ثلاثة فقط',
    bullet2Ar: 'ما الذي شكّل تحديًا هذا الأسبوع؟ عنصرين أو ثلاثة',
    bullet3Ar: 'شيء واحد سأفعله بشكل مختلف الأسبوع القادم، فقط واحد',
    bullet4Ar: 'الجمعة أو المساء وليس الاثنين صباحًا',
    seekSupport1Ar: 'إذا كنت غير قادر على تحديد أي تقدم أو تحسّن في حياتك',
    seekSupport2Ar: 'إذا كانت المراجعة تتحول دائمًا إلى جلسة عتاب بدلًا من التعلم',
    // English
    titleEn: 'A Calm Way to Review Your Week Without Self-Judgment',
    subtitleEn: 'A short weekly review without judgment',
    bullet1En: 'What went well this week? Only two or three items',
    bullet2En: 'What challenged me? Two or three items maximum',
    bullet3En: 'One thing I will do differently next week — just one',
    bullet4En: 'Friday afternoon or Sunday evening — not Monday morning',
    seekSupport1En: 'If you cannot identify any progress or improvement in your life',
    seekSupport2En: 'If the review always turns into a guilt session instead of learning',
  },
];

// ─── Build all 30 published articles ─────────────────────────────────────

type Topic = (typeof MH_TOPICS)[number];

function makeArticle(
  slugAr: string,
  slugEn: string,
  topic: Topic,
  categorySlugRoot: string,
  authorKey: string,
  publishedAtDaysAgo: number,
  hasCover: boolean,
): ArticleSeedEntry {
  return {
    slugAr,
    slugEn,
    titleAr: topic.titleAr,
    titleEn: topic.titleEn,
    excerptAr: `تعرف على أهم جوانب ${topic.titleAr} في هذا المقال المفصل. نقدم لك خطوات عملية مدعومة بالتخصص.`,
    excerptEn: `Learn about ${topic.titleEn} in this comprehensive article. We provide practical steps backed by expert guidance.`,
    contentAr: buildArabicContent(topic),
    contentEn: buildEnglishContent(topic),
    authorSeedKey: authorKey,
    categorySlugRoot,
    publishedAtDaysAgo,
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    hasCover,
  };
}

// Published articles: 5 per category × 6 categories = 30
export const PUBLISHED_ARTICLES: ArticleSeedEntry[] = [
  // Mental Health (5)
  makeArticle('calm-thoughts-before-first-session', 'calm-thoughts-before-first-session', MH_TOPICS[0], 'mental-health', 'practitionerB', 3, true),
  makeArticle('signs-you-need-mental-health-support', 'signs-you-need-mental-health-support', MH_TOPICS[1], 'mental-health', 'practitionerB', 18, true),
  makeArticle('managing-morning-anxiety', 'managing-morning-anxiety', MH_TOPICS[2], 'mental-health', 'practitionerB', 45, true),
  makeArticle('sadness-vs-prolonged-stress', 'sadness-vs-prolonged-stress', MH_TOPICS[3], 'mental-health', 'practitionerB', 60, true),
  makeArticle('small-habits-for-emotional-balance', 'small-habits-for-emotional-balance', MH_TOPICS[4], 'mental-health', 'practitionerB', 90, false), // null cover

  // Nutrition (5)
  makeArticle('food-and-mood-connection', 'food-and-mood-connection', NUTR_TOPICS[0], 'nutrition', 'practitionerB', 12, true),
  makeArticle('start-healthy-eating-without-denial', 'start-healthy-eating-without-denial', NUTR_TOPICS[1], 'nutrition', 'practitionerB', 30, true),
  makeArticle('simple-meals-for-focus', 'simple-meals-for-focus', NUTR_TOPICS[2], 'nutrition', 'practitionerB', 55, true),
  makeArticle('reading-hunger-fullness-signals', 'reading-hunger-fullness-signals', NUTR_TOPICS[3], 'nutrition', 'practitionerB', 75, true),
  makeArticle('common-nutrition-mistakes', 'common-nutrition-mistakes', NUTR_TOPICS[4], 'nutrition', 'practitionerB', 100, false), // null cover

  // Fitness (5)
  makeArticle('start-moving-after-inactivity', 'start-moving-after-inactivity', FITNESS_TOPICS[0], 'fitness', 'practitionerB', 20, true),
  makeArticle('simple-exercises-for-daily-energy', 'simple-exercises-for-daily-energy', FITNESS_TOPICS[1], 'fitness', 'practitionerB', 50, true),
  makeArticle('rest-is-part-of-exercise', 'rest-is-part-of-exercise', FITNESS_TOPICS[2], 'fitness', 'practitionerB', 68, true),
  makeArticle('choosing-right-activity-for-day', 'choosing-right-activity-for-day', FITNESS_TOPICS[3], 'fitness', 'practitionerB', 85, true),
  makeArticle('building-safe-fitness-habit', 'building-safe-fitness-habit', FITNESS_TOPICS[4], 'fitness', 'practitionerB', 110, false), // null cover

  // Sleep (5)
  makeArticle('evening-routine-for-better-sleep', 'evening-routine-for-better-sleep', SLEEP_TOPICS[0], 'sleep', 'practitionerB', 7, true),
  makeArticle('how-sleep-affects-mood', 'how-sleep-affects-mood', SLEEP_TOPICS[1], 'sleep', 'practitionerB', 25, true),
  makeArticle('waking-up-feeling-tired', 'waking-up-feeling-tired', SLEEP_TOPICS[2], 'sleep', 'practitionerB', 40, true),
  makeArticle('reduce-phone-before-sleep', 'reduce-phone-before-sleep', SLEEP_TOPICS[3], 'sleep', 'practitionerB', 65, true),
  makeArticle('signs-body-needs-rest', 'signs-body-needs-rest', SLEEP_TOPICS[4], 'sleep', 'practitionerB', 80, false), // null cover

  // Relationships (5)
  makeArticle('asking-support-from-close-person', 'asking-support-from-close-person', RELATIONSHIPS_TOPICS[0], 'relationships', 'practitionerB', 14, true),
  makeArticle('healthy-relationship-boundaries', 'healthy-relationship-boundaries', RELATIONSHIPS_TOPICS[1], 'relationships', 'practitionerB', 35, true),
  makeArticle('handling-conflicts-without-escalation', 'handling-conflicts-without-escalation', RELATIONSHIPS_TOPICS[2], 'relationships', 'practitionerB', 58, true),
  makeArticle('when-family-needs-counseling', 'when-family-needs-counseling', RELATIONSHIPS_TOPICS[3], 'relationships', 'practitionerB', 78, true),
  makeArticle('how-to-listen-to-stressed-person', 'how-to-listen-to-stressed-person', RELATIONSHIPS_TOPICS[4], 'relationships', 'practitionerB', 95, false), // null cover

  // Daily Habits (5)
  makeArticle('one-small-habit-can-change-day', 'one-small-habit-can-change-day', DAILY_HABITS_TOPICS[0], 'daily-habits', 'practitionerB', 10, true),
  makeArticle('how-to-stick-to-simple-routine', 'how-to-stick-to-simple-routine', DAILY_HABITS_TOPICS[1], 'daily-habits', 'practitionerB', 33, true),
  makeArticle('organizing-day-when-exhausted', 'organizing-day-when-exhausted', DAILY_HABITS_TOPICS[2], 'daily-habits', 'practitionerB', 48, true),
  makeArticle('using-notebook-reduce-distraction', 'using-notebook-reduce-distraction', DAILY_HABITS_TOPICS[3], 'daily-habits', 'practitionerB', 72, true),
  makeArticle('reviewing-week-calmly', 'reviewing-week-calmly', DAILY_HABITS_TOPICS[4], 'daily-habits', 'practitionerB', 105, false), // null cover
];

// 2 Draft articles
export const DRAFT_ARTICLES: ArticleSeedEntry[] = [
  {
    slugAr: 'draft-stress-management-techniques',
    slugEn: 'draft-stress-management-techniques',
    titleAr: 'تقنيات إدارة التوتر (مسودة)',
    titleEn: 'Stress Management Techniques (Draft)',
    excerptAr: 'هذا المقال لا يزال قيد الإعداد ولم ينشر بعد.',
    excerptEn: 'This article is still being prepared and has not been published yet.',
    contentAr: '## مسودة\n\nهذا المقال قيد الإعداد.',
    contentEn: '## Draft\n\nThis article is still being prepared.',
    authorSeedKey: 'practitionerB',
    categorySlugRoot: 'mental-health',
    publishedAtDaysAgo: 5,
    status: 'DRAFT',
    visibility: 'PRIVATE',
    hasCover: false,
  },
  {
    slugAr: 'draft-nutrition-myths-debunked',
    slugEn: 'draft-nutrition-myths-debunked',
    titleAr: 'أساطير التغذية الشائعة (مسودة)',
    titleEn: 'Common Nutrition Myths Debunked (Draft)',
    excerptAr: 'هذا المقال لا يزال قيد الإعداد ولم ينشر بعد.',
    excerptEn: 'This article is still being prepared and has not been published yet.',
    contentAr: '## مسودة\n\nهذا المقال قيد الإعداد.',
    contentEn: '## Draft\n\nThis article is still being prepared.',
    authorSeedKey: 'practitionerB',
    categorySlugRoot: 'nutrition',
    publishedAtDaysAgo: 3,
    status: 'DRAFT',
    visibility: 'PRIVATE',
    hasCover: false,
  },
];

// 1 Scheduled future article
export const SCHEDULED_ARTICLE: ArticleSeedEntry = {
  slugAr: 'scheduled-relationship-trust-building',
  slugEn: 'scheduled-relationship-trust-building',
  titleAr: 'بناء الثقة في العلاقات (مجدول)',
  titleEn: 'Building Trust in Relationships (Scheduled)',
  excerptAr: 'هذا المقال سيُنشر قريبًا.',
  excerptEn: 'This article will be published soon.',
  contentAr: '## مجدول\n\nهذا المقال لم ينشر بعد وهو مجدول للنشر.',
  contentEn: '## Scheduled\n\nThis article has not been published yet.',
  authorSeedKey: 'practitionerB',
  categorySlugRoot: 'relationships',
  publishedAtDaysAgo: 1,
  status: 'SUBMITTED',
  visibility: 'PUBLIC',
  scheduledDaysFromNow: 14,
  hasCover: false,
};
