# Patient Mobile App: Final Design Handoff Package

## 1. Patient App Screen Inventory

The following screens constitute the complete patient journey, built with the "Clinical Ethos" design system.

### **Auth & Entry**
*   **Splash Screen** [{{DATA:SCREEN:SCREEN_34}}]
*   **Splash Screen (Implicit Login/Sign-up entry points)**

### **Home & Dashboard**
*   **Home (Arabic)** [{{DATA:SCREEN:SCREEN_32}}]
*   **Patient Dashboard (English)** [{{DATA:SCREEN:SCREEN_19}}]

### **Guided Matching Flow**
*   **Matching Intro (Arabic)** [{{DATA:SCREEN:SCREEN_15}}]
*   **Matching Question (Arabic)** [{{DATA:SCREEN:SCREEN_17}}]
*   **Matching Results (Arabic)** [{{DATA:SCREEN:SCREEN_36}}]

### **Therapist Discovery & Profile**
*   **Therapist Discovery (Arabic)** [{{DATA:SCREEN:SCREEN_38}}]
*   **Find Therapist (English)** [{{DATA:SCREEN:SCREEN_30}}]
*   **Therapist Filters (Arabic)** [{{DATA:SCREEN:SCREEN_29}}]
*   **Therapist Profile (Arabic/English Refined)** [{{DATA:SCREEN:SCREEN_12}}]

### **Booking Flow**
*   **Select Time (Arabic)** [{{DATA:SCREEN:SCREEN_41}}]
*   **Booking Confirmation (Arabic)** [{{DATA:SCREEN:SCREEN_40}}]
*   **Booking Success (Arabic)** [{{DATA:SCREEN:SCREEN_42}}]

### **Sessions Management**
*   **Sessions List (Arabic)** [{{DATA:SCREEN:SCREEN_39}}]
*   **Session Details (Arabic)** [{{DATA:SCREEN:SCREEN_22}}]
*   **Cancellation Preview (Arabic/English)** [{{DATA:SCREEN:SCREEN_3}}]

### **Payments & Wallet**
*   **Payments & Wallet (Hub)** [{{DATA:SCREEN:SCREEN_27}}]
*   **Transaction History (Arabic)** [{{DATA:SCREEN:SCREEN_33}}]
*   **Checkout Detail (Arabic)** [{{DATA:SCREEN:SCREEN_24}}]

### **Assessments Flow**
*   **Assessments List (Arabic)** [{{DATA:SCREEN:SCREEN_37}}]
*   **Assessment Detail (Arabic)** [{{DATA:SCREEN:SCREEN_35}}]
*   **Assessment Question (Arabic)** [{{DATA:SCREEN:SCREEN_31}}]
*   **Assessment Results (Arabic)** [{{DATA:SCREEN:SCREEN_28}}]

### **Account & Support**
*   **Patient Profile (Arabic)** [{{DATA:SCREEN:SCREEN_21}}]
*   **Notifications (Arabic)** [{{DATA:SCREEN:SCREEN_10}}]
*   **Support & Help (Arabic)** [{{DATA:SCREEN:SCREEN_26}}]

### **System States**
*   **Discovery Loading (Skeleton)** [{{DATA:SCREEN:SCREEN_25}}]
*   **Notifications Empty State** [{{DATA:SCREEN:SCREEN_13}}]

---

## 2. Navigation Map

### **Primary Navigation**
The app uses a **Persistent Bottom Navigation Bar** with 4 or 5 key destinations (Home, Discovery/Matching, Sessions, Profile/Wallet).

### **Stack Navigation**
*   **Drill-down:** Clicking a card (Therapist, Session, Assessment) pushes a new detail screen onto the stack.
*   **Back Behavior:** A clear back arrow in the Top App Bar consistently returns the user to the previous state.
*   **Modal/Sheet:** Filters and complex inputs (like Time Selection) use Bottom Sheets for reachability.

### **Key Flow Entry Points**
*   **Home Dashboard:** Immediate access to "Join Next Session" and "Start Assessment".
*   **Discovery:** Directly accessible from Bottom Nav or "Find Therapist" CTA on Home.

---

## 3. Component Inventory

The following components are standardized across the app:

*   **Top App Bar:** Handles brand identity (Sanctuary), titles, back navigation, and profile/notification entry points.
*   **Bottom Nav Bar:** Labels and icons for primary app sections.
*   **Standard Cards:** Consistent shadows, border radius, and padding for sessions and assessments.
*   **Therapist Cards:** Unified layout for name, title, rating, and compatibility score.
*   **Question Cards:** Large, readable targets for matching and assessment flows.
*   **Action Buttons:** primary (filled), secondary (outlined), and ghost (text-only) hierarchy.
*   **Status Badges:** Color-coded for payment status, session type, and availability.
*   **Progress Indicators:** Stepped bars for multi-step flows (Matching, Assessments).
*   **Bottom Sheets:** Used for Filters and Selection flows.

---

## 4. Visual System Summary (Design System: {{DATA:DESIGN_SYSTEM:DESIGN_SYSTEM_1}})

### **Core Tokens**
*   **Primary:** #3f7dcf (Used for primary actions, active states, and brand signals).
*   **Background:** #f4f6fb (Soft, cool neutral to reduce eye strain).
*   **Surface:** #ffffff (White cards to provide maximum contrast).
*   **Text Primary:** #1f2a3d (High-readability dark blue-gray).

### **Typography**
*   **Font:** Manrope (Clean, modern, and emotionally safe).
*   **Hierarchy:** Clear contrast between Bold Headlines and Medium/Regular body text for information density.

### **Style & Shape**
*   **Roundness:** 4px to 8px for a professional, clinical yet soft feel.
*   **Shadows:** Soft, subtle elevations (0 4px 20px rgba(0,0,0,0.05)) for depth without clutter.

### **Accessibility**
*   **Arabic RTL:** Fully mirrored layouts with native font handling.
*   **Dark Mode:** High-contrast surfaces using deep navy/charcoal foundations.

---

## 5. Flow Coverage & Dev Notes

### **Critical Implementation Priorities**
1.  **Trust-Sensitive Flows:** Payments, Wallet, and Cancellation flows must be implemented with pixel-perfect attention to financial details.
2.  **RTL/LTR Awareness:** Ensure the layout shifts correctly based on language settings without breaking spacing or icon direction.
3.  **Low Cognitive Load:** Maintain the "one primary action per screen" rule in Matching and Assessments.

### **Consistency Guardrails**
*   Do not deviate from the spacing rhythm (4px/8px grid).
*   Ensure all buttons use the same interaction scale (e.g., active:scale-95).
*   Maintain the calm blue-neutral color balance; avoid introducing loud accent colors.

---
**Handoff Status:** Production Ready.
