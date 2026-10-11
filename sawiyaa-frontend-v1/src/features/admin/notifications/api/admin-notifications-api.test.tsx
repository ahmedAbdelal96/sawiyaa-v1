import { describe, expect, it, vi } from "vitest";
import { listAdminActionCenterNotifications } from "./admin-notifications.api";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/lib/api/http-client", () => ({
  default: { get },
}));

vi.mock("@/lib/api/response", () => ({
  extractData: (value: unknown) => (value as { data: unknown }).data,
}));

describe("Admin notification surfaces", () => {
  it("loads Action Center from its explicit projection endpoint", async () => {
    get.mockResolvedValueOnce({
      data: {
        data: {
          items: [],
          pagination: { page: 1, limit: 5, totalItems: 0, totalPages: 1 },
        },
      },
    });

    await listAdminActionCenterNotifications({ page: 1, limit: 5 });

    expect(get).toHaveBeenCalledWith("/admin/notifications/action-center", {
      params: { page: 1, limit: 5 },
    });
  });
});
