# DB Schema v1 — Chat / Support / Chat Approval / Moderation

## الهدف من هذا الموديول
هذا الموديول مسؤول عن:
- شات الدعم بين العميل والمنصة
- شات الدعم بين المعالج والمنصة
- شات العميل والمعالج بعد طلب وموافقة
- مراقبة المحادثات حسب السياسات
- تسجيل البلاغات والإشراف الإداري
- حفظ history واضح للمحادثات
- تجهيز البنية التي تدعم Web أولًا ثم Mobile لاحقًا

هذا الموديول **لا** يشمل بعد:
- المكالمات الصوتية/الفيديو داخل الشات
- bots أو AI replies
- attachments المتقدمة جدًا
- end-to-end encryption
- community channels
- group chat العام

---

## المبدأ الأساسي
يوجد عندنا **نوعان مختلفان من المحادثات**:

### 1) Support Conversations
بين:
- العميل والدعم
- أو المعالج والدعم

وهذه المحادثات:
- دائمًا مسموحة
- مرتبطة بالتشغيل وخدمة العملاء
- قابلة للإسناد إلى موظف دعم
- فيها tags / priority / status

### 2) Care Conversations
بين:
- العميل والمعالج

وهذه المحادثات:
- **ليست مفتوحة افتراضيًا**
- تحتاج **طلب وموافقة**
- تخضع لسياسات المراقبة
- لها مدة صلاحية أو شروط تشغيل
- يمكن للإدارة إيقافها أو تقييدها

---

## المبادئ المعمارية

### 1) المحادثة ككيان مستقل
لا نربط الرسائل مباشرة بـ Session فقط.  
بل يكون عندنا:
- Conversation
- Participants
- Messages

ثم نربط conversation اختياريًا بـ:
- session
- support ticket
- chat approval

---

### 2) فصل approval عن conversation
طلب فتح شات العميل/المعالج يجب أن يكون كيانًا مستقلًا:
- قد يُرفض
- قد ينتهي
- قد يُوافق عليه ثم ينشأ conversation
- قد يُغلق لاحقًا

لذلك:
- approval request ≠ conversation

---

### 3) moderation لا تعتمد على حذف الرسائل فقط
نحتاج جداول منفصلة لـ:
- flags / reports
- moderation actions
- audit trail

---

### 4) support له workflow مختلف
شات الدعم قريب من ticketing system أكثر من كونه chat فقط.  
لذلك يحتاج:
- status
- priority
- assigned agent
- internal notes
- tags

---

### 5) الرسالة يجب أن تحتفظ بحالتها
كل رسالة تحتاج:
- sender
- status
- timestamps
- visibility
- moderation state

---

## نطاق هذا الإصدار
يغطي هذا الإصدار:

1. **Conversation**
   - المحادثة الأساسية
   - نوعها
   - حالتها
   - ربطها بالجلسة أو التذكرة أو الموافقة

2. **ConversationParticipant**
   - المشاركون
   - role داخل المحادثة
   - unread / last seen

3. **Message**
   - الرسائل
   - النص
   - المرسل
   - الحالة
   - moderation flags

4. **MessageAttachment**
   - مرفقات بسيطة قابلة للتوسع

5. **SupportTicket**
   - تغليف تشغيلي لشات الدعم
   - الأولوية
   - الحالة
   - الإسناد

6. **SupportTicketTag**
   - تصنيفات التذاكر

7. **ChatApprovalRequest**
   - طلب شات بين العميل والمعالج
   - المراجعة
   - الموافقة / الرفض / الانتهاء

8. **ChatModerationReport**
   - بلاغ على رسالة أو محادثة

9. **ChatModerationAction**
   - الإجراء المتخذ

10. **InternalConversationNote**
   - ملاحظات داخلية لفريق الدعم أو الإدارة

---

# الجزء الأول: Conversation Layer

## 1. Conversation
الكيان الرئيسي للمحادثة.

### الأنواع الأساسية
- SUPPORT
- CARE_APPROVED
- SYSTEM
> في v1 نركز على SUPPORT و CARE_APPROVED

### أهم الحقول
- conversation_type
- status
- patient_id
- practitioner_id
- support_ticket_id
- session_id
- chat_approval_request_id
- started_at
- closed_at
- expires_at

### الحالات المقترحة
- OPEN
- PENDING
- CLOSED
- EXPIRED
- SUSPENDED

### لماذا نحتفظ بـ patient_id و practitioner_id؟
لتسهيل الاستعلامات السريعة والفلترة، حتى مع وجود participants.

---

## 2. ConversationParticipant
يمثل من يشارك داخل المحادثة.

### أمثلة roles
- PATIENT
- PRACTITIONER
- SUPPORT_AGENT
- ADMIN
- SYSTEM

### أهم الحقول
- conversation_id
- user_id
- participant_role
- joined_at
- left_at
- last_read_message_id
- last_read_at
- is_muted
- is_active

### الفائدة
- unread counts
- tracking
- support handoff
- إمكانيات مستقبلية للجلسات الثنائية أو group chats

---

## 3. Message
الرسالة نفسها.

### أهم الحقول
- conversation_id
- sender_user_id
- message_type
- content_text
- reply_to_message_id
- status
- visibility
- sent_at
- delivered_at
- read_at
- edited_at
- deleted_at
- is_flagged

### أنواع الرسائل المقترحة
- TEXT
- SYSTEM
- FILE
- IMAGE
- NOTE_REFERENCE
- APPROVAL_NOTICE

### status
- SENT
- DELIVERED
- READ
- FAILED
- DELETED

### visibility
- NORMAL
- HIDDEN_FROM_PARTIES
- INTERNAL_ONLY

### ملاحظة
الرسالة التي يتم “حذفها” يفضل عدم حذفها فعليًا من قاعدة البيانات،
بل soft-delete / hide مع audit trail.

---

## 4. MessageAttachment
يربط الرسالة بمرفق.

### أهم الحقول
- message_id
- file_url
- mime_type
- file_size
- original_name
- storage_provider
- uploaded_at

---

# الجزء الثاني: Support Layer

## 5. SupportTicket
يمثل كيان الدعم التشغيلي فوق المحادثة.

### لماذا SupportTicket فوق Conversation؟
لأن شات الدعم يحتاج:
- status
- priority
- assigned agent
- escalation
- resolution

### أهم الحقول
- opened_by_user_id
- patient_id / practitioner_id
- conversation_id
- ticket_type
- status
- priority
- assigned_to_user_id
- subject
- resolved_at
- closed_at

### الحالات المقترحة
- OPEN
- IN_PROGRESS
- WAITING_FOR_USER
- ESCALATED
- RESOLVED
- CLOSED

### الأولويات
- LOW
- MEDIUM
- HIGH
- URGENT

### أنواع التذاكر
- PAYMENT
- SESSION
- TECHNICAL
- ACCOUNT
- CONTENT
- CHAT
- OTHER

---

## 6. SupportTicketTag
tag master

### أمثلة
- refund
- urgent
- doctor-no-show
- payment-failed
- abuse
- verification

---

## 7. SupportTicketTagAssignment
ربط tag بالتذكرة.

---

## 8. InternalConversationNote
ملاحظات داخلية لا يراها العميل أو المعالج.

### أمثلة
- “العميل غاضب، يحتاج متابعة”
- “تم التصعيد لفريق الدفع”
- “لا تفتح الشات بين العميل والمعالج قبل مراجعة الحالة”

---

# الجزء الثالث: Chat Approval Layer

## 9. ChatApprovalRequest
طلب فتح شات بين العميل والمعالج.

### لماذا جدول مستقل؟
لأن القرار عندكم واضح:
- الشات بين العميل والمعالج **بطلب وموافقة**
- وليس مفتوحًا تلقائيًا

### أهم الحقول
- patient_id
- practitioner_id
- requested_by_user_id
- related_session_id
- status
- request_reason
- internal_review_note
- reviewed_by_user_id
- requested_at
- reviewed_at
- approved_at
- rejected_at
- expires_at
- linked_conversation_id

### الحالات المقترحة
- PENDING
- APPROVED
- REJECTED
- EXPIRED
- CANCELLED
- REVOKED

### القواعد
- عند approval يمكن إنشاء Conversation من نوع CARE_APPROVED
- approval قد يكون مرتبطًا بجلسة سابقة أو حالة علاجية
- يمكن أن يكون له صلاحية زمنية

---

# الجزء الرابع: Moderation Layer

## 10. ChatModerationReport
بلاغ على:
- رسالة
- أو محادثة كاملة

### أهم الحقول
- conversation_id
- message_id
- reported_by_user_id
- report_reason
- report_note
- status
- created_at
- reviewed_at
- reviewed_by_user_id

### أمثلة أسباب البلاغ
- ABUSE
- HARASSMENT
- SPAM
- SHARING_CONTACT_INFO
- OUTSIDE_PLATFORM_PAYMENT
- INAPPROPRIATE_CONTENT
- PRIVACY_BREACH
- OTHER

### الحالات
- OPEN
- UNDER_REVIEW
- RESOLVED
- DISMISSED

---

## 11. ChatModerationAction
الإجراء الإداري الناتج عن report أو review استباقي.

### أمثلة actions
- MESSAGE_HIDDEN
- MESSAGE_RESTORED
- CONVERSATION_SUSPENDED
- CONVERSATION_CLOSED
- USER_WARNED
- USER_RESTRICTED
- APPROVAL_REVOKED
- INTERNAL_ESCALATION

### أهم الحقول
- report_id
- conversation_id
- message_id
- action_type
- action_note
- acted_by_user_id
- acted_at

---

# الجزء الخامس: الـ Enums المقترحة

## ConversationType
- SUPPORT
- CARE_APPROVED
- SYSTEM

## ConversationStatus
- OPEN
- PENDING
- CLOSED
- EXPIRED
- SUSPENDED

## ConversationParticipantRole
- PATIENT
- PRACTITIONER
- SUPPORT_AGENT
- ADMIN
- SYSTEM

## MessageType
- TEXT
- SYSTEM
- FILE
- IMAGE
- NOTE_REFERENCE
- APPROVAL_NOTICE

## MessageStatus
- SENT
- DELIVERED
- READ
- FAILED
- DELETED

## MessageVisibility
- NORMAL
- HIDDEN_FROM_PARTIES
- INTERNAL_ONLY

## SupportTicketType
- PAYMENT
- SESSION
- TECHNICAL
- ACCOUNT
- CONTENT
- CHAT
- OTHER

## SupportTicketStatus
- OPEN
- IN_PROGRESS
- WAITING_FOR_USER
- ESCALATED
- RESOLVED
- CLOSED

## SupportTicketPriority
- LOW
- MEDIUM
- HIGH
- URGENT

## ChatApprovalStatus
- PENDING
- APPROVED
- REJECTED
- EXPIRED
- CANCELLED
- REVOKED

## ChatModerationReportReason
- ABUSE
- HARASSMENT
- SPAM
- SHARING_CONTACT_INFO
- OUTSIDE_PLATFORM_PAYMENT
- INAPPROPRIATE_CONTENT
- PRIVACY_BREACH
- OTHER

## ChatModerationReportStatus
- OPEN
- UNDER_REVIEW
- RESOLVED
- DISMISSED

## ChatModerationActionType
- MESSAGE_HIDDEN
- MESSAGE_RESTORED
- CONVERSATION_SUSPENDED
- CONVERSATION_CLOSED
- USER_WARNED
- USER_RESTRICTED
- APPROVAL_REVOKED
- INTERNAL_ESCALATION

---

# الجزء السادس: العلاقات الأساسية

- Conversation 1—N ConversationParticipants
- Conversation 1—N Messages
- Message 1—N MessageAttachments
- Conversation 0..1 — 1 SupportTicket
- SupportTicket N—M SupportTicketTag عبر assignment
- Conversation 0..1 — 1 ChatApprovalRequest
- ChatApprovalRequest 0..1 — 1 linked Conversation
- Message / Conversation 1—N ChatModerationReports
- ChatModerationReport 1—N ChatModerationActions
- Conversation 1—N InternalConversationNotes

---

# الجزء السابع: Business Rules

## Support Rules
1. أي مستخدم يمكنه فتح Support conversation
2. كل support conversation يجب أن ترتبط بـ SupportTicket
3. يمكن إسناد التذكرة إلى agent واحد في كل مرة
4. internal notes لا تظهر للعميل أو المعالج

## Care Chat Rules
1. لا يفتح شات العميل/المعالج إلا بعد approval
2. approval يمكن أن يكون مرتبطًا بجلسة
3. approval يمكن أن ينتهي تلقائيًا بمرور الوقت
4. عند سحب approval يمكن:
   - غلق conversation
   - أو suspend بحسب السياسة

## Message Rules
1. الرسائل soft-delete لا hard-delete
2. الرسائل flagged يمكن إخفاؤها مع حفظها داخليًا
3. last_read_at وlast_read_message_id يحدثان على participant level

## Moderation Rules
1. أي بلاغ يجب أن يحتفظ بمن قام به ومتى
2. كل action يجب أن يسجل من قام به
3. إخفاء الرسالة لا يلغي وجودها من audit trail
4. يمكن للإدارة إغلاق المحادثة أو تجميدها

---

# الجزء الثامن: الـ SEO والـ Slugs
هذا الموديول **لا يحتاج slugs عامة** مثل المقالات أو المعالجين،  
لأنه موديول تشغيلي داخلي.

لكن يمكن استخدام:
- `public_ticket_ref`
- `conversation_ref`
- `approval_ref`

كمعرّفات بشرية قصيرة للعرض في الإدارة أو الدعم،  
وليس لأغراض SEO العامة.

### لذلك:
- لا نستخدم slug SEO هنا
- نستخدم UUID داخلي
- ويمكن إضافة human-readable refs اختيارية

---

# الجزء التاسع: الـ Indexes المهمة

## Conversation
- index على `(conversationType, status, startedAt)`
- index على `(patientId, status)`
- index على `(practitionerId, status)`
- index على `(supportTicketId)`
- index على `(chatApprovalRequestId)`
- index على `(sessionId)`

## ConversationParticipant
- unique index على `(conversationId, userId)`
- index على `(userId, isActive)`
- index على `(conversationId, participantRole)`

## Message
- index على `(conversationId, sentAt)`
- index على `(senderUserId, sentAt)`
- index على `(replyToMessageId)`
- index على `(status, sentAt)`
- index على `(isFlagged, sentAt)`

## MessageAttachment
- index على `(messageId)`

## SupportTicket
- unique index على `(conversationId)`
- index على `(status, priority, createdAt)`
- index على `(assignedToUserId, status)`
- index على `(openedByUserId, createdAt)`
- index على `(patientId, status)`
- index على `(practitionerId, status)`

## SupportTicketTag
- unique index على `slug`
- index على `(isActive, sortOrder)`

## SupportTicketTagAssignment
- unique index على `(supportTicketId, tagId)`
- index على `(tagId, supportTicketId)`

## InternalConversationNote
- index على `(conversationId, createdAt)`
- index على `(createdByUserId, createdAt)`

## ChatApprovalRequest
- index على `(patientId, status, requestedAt)`
- index على `(practitionerId, status, requestedAt)`
- index على `(relatedSessionId)`
- index على `(reviewedByUserId, reviewedAt)`
- unique index على `(linkedConversationId)` عند وجودها

## ChatModerationReport
- index على `(conversationId, status, createdAt)`
- index على `(messageId, status)`
- index على `(reportedByUserId, createdAt)`
- index على `(reviewedByUserId, reviewedAt)`

## ChatModerationAction
- index على `(reportId, actedAt)`
- index على `(conversationId, actedAt)`
- index على `(messageId, actedAt)`
- index على `(actedByUserId, actedAt)`

---

# الجزء العاشر: Flows مختصرة

## A) شات دعم
1. العميل أو المعالج يفتح دعم
2. ينشأ Conversation type = SUPPORT
3. تنشأ SupportTicket مرتبطة به
4. يتم إسنادها لوكيل دعم
5. يتم تبادل الرسائل
6. يمكن إضافة notes داخلية
7. عند الحل → RESOLVED / CLOSED

## B) طلب شات بين العميل والمعالج
1. أحد الأطراف يطلب فتح شات
2. ينشأ ChatApprovalRequest بحالة PENDING
3. الإدارة تراجع
4. إذا Approved:
   - ينشأ Conversation type = CARE_APPROVED
   - يتم ربطها بالطلب
5. عند انتهاء الصلاحية أو سحب الموافقة:
   - conversation تغلق أو suspend

## C) بلاغ على رسالة
1. أحد الأطراف يبلغ عن رسالة
2. ينشأ ChatModerationReport
3. الإدارة تراجع
4. إذا لزم:
   - تخفي الرسالة
   - أو توقف المحادثة
   - أو تحذر المستخدم
5. يسجل ChatModerationAction

---

# الجزء الحادي عشر: القرار المعماري النهائي
- Support chat منفصل منطقيًا عن care chat
- care chat يحتاج approval request مستقل
- conversation/message model موحد
- moderation منفصلة عن الرسائل نفسها
- internal notes منفصلة عن الرسائل العامة
- لا يوجد slug SEO هنا؛ فقط refs تشغيلية إن احتجت

---

# الخطوة التالية بعد هذا الموديول
بعد اعتماد هذا الموديول، الخطوات الطبيعية التالية قد تكون واحدة من:

1. **Notifications / Templates / Email-SMS-Push / In-app**
2. **Admin Settings / Policies / Config Engine**
3. **Reviews / Ratings**
4. **Training / Courses / Enrollments**
