import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PractitionerCredentialsList from "@/features/practitioners/components/PractitionerCredentialsList";

const mocks = vi.hoisted(() => ({
  profile: { profileStatus: "DRAFT", applicationStatusSummary: { status: "DRAFT" }, timezone: null },
  rows: [{ credentialId: "credential-1", credentialType: "DEGREE", fileUrl: "/uploads/private.pdf", reviewStatus: "PENDING", expiresAt: null, uploadedAt: "2026-01-01", updatedAt: "2026-01-01" }],
  deleteMutation: { isPending: false, mutateAsync: vi.fn() },
  viewMutation: { isPending: false, mutateAsync: vi.fn() },
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ar",
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/features/practitioners/hooks/use-practitioners", () => ({
  usePractitionerProfile: () => ({ data: { profile: mocks.profile } }),
  usePractitionerCredentials: () => ({ data: { credentials: mocks.rows }, isLoading: false, isError: false, refetch: vi.fn() }),
  useUploadPractitionerCredential: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useDeletePractitionerCredential: () => mocks.deleteMutation,
  useViewPractitionerCredential: () => mocks.viewMutation,
}));
vi.mock("@/components/ui/button/Button", () => ({ default: (props: any) => <button {...props}>{props.children}</button> }));
vi.mock("@/components/ui/modal", () => ({ Modal: (props: any) => props.isOpen ? <div>{props.children}</div> : null, ModalBody: (props: any) => <div>{props.children}</div>, ModalHeader: (props: any) => <div>{props.title}</div> }));
vi.mock("@/components/form/input/DateField", () => ({ default: () => null }));
vi.mock("@/components/form/Label", () => ({ default: (props: any) => <label>{props.children}</label> }));
vi.mock("@/components/shared/ContentStates", () => ({ ListStateSkeleton: () => <div />, StateCard: () => <div /> }));

describe("PractitionerCredentialsList protected document behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profile.profileStatus = "DRAFT";
    mocks.rows = [{ credentialId: "credential-1", credentialType: "DEGREE", fileUrl: "/uploads/private.pdf", reviewStatus: "PENDING", expiresAt: null, uploadedAt: "2026-01-01", updatedAt: "2026-01-01" }];
    mocks.deleteMutation.isPending = false;
    mocks.viewMutation.isPending = false;
    mocks.viewMutation.mutateAsync.mockResolvedValue(new Blob(["safe document"], { type: "application/pdf" }));
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("open", vi.fn(() => ({ location: { href: "" }, close: vi.fn() })));
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:temporary"), revokeObjectURL: vi.fn() });
  });

  it("never renders fileUrl and views through the protected mutation", async () => {
    render(<PractitionerCredentialsList />);
    expect(document.body.textContent).not.toContain("/uploads/private.pdf");
    fireEvent.click(screen.getAllByRole("button")[1]);
    await waitFor(() => expect(mocks.viewMutation.mutateAsync).toHaveBeenCalledWith("credential-1"));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it("requires confirmation and deletes only in a mutable draft", async () => {
    render(<PractitionerCredentialsList />);
    fireEvent.click(screen.getByTitle("حذف"));
    await waitFor(() => expect(mocks.deleteMutation.mutateAsync).toHaveBeenCalledWith("credential-1"));
    expect(confirm).toHaveBeenCalled();
  });

  it("does not show delete for a locked profile", () => {
    mocks.profile.profileStatus = "PENDING_REVIEW";
    render(<PractitionerCredentialsList />);
    expect(screen.queryByTitle("حذف")).not.toBeInTheDocument();
  });
});
