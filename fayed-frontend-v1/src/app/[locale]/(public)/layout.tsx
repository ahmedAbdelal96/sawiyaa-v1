import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface dark:bg-surface">
      <PublicNavbar />
      <main className="flex-1 pt-[68px]">{children}</main>
      <PublicFooter />
    </div>
  );
}
