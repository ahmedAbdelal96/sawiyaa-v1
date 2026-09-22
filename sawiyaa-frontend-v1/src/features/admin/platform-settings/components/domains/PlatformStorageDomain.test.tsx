import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformStorageDomain, {
  bytesToMb,
  mbToBytes,
  formatMimeTypeToFriendly,
} from "./PlatformStorageDomain";
import type { PlatformSetting } from "../../types/platform-settings.types";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key} (${params.count})`;
    return key;
  },
  useLocale: () => "ar",
}));

vi.mock("../../hooks/use-platform-settings", () => ({
  useUpdatePlatformSetting: mocks.update,
  useResetPlatformSetting: mocks.reset,
}));

const mockStorageSettings: PlatformSetting[] = [
  {
    key: "file.uploads.chat.enabled",
    label: "Chat Files Enabled",
    labelAr: "السماح برفع مرفقات المحادثة",
    description: "Allow chat participants to upload attachments",
    descriptionAr: "التحكم في إتاحة زر إرفاق الملفات في شاشات المحادثة",
    category: "SYSTEM",
    domain: "file-uploads",
    valueType: "BOOLEAN",
    value: true,
    defaultValue: true,
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.system",
    enumOptions: null,
    jsonSchemaId: null,
    valueId: "val-chat-enabled",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "toggle" },
  },
  {
    key: "file.uploads.chat.maxImageBytes",
    label: "Maximum Chat Image Size",
    labelAr: "الحد الأقصى لحجم صورة المحادثة",
    description: "Maximum size in bytes for one chat image",
    descriptionAr: "الحد الأقصى المسموح به لكل صورة مفردة",
    category: "SYSTEM",
    domain: "file-uploads",
    valueType: "INTEGER",
    value: 10 * 1024 * 1024,
    defaultValue: 10 * 1024 * 1024,
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.system",
    enumOptions: null,
    jsonSchemaId: null,
    valueId: "val-chat-image-bytes",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "integer" },
  },
  {
    key: "file.uploads.chat.allowedImageMimeTypes",
    label: "Chat Image Formats",
    labelAr: "صيغ الصور المصرح بها في المحادثة",
    description: "Select supported image formats",
    descriptionAr: "الصيغ المدعومة لصور المحادثة",
    category: "SYSTEM",
    domain: "file-uploads",
    valueType: "STRING_ARRAY",
    value: ["image/jpeg", "image/png", "image/webp"],
    defaultValue: ["image/jpeg", "image/png", "image/webp"],
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.system",
    enumOptions: null,
    jsonSchemaId: null,
    valueId: "val-chat-image-types",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "multi-select" },
  },
  {
    key: "file.uploads.patient-avatar.maxBytes",
    label: "Patient Avatar Size",
    labelAr: "الحد الأقصى لصورة المريض",
    description: "Maximum size for patient avatar uploads",
    descriptionAr: "الحد الأقصى لحجم الصورة الشخصية لملف المريض",
    category: "SYSTEM",
    domain: "file-uploads",
    valueType: "INTEGER",
    value: 5 * 1024 * 1024,
    defaultValue: 5 * 1024 * 1024,
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.system",
    enumOptions: null,
    jsonSchemaId: null,
    valueId: "val-patient-avatar-bytes",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "integer" },
  },
];

describe("PlatformStorageDomain — Media & Storage Domain Editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isError: false,
      isSuccess: false,
    });
    mocks.reset.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isError: false,
      isSuccess: false,
    });
  });

  describe("Utility & Unit Conversions", () => {
    it("converts raw bytes into human-readable MB values", () => {
      expect(bytesToMb(10485760)).toBe(10);
      expect(bytesToMb(5242880)).toBe(5);
      expect(bytesToMb(524288)).toBe(0.5);
    });

    it("converts MB values back to raw bytes for backend persistence", () => {
      expect(mbToBytes(10)).toBe(10485760);
      expect(mbToBytes(5)).toBe(5242880);
    });

    it("transforms technical MIME strings into user-friendly extension chips", () => {
      expect(formatMimeTypeToFriendly("image/jpeg")).toBe("JPG");
      expect(formatMimeTypeToFriendly("image/png")).toBe("PNG");
      expect(formatMimeTypeToFriendly("application/pdf")).toBe("PDF");
      expect(
        formatMimeTypeToFriendly(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      ).toBe("DOCX");
    });
  });

  describe("UI Rendering & Form Controls", () => {
    it("renders sections with converted MB values and friendly format chips", () => {
      render(<PlatformStorageDomain settings={mockStorageSettings} />);

      expect(screen.getByText("storageDomain.sections.chat.title")).toBeTruthy();
      expect(screen.getByText("storageDomain.sections.profiles.title")).toBeTruthy();
      expect(screen.getByText("storageDomain.sections.documents.title")).toBeTruthy();

      // Check friendly chips
      expect(screen.getByText("JPG")).toBeTruthy();
      expect(screen.getByText("PNG")).toBeTruthy();
      expect(screen.getByText("WEBP")).toBeTruthy();
    });

    it("allows adjusting image size stepper and opens confirmation modal with mandatory audit reason", async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue({});
      mocks.update.mockReturnValue({
        mutateAsync,
        isPending: false,
        isError: false,
        isSuccess: false,
      });

      render(<PlatformStorageDomain settings={mockStorageSettings} />);

      const increaseBtn = screen.getByRole("button", {
        name: /Increase storageDomain.labels.chatMaxImageSize/i,
      });
      await user.click(increaseBtn);

      const saveBtn = screen.getByRole("button", { name: "actions.save" });
      await user.click(saveBtn);

      expect(screen.getByText("storageDomain.confirmModal.title")).toBeTruthy();
      expect(screen.getByText("storageDomain.confirmModal.warningMedium")).toBeTruthy();

      const saveConfirmBtn = screen.getByRole("button", {
        name: "storageDomain.confirmModal.saveBtn",
      });
      expect((saveConfirmBtn as HTMLButtonElement).disabled).toBe(true);

      const reasonInput = screen.getByPlaceholderText(
        "storageDomain.confirmModal.reasonPlaceholder"
      );
      await user.type(reasonInput, "Increased image upload limit for HD prescription photos");

      expect((saveConfirmBtn as HTMLButtonElement).disabled).toBe(false);
      await user.click(saveConfirmBtn);

      expect(mutateAsync).toHaveBeenCalledWith({
        key: "file.uploads.chat.maxImageBytes",
        value: 11 * 1024 * 1024,
        reason: "Increased image upload limit for HD prescription photos",
        expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
      });
    });

    it("triggers high risk warning when disabling chat file uploads", async () => {
      const user = userEvent.setup();
      render(<PlatformStorageDomain settings={mockStorageSettings} />);

      const switches = screen.getAllByRole("switch");
      // Switch 0 is chat uploads enabled
      await user.click(switches[0]);

      expect(screen.getByText("storageDomain.confirmModal.title")).toBeTruthy();
      expect(screen.getByText("storageDomain.confirmModal.warningHigh")).toBeTruthy();
    });
  });
});
