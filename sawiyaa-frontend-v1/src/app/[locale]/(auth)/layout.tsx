import ThemeTogglerTwo from "@/components/shared/ThemeTogglerTwo";
import BrandMark from "@/components/shared/BrandMark";
import { LanguageSwitcherCompact } from "@/components/shared/LanguageSwitcher";
import React from "react";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AuthLayout({ children, params }: Props) {
  await params;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(68,161,148,0.18),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(68,161,148,0.12),_transparent_30%)] bg-surface dark:bg-surface">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(244,247,245,0.94))] dark:bg-[linear-gradient(180deg,rgba(9,16,16,0.88),rgba(13,23,22,0.96))]" />

      <div className="relative mx-auto min-h-screen w-full max-w-[1240px] px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
        <header className="flex items-center justify-between gap-4">
          <div className="max-w-[10rem]">
            <BrandMark />
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcherCompact />
            <div className="hidden sm:block">
              <ThemeTogglerTwo />
            </div>
          </div>
        </header>

        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
