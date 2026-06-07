// Content generator templates for articles.
// Each function takes topic metadata and returns clean markdown content.
// Arabic template is fully Arabic. English template is fully English.

type Topic = {
  titleAr: string;
  subtitleAr: string;
  bullet1Ar: string;
  bullet2Ar: string;
  bullet3Ar: string;
  bullet4Ar: string;
  seekSupport1Ar: string;
  seekSupport2Ar: string;
  titleEn: string;
  subtitleEn: string;
  bullet1En: string;
  bullet2En: string;
  bullet3En: string;
  bullet4En: string;
  seekSupport1En: string;
  seekSupport2En: string;
};

export function buildArabicContent(t: Topic): string {
  return `## مقدمة

${t.titleAr} من الموضوعات المهمة التي تساعدك على فهم نفسك بشكل أعمق. في هذا المقال نستعرض أفكارًا عملية مدعومة بالبحث العلمي.

## لماذا هذا مهم؟

عندما نفهم ${t.subtitleAr}، نصبح أكثر قدرة على التعامل مع التحديات اليومية بشكل فعال.

## نقاط عملية

إليك أبرز الخطوات التي تساعدك:

- ${t.bullet1Ar}
- ${t.bullet2Ar}
- ${t.bullet3Ar}
- ${t.bullet4Ar}

## متى تطلب الدعم؟

هناك حالات تستدعي استشارة متخصصة، منها:

- ${t.seekSupport1Ar}
- ${t.seekSupport2Ar}

---
**ملاحظة:** هذا المحتوى للتثقيف فقط ولا يغني عن استشارة مختص عند الحاجة.`;
}

export function buildEnglishContent(t: Topic): string {
  return `## Introduction

${t.titleEn} is an important topic that helps you understand yourself more deeply. In this article we cover practical, research-backed ideas.

## Why This Matters

When we understand ${t.subtitleEn}, we become more capable of handling daily challenges effectively.

## Practical Steps

Here are the key steps that can help:

- ${t.bullet1En}
- ${t.bullet2En}
- ${t.bullet3En}
- ${t.bullet4En}

## When to Seek Support

There are situations that call for professional guidance:

- ${t.seekSupport1En}
- ${t.seekSupport2En}

---
**Note:** This content is for educational purposes and does not replace support from a qualified specialist when needed.`;
}
