"use client";

import { cn } from '@/lib/utils';

// Shared look for the sign in, sign up and password pages.

export const authFieldClass =
  'h-12 rounded-none border-[#E7DCD2] bg-white px-4 text-base focus-visible:ring-1 focus-visible:ring-[#4A332F] focus-visible:ring-offset-0 focus-visible:border-[#4A332F]';

export const authLabelClass = 'text-xs font-medium uppercase tracking-[0.15em] text-[#4A332F]';

export const authButtonClass = 'w-full uppercase tracking-[0.2em]';

export function AuthMessage({ type, children }: { type: 'success' | 'error'; children: React.ReactNode }) {
  return (
    <p
      role={type === 'error' ? 'alert' : 'status'}
      className={cn(
        'border-l-2 px-3 py-2 text-sm',
        type === 'error' ? 'border-red-500 bg-red-50 text-red-700' : 'border-green-600 bg-green-50 text-green-800'
      )}
    >
      {children}
    </p>
  );
}

export function AuthDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-8 flex items-center gap-4">
      <div className="h-px flex-1 bg-[#E7DCD2]" />
      <span className="text-xs uppercase tracking-[0.2em] text-[#6B5A55]">{children}</span>
      <div className="h-px flex-1 bg-[#E7DCD2]" />
    </div>
  );
}

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#FBF7F3] px-4 py-16">
      <div className="w-full max-w-md border border-[#EFE6DE] bg-white px-6 py-10 shadow-[0_24px_60px_-28px_rgba(74,51,47,0.35)] sm:px-10 sm:py-12">
        <div className="text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#4A332F]/70">{eyebrow}</p>
          <h1 className="text-3xl font-light tracking-wide text-[#2B1D1A] sm:text-4xl">{title}</h1>
          <div className="mx-auto mt-4 h-px w-12 bg-[#4A332F]" />
          <p className="mx-auto mt-5 max-w-xs text-sm text-[#6B5A55]">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
