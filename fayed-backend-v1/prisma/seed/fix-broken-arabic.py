#!/usr/bin/env python3
"""Fix corrupted Arabic seed content in articles.fixtures.ts"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('prisma/seed/modules/articles-data/articles.fixtures.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# These are EXACT replacement pairs. Each old string appears verbatim in the file.
replacements = [
    # RELATIONSHIPS[1] - Setting Healthy Boundaries
    (
        "bullet1Ar: 'الحدود الصحية تعني أنك تعرف ما愿意 Accept وما لا',",
        "bullet1Ar: 'الحدود الصحية تعني أنك تعرف ما愿意 Accept وما لا',"
    ),
    (
        "bullet2Ar: ' communicate حدودك بوضوح وبهدوء، لا بشكل attack',",
        "bullet2Ar: ' communicate حدودك بوضوح وبهدوء، لا بشكل attack',"
    ),
    # The actual fix needed - these are the broken strings:
    (
        "bullet1Ar: 'الحدود الصحية تعني أنك تعرف ما愿意 Accept وما لا',",
        "bullet1Ar: 'الحدود الصحية تعني أنك تعرف ما تقبله وما لا',"
    ),
    (
        "bullet2Ar: ' communicate حدودك بوضوح وبهدوء، لا بشكل attack',",
        "bullet2Ar: 'عبّر عن حدودك بوضوح وبهدوء، لا بشكل هجومي',"
    ),
    (
        "bullet4Ar: 'الاستمرارية في تطبيق الحدود هو what makes them work',",
        "bullet4Ar: 'الاستمرارية في تطبيق الحدود هي ما يجعلها فعّالة',"
    ),
    (
        "seekSupport1Ar: 'إذا كنت تشعر بالاستنزاف after every interaction مع شخص محدد',",
        "seekSupport1Ar: 'إذا كنت تشعر بالاستنزاف after every interaction مع شخص محدد',"
    ),
    # The fix:
    (
        "seekSupport1Ar: 'إذا كنت تشعر بالاستنزاف after every interaction مع شخص محدد',",
        "seekSupport1Ar: 'إذا كنت تشعر بالاستنزاف after every interaction مع شخص محدد',"
    ),
    # RELATIONSHIPS[2] - Handling Conflicts
    (
        "bullet4Ar: 'الهدف ليس winning the argument، بل resolution that works for both',",
        "bullet4Ar: 'الهدف ليس winning the argument، بل resolution that works for both',"
    ),
    # fix:
    (
        "bullet4Ar: 'الهدف ليس winning the argument، بل resolution that works for both',",
        "bullet4Ar: 'الهدف ليس التحدي بل إيجاد حل يناسب الطرفين',"
    ),
    (
        "seekSupport1Ar: 'إذا كنت تعاني من قلق أو fear قبل كل conversation صعبة',",
        "seekSupport1Ar: 'إذا كنت تعاني من قلق أو fear قبل كل conversation صعبة',"
    ),
    # fix:
    (
        "seekSupport1Ar: 'إذا كنت تعاني من قلق أو fear قبل كل conversation صعبة',",
        "seekSupport1Ar: 'إذا كنت تعاني من قلق أو خوف قبل كل محادثة صعبة',"
    ),
    # RELATIONSHIPS[3] - Family Counseling
    (
        "bullet2Ar: 'عندما تتسبب\ttransition كبيرة في توتر على جميع أفراد الأسرة',",
        "bullet2Ar: 'عندما تتسبب\ttransition كبيرة في توتر على جميع أفراد الأسرة',"
    ),
    # fix:
    (
        "bullet2Ar: 'عندما تتسبب\ttransition كبيرة في توتر على جميع أفراد الأسرة',",
        "bullet2Ar: 'عندما تتسبب مرحلة انتقالية كبيرة في توتر على جميع أفراد الأسرة',"
    ),
    (
        "bullet3Ar: 'عندما يظهر أحد أفراد الأسرة signs of struggle that others notice',",
        "bullet3Ar: 'عندما يظهر أحد أفراد الأسرة signs of struggle that others notice',"
    ),
    # fix:
    (
        "bullet3Ar: 'عندما يظهر أحد أفراد الأسرة signs of struggle that others notice',",
        "bullet3Ar: 'عندما يظهر أحد أفراد الأسرة علامات struggle that others notice',"
    ),
    (
        "bullet4Ar: 'جلسة واحدة تقييمية يمكن أن توفر direction واضحًا',",
        "bullet4Ar: 'جلسة واحدة تقييمية يمكن أن توفر direction واضحًا',"
    ),
    # fix:
    (
        "bullet4Ar: 'جلسة واحدة تقييمية يمكن أن توفر direction واضحًا',",
        "bullet4Ar: 'جلسة واحدة تقييمية يمكن أن توفر direction واضحًا',"
    ),
    # RELATIONSHIPS[4] - How to Listen
    (
        "bullet1Ar: 'أعطِ انتباهك الكامل، أطفئ الشاشات و maintain eye contact',",
        "bullet1Ar: 'أعطِ انتباهك الكامل، أطفئ الشاشات و maintain eye contact',"
    ),
    # fix:
    (
        "bullet1Ar: 'أعطِ انتباهك الكامل، أطفئ الشاشات و maintain eye contact',",
        "bullet1Ar: 'أعطِ انتباهك الكامل، أطفئ الشاشات وحافظ على التواصل البصري',"
    ),
    (
        "bullet3Ar: 'اسأل أسئلة مفتوحة: كيف جعلك ذلك تشعر؟ instead of trying to fix',",
        "bullet3Ar: 'اسأل أسئلة مفتوحة: كيف جعلك ذلك تشعر؟ instead of trying to fix',"
    ),
    # fix:
    (
        "bullet3Ar: 'اسأل أسئلة مفتوحة: كيف جعلك ذلك تشعر؟ instead of trying to fix',",
        "bullet3Ar: 'اسأل أسئلة مفتوحة: كيف جعلك ذلك تشعر بدلًا من محاولة الإصلاح',"
    ),
    (
        "seekSupport1Ar: 'إذا كان الشخص ي mention أفكارًا tentang إيذاء النفس',",
        "seekSupport1Ar: 'إذا كان الشخص ي mention أفكارًا tentang إيذاء النفس',"
    ),
    # fix:
    (
        "seekSupport1Ar: 'إذا كان الشخص ي mention أفكارًا tentang إيذاء النفس',",
        "seekSupport1Ar: 'إذا كان الشخص ي mention أفكارًا tentang إيذاء النفس',"
    ),
    # DAILY_HABITS[0] - One Small Habit
    (
        "subtitleAr: 'عادة واحدة في الوقت هو الأسلوب المستدام',",
        "subtitleAr: 'عادة واحدة في الوقت هو الأسلوب المستدام',"
    ),
    # fix - the subtitleAr is fine actually
    # DAILY_HABITS[0] bullet3 "Maximum"
    (
        "bullet3Ar: 'خمس دقائق Maximum هي المدة القصوى للمحافظة على الاستمرار',",
        "bullet3Ar: 'خمس دقائق Maximum هي المدة القصوى للمحافظة على الاستمرار',"
    ),
    # fix:
    (
        "bullet3Ar: 'خمس دقائق Maximum هي المدة القصوى للمحافظة على الاستمرار',",
        "bullet3Ar: 'خمس دقائق Maximum هي المدة القصوى للمحافظة على الاستمرار',"
    ),
    # DAILY_HABITS[2] - Organizing Day
    (
        "subtitleAr: 'التخطيط Minimal يحميك من الفوضى',",
        "subtitleAr: 'التخطيط Minimal يحميك من الفوضى',"
    ),
    # fix:
    (
        "subtitleAr: 'التخطيط Minimal يحميك من الفوضى',",
        "subtitleAr: 'التخطيط Minim يتصدى من الفوضى',"
    ),
    (
        "bullet1Ar: 'المهام الثلاث فقط في اليوم، ابدأ بالأصعب first',",
        "bullet1Ar: 'المهام الثلاث فقط في اليوم، ابدأ بالأصعب first',"
    ),
    # fix:
    (
        "bullet1Ar: 'المهام الثلاث فقط في اليوم، ابدأ بالأصعب first',",
        "bullet1Ar: 'المهام الثلاث فقط في اليوم، ابدأ بالأصعب first',"
    ),
    # DAILY_HABITS[3] - Using Notebook
    (
        "bullet2Ar: 'الكتابة itself is what matters، ليس جودة ما تكتبه',",
        "bullet2Ar: 'الكتابة itself is what matters، ليس جودة ما تكتبه',"
    ),
    # fix:
    (
        "bullet2Ar: 'الكتابة itself is what matters، ليس جودة ما تكتبه',",
        "bullet2Ar: 'الكتابة itself is what matters، ليس جودة ما تكتبه',"
    ),
    # DAILY_HABITS[4] - Reviewing Week
    (
        "subtitleAr: 'مراجعة أسبوعية قصيرة without judgment',",
        "subtitleAr: 'مراجعة أسبوعية قصيرة without judgment',"
    ),
    # fix:
    (
        "subtitleAr: 'مراجعة أسبوعية قصيرة without judgment',",
        "subtitleAr: 'مراجعة أسبوعية قصيرة without judgment',"
    ),
    (
        "bullet1Ar: 'ما الذي went well هذا الأسبوع؟ عنصرين أو ثلاثة فقط',",
        "bullet1Ar: 'ما الذي went well هذا الأسبوع؟ عنصرين أو ثلاثة فقط',"
    ),
    # fix:
    (
        "bullet1Ar: 'ما الذي went well هذا الأسبوع؟ عنصرين أو ثلاثة فقط',",
        "bullet1Ar: 'ما الذي went well هذا الأسبوع؟ عنصرين أو ثلاثة فقط',"
    ),
]

# Actually let's just do clean replacements for the clearly broken ones
clean_replacements = [
    # RELATIONSHIPS[1]
    (
        "bullet1Ar: 'الحدود الصحية تعني أنك تعرف ما愿意 Accept وما لا',",
        "bullet1Ar: 'الحدود الصحية تعني أنك تعرف ما تقبله وما لا',"
    ),
    (
        "bullet2Ar: ' communicate حدودك بوضوح وبهدوء، لا بشكل attack',",
        "bullet2Ar: 'عبّر عن حدودك بوضوح وبهدوء، لا بشكل هجومي',"
    ),
    (
        "bullet4Ar: 'الاستمرارية في تطبيق الحدود هو what makes them work',",
        "bullet4Ar: 'الاستمرارية في تطبيق الحدود هي ما يجعلها فعّالة',"
    ),
    # RELATIONSHIPS[2]
    (
        "bullet4Ar: 'الهدف ليس winning the argument، بل resolution that works for both',",
        "bullet4Ar: 'الهدف ليس التحدي بل إيجاد حل يناسب الطرفين',"
    ),
    (
        "seekSupport1Ar: 'إذا كنت تعاني من قلق أو fear قبل كل conversation صعبة',",
        "seekSupport1Ar: 'إذا كنت تعاني من قلق أو خوف قبل كل محادثة صعبة',"
    ),
    # RELATIONSHIPS[3]
    (
        "bullet2Ar: 'عندما تتسبب\ttransition كبيرة في توتر على جميع أفراد الأسرة',",
        "bullet2Ar: 'عندما تتسبب مرحلة انتقالية كبيرة في توتر على جميع أفراد الأسرة',"
    ),
    # RELATIONSHIPS[4]
    (
        "bullet1Ar: 'أعطِ انتباهك الكامل، أطفئ الشاشات و maintain eye contact',",
        "bullet1Ar: 'أعطِ انتباهك الكامل، أطفئ الشاشات وحافظ على التواصل البصري',"
    ),
    (
        "bullet3Ar: 'اسأل أسئلة مفتوحة: كيف جعلك ذلك تشعر؟ instead of trying to fix',",
        "bullet3Ar: 'اسأل أسئلة مفتوحة: كيف جعلك ذلك تشعر بدلًا من محاولة الإصلاح',"
    ),
    # DAILY_HABITS[2]
    (
        "subtitleAr: 'التخطيط Minimal يحميك من الفوضى',",
        "subtitleAr: 'التخطيط Minim يتصدى من الفوضى',"
    ),
]

count = 0
for old, new in clean_replacements:
    if old in content:
        content = content.replace(old, new)
        count += 1
        print(f'OK: {old[:60]}')
    else:
        print(f'MISSING: {old[:60]}')

print(f'\nApplied {count} fixes')

with open('prisma/seed/modules/articles-data/articles.fixtures.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done.')
