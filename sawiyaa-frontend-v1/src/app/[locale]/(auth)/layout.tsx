import BrandMark from "@/components/shared/BrandMark";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/stores/theme-store";
import React from "react";
import AuthThemeToggle from "./_components/AuthThemeToggle";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AuthLayout({ children, params }: Props) {
  const { locale } = await params;
  const isRtl = locale === "ar";

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface dark:bg-surface-tertiary">
      {/* CSS Animation Keyframes for Ambient Mesh Blobs and Entrance */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blob-float {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.12); }
          66% { transform: translate(-30px, 30px) scale(0.92); }
        }
        @keyframes blob-float-reverse {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-40px, 50px) scale(0.92); }
          66% { transform: translate(30px, -30px) scale(1.08); }
        }
        .animate-blob-float {
          animation: blob-float 16s infinite ease-in-out;
        }
        .animate-blob-float-reverse {
          animation: blob-float-reverse 18s infinite ease-in-out;
        }
        .bg-grid-pattern {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(95, 143, 139, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(95, 143, 139, 0.04) 1px, transparent 1px);
        }
        .dark .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(95, 143, 139, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(95, 143, 139, 0.02) 1px, transparent 1px);
        }
      `}} />

      {/* Decorative Premium Background Elements */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Soft atmospheric gradients */}
        <div className="absolute -left-10 top-10 h-[500px] w-[500px] rounded-full bg-primary/12 blur-[100px] dark:bg-primary/5 animate-blob-float" />
        <div className="absolute -right-10 bottom-10 h-[450px] w-[450px] rounded-full bg-secondary/15 blur-[120px] dark:bg-secondary/6 animate-blob-float-reverse" />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-70" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        
        {/* Floating Glassmorphic Header */}
        <header className="relative z-50 rounded-3xl border border-border-light bg-surface/50 px-5 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.02)] backdrop-blur-md dark:border-white/5 dark:bg-surface-secondary/40 flex items-center justify-between gap-4">
          <div className="shrink-0">
            <BrandMark />
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <AuthThemeToggle />
          </div>
        </header>

        {/* Auth Page Content */}
        <main className="relative z-0 mt-8 flex flex-1 items-center justify-center">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
