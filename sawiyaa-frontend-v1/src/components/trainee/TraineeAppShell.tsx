"use client";

import type { ReactNode } from "react";
import { GraduationCap, LogOut } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import { useTraineeLogout } from "@/features/auth/hooks/use-auth";

export default function TraineeAppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const logout = useTraineeLogout();
  return (
    <div className="min-h-screen bg-surface-secondary">
      <header className="border-b border-border-light bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/trainee/academy" className="flex items-center gap-2 font-semibold text-text-primary">
            <GraduationCap className="h-5 w-5 text-primary" />
            Sawiyaa Academy
          </Link>
          <Button variant="secondary" startIcon={<LogOut className="h-4 w-4" />} onClick={() => void logout.mutateAsync().then(() => router.replace("/signin/trainee"))} disabled={logout.isPending}>
            Sign out
          </Button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
