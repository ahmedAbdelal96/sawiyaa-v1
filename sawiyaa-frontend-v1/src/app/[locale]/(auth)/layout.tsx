import React from "react";
import AuthAppHeader from "./_components/AuthAppHeader";
import AuthFooter from "./_components/AuthFooter";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AuthLayout({ children, params }: Props) {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#F7F4EE] dark:bg-[#0b1212] transition-colors duration-300">
      {/* CSS Animation Keyframes and custom styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blob-float {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -45px) scale(1.08); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes blob-float-reverse {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-30px, 40px) scale(0.95); }
          66% { transform: translate(20px, -20px) scale(1.05); }
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
            linear-gradient(to right, rgba(95, 143, 139, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(95, 143, 139, 0.03) 1px, transparent 1px);
        }
        .dark .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(95, 143, 139, 0.015) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(95, 143, 139, 0.015) 1px, transparent 1px);
        }
      `}} />

      {/* Decorative Premium Background Elements */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-10 top-10 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[100px] dark:bg-primary/4 animate-blob-float" />
        <div className="absolute -right-10 bottom-10 h-[450px] w-[450px] rounded-full bg-secondary/10 blur-[120px] dark:bg-secondary/4 animate-blob-float-reverse" />
        <div className="absolute inset-0 bg-grid-pattern opacity-80" />
      </div>

      {/* 1. Polished header with logo, language switcher, theme toggle, and menu button */}
      <AuthAppHeader />

      {/* 2. Auth Page Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center">
          {children}
        </div>
      </main>

      {/* 3. Large custom footer */}
      <AuthFooter />
    </div>
  );
}
