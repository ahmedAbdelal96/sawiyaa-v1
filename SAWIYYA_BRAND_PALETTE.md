# Sawiyaa / سويّة — Brand Palette

**Brand name:** سويّة  
**English name:** Sawiyaa  
**Domain:** sawiyaa.com  
**Brand direction:** Calm, premium, trustworthy, clinical warmth, human wellbeing.

---

## 1. Official Brand Colors

| Token | Name | HEX | Usage |
|---|---|---:|---|
| `primary` | Deep Teal | `#24564F` | Main brand color, logo, primary buttons, headings, active states |
| `secondary` | Soft Sage | `#A7BFAE` | Secondary UI accents, soft sections, icons, calming elements |
| `background` | Warm Ivory | `#F7F4EE` | Main app / website background |
| `card` | Pure White | `#FFFFFF` | Cards, modals, elevated surfaces |
| `card-warm` | Warm Card | `#FCFAF6` | Alternative warm card background |
| `sand` | Muted Sand | `#E6D6B8` | Dividers, soft panels, subtle backgrounds |
| `accent` | Warm Gold | `#C8A979` | Premium accent, small highlights, lines, dots, selected details |
| `green-light` | Green Tint Light | `#D9E4DB` | Light green surfaces, calm background blocks |
| `green-surface` | Green Surface Very Light | `#EEF4EF` | Badges, pills, hover states, subtle highlights |
| `text-main` | Main Text | `#1F332F` | Main readable text |
| `text-muted` | Muted Text | `#6F7E78` | Secondary text, helper text, descriptions |
| `border-soft` | Soft Border | `#E8DED0` | Card borders, dividers, input borders |

---

## 2. Core Background System

### Main Page Background

Use this as the default background for the web and mobile app:

```css
background-color: #F7F4EE;
```

### Optional Lighter Page Background

Use this for very clean landing sections or public pages:

```css
background-color: #FBF9F5;
```

### Card Background

Recommended card background:

```css
background-color: #FFFFFF;
```

Alternative warm card background:

```css
background-color: #FCFAF6;
```

---

## 3. Shadows

### Standard Card Shadow

Use for normal elevated cards:

```css
box-shadow: 0 8px 24px rgba(36, 86, 79, 0.08);
```

HEX alpha equivalent:

```css
box-shadow: 0 8px 24px #24564F14;
```

### Small Surface Shadow

Use for inputs, small cards, chips, and dropdowns:

```css
box-shadow: 0 4px 12px rgba(36, 86, 79, 0.06);
```

HEX alpha equivalent:

```css
box-shadow: 0 4px 12px #24564F0F;
```

### Logo / App Icon Shadow

Use for logo preview, app icon, brand cards, and hero identity blocks:

```css
box-shadow: 0 10px 30px rgba(36, 86, 79, 0.10);
```

HEX alpha equivalent:

```css
box-shadow: 0 10px 30px #24564F1A;
```

---

## 4. Recommended UI Usage

### Primary Button

```css
background-color: #24564F;
color: #FFFFFF;
box-shadow: 0 8px 24px rgba(36, 86, 79, 0.08);
```

### Primary Button Hover

```css
background-color: #1F4A44;
color: #FFFFFF;
```

### Secondary Button / Outline Button

```css
background-color: transparent;
border: 1px solid #24564F;
color: #24564F;
```

### Secondary Button Hover

```css
background-color: #EEF4EF;
color: #24564F;
```

### Soft Badge

```css
background-color: #EEF4EF;
color: #24564F;
border: 1px solid #D9E4DB;
```

### Premium Accent Line / Dot

```css
background-color: #C8A979;
```

### Card

```css
background-color: #FFFFFF;
border: 1px solid #E8DED0;
box-shadow: 0 8px 24px rgba(36, 86, 79, 0.08);
border-radius: 20px;
```

---

## 5. CSS Variables

```css
:root {
  --sawiyaa-primary: #24564F;
  --sawiyaa-secondary: #A7BFAE;
  --sawiyaa-background: #F7F4EE;
  --sawiyaa-background-light: #FBF9F5;
  --sawiyaa-card: #FFFFFF;
  --sawiyaa-card-warm: #FCFAF6;
  --sawiyaa-sand: #E6D6B8;
  --sawiyaa-accent: #C8A979;
  --sawiyaa-green-light: #D9E4DB;
  --sawiyaa-green-surface: #EEF4EF;
  --sawiyaa-text-main: #1F332F;
  --sawiyaa-text-muted: #6F7E78;
  --sawiyaa-border-soft: #E8DED0;

  --sawiyaa-shadow-card: 0 8px 24px rgba(36, 86, 79, 0.08);
  --sawiyaa-shadow-small: 0 4px 12px rgba(36, 86, 79, 0.06);
  --sawiyaa-shadow-logo: 0 10px 30px rgba(36, 86, 79, 0.10);
}
```

---

## 6. Tailwind Theme Tokens

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        sawiyaa: {
          primary: '#24564F',
          secondary: '#A7BFAE',
          background: '#F7F4EE',
          backgroundLight: '#FBF9F5',
          card: '#FFFFFF',
          cardWarm: '#FCFAF6',
          sand: '#E6D6B8',
          accent: '#C8A979',
          greenLight: '#D9E4DB',
          greenSurface: '#EEF4EF',
          textMain: '#1F332F',
          textMuted: '#6F7E78',
          borderSoft: '#E8DED0',
        },
      },
      boxShadow: {
        'sawiyaa-card': '0 8px 24px rgba(36, 86, 79, 0.08)',
        'sawiyaa-small': '0 4px 12px rgba(36, 86, 79, 0.06)',
        'sawiyaa-logo': '0 10px 30px rgba(36, 86, 79, 0.10)',
      },
      borderRadius: {
        'sawiyaa-card': '20px',
        'sawiyaa-button': '14px',
        'sawiyaa-pill': '999px',
      },
    },
  },
};
```

---

## 7. Brand Taglines

### Arabic

**سويّة — رعاية للعقل والجسم والتوازن**

### English

**Sawiyaa — Care for mind, body, and balance**

---

## 8. Brand Usage Notes

- Use **Sawiyaa** for English and technical contexts.
- Use **سويّة** for Arabic brand display.
- Use **sawiyaa.com** as the official domain.
- Keep the visual identity calm, premium, and trustworthy.
- Avoid loud gradients, neon colors, or aggressive medical styling.
- Avoid generic medical cross icons unless required by context.
- Use the gold accent sparingly to keep the brand premium, not decorative.
- Keep Arabic RTL and English LTR equally polished.

---

## 9. Quick Final Recommendation

For the first product implementation, use:

```txt
Page background: #F7F4EE
Card background: #FFFFFF
Primary color: #24564F
Secondary color: #A7BFAE
Accent color: #C8A979
Card shadow: 0 8px 24px rgba(36, 86, 79, 0.08)
Logo shadow: 0 10px 30px rgba(36, 86, 79, 0.10)
```
