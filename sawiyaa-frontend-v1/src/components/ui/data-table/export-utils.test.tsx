import { describe, expect, it, vi } from "vitest";

import { exportToPdf } from "./export-utils";

describe("exportToPdf", () => {
  it("prints every backend row in a paginated RTL document", async () => {
    const write = vi.fn();
    const printWindow = {
      document: { open: vi.fn(), write, close: vi.fn() },
      focus: vi.fn(),
    } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(printWindow);

    await exportToPdf(
      [{ name: "أحمد", phone: "+201000000000" }, { name: "Sara", phone: "+12025550100" }],
      [
        { id: "name", header: "الاسم", accessor: (row) => row.name },
        { id: "phone", header: "الهاتف", accessor: (row) => row.phone },
      ],
      "training-registrants-demo",
      { title: "قائمة المسجلين في التدريب", direction: "rtl" },
    );

    const html = write.mock.calls[0]?.[0] as string;
    expect(html).toContain("أحمد");
    expect(html).toContain("Sara");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("break-inside: avoid");
  });

  it("rejects an empty export so the UI can show a meaningful state", async () => {
    await expect(exportToPdf([], [])).rejects.toThrow("EMPTY_EXPORT");
  });
});
