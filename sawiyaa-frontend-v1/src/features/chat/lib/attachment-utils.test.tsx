import { describe, expect, it } from "vitest";
import { validateChatAttachment } from "./attachment-utils";

const policy = {
  enabled: true,
  imageTypes: ["image/png"],
  documentTypes: ["application/pdf"],
  maxImageBytes: 1000,
  maxDocumentBytes: 2000,
  maxFilesPerMessage: 2,
  maxCombinedBytesPerMessage: 2500,
};

describe("chat attachment validation", () => {
  it("accepts an allowed file within the configured limits", () => {
    expect(validateChatAttachment(new File(["x"], "a.pdf", { type: "application/pdf" }), 0, 0, policy)).toBeNull();
  });

  it("rejects unsupported types, oversized files, and count limits", () => {
    expect(validateChatAttachment(new File(["x"], "a.exe", { type: "application/octet-stream" }), 0, 0, policy)).toBe("MESSAGING_ATTACHMENT_INVALID");
    expect(validateChatAttachment({ type: "application/pdf", size: 2001 }, 0, 0, policy)).toBe("MESSAGING_ATTACHMENT_TOO_LARGE");
    expect(validateChatAttachment({ type: "application/pdf", size: 1 }, 2, 0, policy)).toBe("MESSAGING_ATTACHMENT_LIMIT_EXCEEDED");
    expect(validateChatAttachment({ type: "application/pdf", size: 1000 }, 1, 2000, policy)).toBe("MESSAGING_ATTACHMENT_COMBINED_SIZE_LIMIT_EXCEEDED");
  });
});
