"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { Loader2, Mail, Phone, ShieldCheck } from "lucide-react";
import { AdminButton } from "@/components/ui/admin-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TotpFactor = { id: string; friendly_name?: string; status: string; created_at: string };

export default function ProfilePage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [passwords, setPasswords] = useState({ next: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  // Two-factor authentication
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);

  const loadFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error) setFactors(data.totp as TotpFactor[]);
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata || {};
        setCurrentEmail(user.email || "");
        setForm({
          firstName: meta.first_name || "",
          lastName: meta.last_name || "",
          email: user.email || "",
          phone: meta.phone || "",
        });
      }
      await loadFactors();
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    const emailChanged = form.email.trim().toLowerCase() !== currentEmail.toLowerCase();
    const { error } = await supabase.auth.updateUser({
      ...(emailChanged ? { email: form.email.trim() } : {}),
      data: {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        full_name: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone.trim(),
      },
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      emailChanged
        ? "Profile saved. Check both inboxes to confirm the new email address."
        : "Profile saved"
    );
  };

  const changePassword = async () => {
    if (passwords.next.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.next });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPasswords({ next: "", confirm: "" });
    toast.success("Password changed");
  };

  const startEnroll = async () => {
    setMfaBusy(true);
    // Clear out any half-finished enrolment first; Supabase allows only one unverified factor.
    for (const factor of factors.filter((f) => f.status !== "verified")) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
    setMfaBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEnrolling({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirmEnroll = async () => {
    if (!enrolling) return;
    setMfaBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolling.factorId, code: enrollCode.trim() });
    setMfaBusy(false);
    if (error) {
      toast.error(error.message || "Invalid code");
      return;
    }
    setEnrolling(null);
    setEnrollCode("");
    await loadFactors();
    toast.success("Two-factor authentication is on");
  };

  const removeFactor = async (factorId: string) => {
    if (!window.confirm("Turn off two-factor authentication for your account?")) return;
    setMfaBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setMfaBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await loadFactors();
    toast.success("Two-factor authentication is off");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  const verifiedFactors = factors.filter((f) => f.status === "verified");

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-medium">Profile Settings</h1>

      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">First Name</label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Last Name</label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Contact Information</h3>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input className="pl-10" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input className="pl-10" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <AdminButton onClick={saveProfile} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </AdminButton>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-medium">Change Password</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            value={passwords.next}
            onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={passwords.confirm}
            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
          />
        </div>
        <div className="flex justify-end">
          <AdminButton variant="outline" onClick={changePassword} disabled={savingPassword}>
            {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </AdminButton>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          <h3 className="font-medium">Two-Factor Authentication</h3>
        </div>

        {verifiedFactors.length > 0 ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-700">
              On. You&apos;ll be asked for a code from your authenticator app when you sign in to the admin.
            </p>
            <AdminButton variant="outline" size="sm" disabled={mfaBusy} onClick={() => removeFactor(verifiedFactors[0].id)}>
              Turn off
            </AdminButton>
          </div>
        ) : enrolling ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Scan this QR code with an authenticator app (Google Authenticator, 1Password, Authy…), then enter the 6-digit code it shows.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrolling.qrCode} alt="Authenticator QR code" className="h-44 w-44 border rounded" />
            <p className="text-xs text-gray-500 break-all">Can&apos;t scan? Enter this key: {enrolling.secret}</p>
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                className="w-32"
                value={enrollCode}
                onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ""))}
              />
              <AdminButton onClick={confirmEnroll} disabled={mfaBusy || enrollCode.length !== 6}>
                Verify &amp; turn on
              </AdminButton>
              <AdminButton variant="ghost" onClick={() => setEnrolling(null)}>
                Cancel
              </AdminButton>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Off. Add a code from your phone on top of your password when signing in to the admin.</p>
            <AdminButton size="sm" disabled={mfaBusy} onClick={startEnroll}>
              Turn on
            </AdminButton>
          </div>
        )}
      </Card>
    </div>
  );
}
