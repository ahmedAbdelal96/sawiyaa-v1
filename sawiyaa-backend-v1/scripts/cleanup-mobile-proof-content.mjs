import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const ROOT = path.resolve("D:/Web/full-projects/sawiyaa/sawiyaa-backend-v1");
const ENV_PATH = path.join(ROOT, ".env");

const SUPPORT_PATIENT_USER_ID = "11111111-1111-4111-8111-111111111114";
const SUPPORT_ADMIN_USER_ID = "11111111-1111-4111-8111-111111111111";

const SAFE_SUPPORT_SUBJECT = "طلب دعم عام";
const SAFE_SUPPORT_DESCRIPTION = "أحتاج إلى مساعدة بخصوص هذا الطلب.";
const SAFE_SUPPORT_PATIENT_MESSAGE = "أحتاج إلى مساعدة بخصوص هذا الطلب.";
const SAFE_SUPPORT_ADMIN_MESSAGE = "تم استلام طلبك وسنقوم بالمتابعة.";

const SAFE_CARE_REASON = "أرغب في متابعة محادثة الرعاية.";
const SAFE_CARE_APPROVAL_NOTICE =
  "تمت الموافقة على طلب محادثة الرعاية. يمكنك متابعة المحادثة الآن.";
const SAFE_CARE_PATIENT_MESSAGE = "أرغب في متابعة خطتي العلاجية.";
const SAFE_CARE_REPLY_MESSAGE = "تمت مراجعة الطلب ويمكنك المتابعة هنا.";

function loadEnv() {
  return fs.readFile(ENV_PATH, "utf8").then((content) => {
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

function sortBySentAt(items) {
  return [...items].sort((a, b) => {
    const left = new Date(a.sentAt).getTime();
    const right = new Date(b.sentAt).getTime();
    return left - right;
  });
}

async function main() {
  await loadEnv();

  const prisma = new PrismaClient();

  try {
    const supportTickets = await prisma.supportTicket.findMany({
      where: {
        OR: [
          { subject: { startsWith: "Phase3" } },
          { subject: { contains: "Proof Ticket" } },
          { subject: { contains: "empty-state probe" } },
          { subject: { contains: "threaded ticket" } },
          { subject: { contains: "Test" } },
          {
            description: {
              contains: "validate no-messages state before any replies",
            },
          },
          {
            description: {
              contains: "real support message thread rendering",
            },
          },
          {
            description: {
              contains: "runtime proof automation",
            },
          },
          {
            description: {
              contains: "Hello from patient",
            },
          },
          {
            description: {
              contains: "Admin ping",
            },
          },
        ],
      },
      select: {
        id: true,
        conversationId: true,
        subject: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const supportConversationIds = supportTickets.map(
      (ticket) => ticket.conversationId,
    );

    const careRequests = await prisma.chatApprovalRequest.findMany({
      select: {
        id: true,
        linkedConversationId: true,
        status: true,
        requestReason: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const careConversationIds = careRequests
      .map((request) => request.linkedConversationId)
      .filter(Boolean);

    let updatedSupportTickets = 0;
    if (supportTickets.length) {
      const ticketIds = supportTickets.map((ticket) => ticket.id);
      const supportUpdate = await prisma.supportTicket.updateMany({
        where: { id: { in: ticketIds } },
        data: {
          subject: SAFE_SUPPORT_SUBJECT,
          description: SAFE_SUPPORT_DESCRIPTION,
        },
      });
      updatedSupportTickets = supportUpdate.count;

      const supportMessages = await prisma.message.findMany({
        where: { conversationId: { in: supportConversationIds } },
        select: {
          id: true,
          conversationId: true,
          senderUserId: true,
          messageType: true,
          contentText: true,
          sentAt: true,
        },
        orderBy: { sentAt: "asc" },
      });

      const supportMessagesByConversation = new Map();
      for (const message of supportMessages) {
        const list = supportMessagesByConversation.get(message.conversationId);
        if (list) {
          list.push(message);
        } else {
          supportMessagesByConversation.set(message.conversationId, [message]);
        }
      }

      for (const messages of supportMessagesByConversation.values()) {
        for (const message of messages) {
          let contentText = SAFE_SUPPORT_PATIENT_MESSAGE;
          if (message.senderUserId === SUPPORT_ADMIN_USER_ID) {
            contentText = SAFE_SUPPORT_ADMIN_MESSAGE;
          } else if (message.senderUserId === SUPPORT_PATIENT_USER_ID) {
            contentText = SAFE_SUPPORT_PATIENT_MESSAGE;
          }

          await prisma.message.update({
            where: { id: message.id },
            data: { contentText },
          });
        }
      }
    }

    let updatedCareRequests = 0;
    if (careRequests.length) {
      const requestIds = careRequests.map((request) => request.id);
      const careUpdate = await prisma.chatApprovalRequest.updateMany({
        where: { id: { in: requestIds } },
        data: { requestReason: SAFE_CARE_REASON },
      });
      updatedCareRequests = careUpdate.count;

      const careMessages = await prisma.message.findMany({
        where: { conversationId: { in: careConversationIds } },
        select: {
          id: true,
          conversationId: true,
          messageType: true,
          contentText: true,
          sentAt: true,
        },
        orderBy: { sentAt: "asc" },
      });

      const careMessagesByConversation = new Map();
      for (const message of careMessages) {
        const list = careMessagesByConversation.get(message.conversationId);
        if (list) {
          list.push(message);
        } else {
          careMessagesByConversation.set(message.conversationId, [message]);
        }
      }

      for (const messages of careMessagesByConversation.values()) {
        let textIndex = 0;
        for (const message of messages) {
          let contentText = message.contentText ?? "";
          if (message.messageType === "APPROVAL_NOTICE") {
            contentText = SAFE_CARE_APPROVAL_NOTICE;
          } else if (message.messageType === "TEXT") {
            contentText =
              textIndex === 0
                ? SAFE_CARE_PATIENT_MESSAGE
                : SAFE_CARE_REPLY_MESSAGE;
            textIndex += 1;
          }

          await prisma.message.update({
            where: { id: message.id },
            data: { contentText },
          });
        }
      }
    }

    const approvalNoticeUpdate = await prisma.message.updateMany({
      where: {
        messageType: "APPROVAL_NOTICE",
        contentText: {
          contains: "Care chat request has been approved.",
        },
      },
      data: { contentText: SAFE_CARE_APPROVAL_NOTICE },
    });

    console.log(
      JSON.stringify(
        {
          supportTicketsFound: supportTickets.length,
          supportTicketsUpdated: updatedSupportTickets,
          careRequestsFound: careRequests.length,
          careRequestsUpdated: updatedCareRequests,
          approvalNoticesUpdated: approvalNoticeUpdate.count,
          supportConversationIds,
          careConversationIds,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
