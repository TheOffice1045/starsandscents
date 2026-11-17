"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AdminButton } from "@/components/ui/admin-button";

// Middleware sends admins here when they have an authenticator enrolled but
// haven't verified it in this session (aal1 -> aal2).
function MfaChallenge() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);

  // Only ever bounce back inside the admin.
  const requested = searchParams.get("redirect") || "/indoorme";
  const redirectTo = requested.startsWith("/indoorme") && !requested.startsWith("/indoorme/mfa") ? requested : "/indoorme";

  useEffect(() => {
    const loadFactor = async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        toast.error(error.message);
      } else {
        const totp = data.totp.find((factor) => factor.status === "verified");
        if (totp) {
          setFactorId(totp.id);
        } else {
          // Nothing to verify; let middleware decide.
          router.replace(redirectTo);
          return;
        }
      }
      setLoading(false);
    };
    loadFactor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!factorId || code.trim().length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }

    setVerifying(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setVerifying(false);

    if (error) {
      toast.error(error.message || "Invalid code");
      setCode("");
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form onSubmit={handleVerify} className="w-full max-w-sm space-y-5 rounded-lg border p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6" />
          <h1 className="text-lg font-semibold">Two-factor verification</h1>
        </div>
        <p className="text-sm text-gray-500">
          Enter the 6-digit code from your authenticator app to continue to the admin.
        </p>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
            <AdminButton type="submit" className="w-full" disabled={verifying}>
              {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify
            </AdminButton>
          </>
        )}
      </form>
    </div>
  );
}

// useSearchParams needs a Suspense boundary in Next 14 builds.
export default function MfaChallengePage() {
  return (
    <Suspense fallback={null}>
      <MfaChallenge />
    </Suspense>
  );
}
