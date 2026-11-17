"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { format } from "date-fns";
import { toast } from "sonner";
import { Archive, Inbox, Loader2, Mail, MailOpen, Reply } from "lucide-react";
import { AdminButton } from "@/components/ui/admin-button";

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read" | "archived";
  created_at: string;
  replied_at: string | null;
};

const TABS = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "archived", label: "Archived", icon: Archive },
] as const;

export default function MessagesPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const query = supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    const { data, error } = tab === "archived" ? await query.eq("status", "archived") : await query.neq("status", "archived");
    if (error) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    } else {
      setMessages(data as ContactMessage[]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const updateMessage = async (id: string, changes: Partial<ContactMessage>) => {
    const { error } = await supabase.from("contact_messages").update(changes).eq("id", id);
    if (error) {
      toast.error("Failed to update message");
      return false;
    }
    setMessages((current) => current.map((m) => (m.id === id ? { ...m, ...changes } : m)));
    return true;
  };

  const openMessage = (message: ContactMessage) => {
    setSelectedId(message.id);
    if (message.status === "new") updateMessage(message.id, { status: "read" });
  };

  const archive = async (message: ContactMessage) => {
    const nextStatus = message.status === "archived" ? "read" : "archived";
    if (await updateMessage(message.id, { status: nextStatus })) {
      setMessages((current) => current.filter((m) => m.id !== message.id));
      setSelectedId(null);
      toast.success(nextStatus === "archived" ? "Message archived" : "Message moved to inbox");
    }
  };

  const reply = (message: ContactMessage) => {
    updateMessage(message.id, { replied_at: new Date().toISOString() });
    window.location.href = `mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`;
  };

  const selected = messages.find((m) => m.id === selectedId) ?? null;
  const unread = messages.filter((m) => m.status === "new").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Messages</h1>
        <div className="flex gap-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <AdminButton
              key={key}
              size="sm"
              variant={tab === key ? "default" : "outline"}
              onClick={() => {
                setTab(key);
                setSelectedId(null);
              }}
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
              {key === "inbox" && unread > 0 && tab === "inbox" ? ` (${unread})` : ""}
            </AdminButton>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-lg border py-16 text-center text-sm text-gray-500">
          {tab === "archived" ? "No archived messages." : "No messages yet. Contact-form submissions will appear here."}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <ul className="divide-y rounded-lg border">
            {messages.map((message) => (
              <li key={message.id}>
                <button
                  onClick={() => openMessage(message)}
                  className={`w-full p-4 text-left hover:bg-gray-50 ${selectedId === message.id ? "bg-gray-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${message.status === "new" ? "font-semibold" : ""}`}>
                      {message.status === "new" ? <Mail className="mr-2 inline h-4 w-4" /> : <MailOpen className="mr-2 inline h-4 w-4 text-gray-400" />}
                      {message.name}
                    </span>
                    <span className="shrink-0 text-xs text-gray-500">{format(new Date(message.created_at), "MMM d, p")}</span>
                  </div>
                  <div className="mt-1 truncate text-sm text-gray-700">{message.subject}</div>
                </button>
              </li>
            ))}
          </ul>

          <div className="rounded-lg border p-6">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-medium">{selected.subject}</h2>
                  <p className="text-sm text-gray-500">
                    {selected.name} &lt;{selected.email}&gt; · {format(new Date(selected.created_at), "PPP p")}
                  </p>
                  {selected.replied_at && (
                    <p className="mt-1 text-xs text-green-700">Replied {format(new Date(selected.replied_at), "PPP p")}</p>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{selected.message}</p>
                <div className="flex gap-2 border-t pt-4">
                  <AdminButton size="sm" onClick={() => reply(selected)}>
                    <Reply className="mr-2 h-4 w-4" />
                    Reply by email
                  </AdminButton>
                  <AdminButton size="sm" variant="outline" onClick={() => archive(selected)}>
                    <Archive className="mr-2 h-4 w-4" />
                    {selected.status === "archived" ? "Move to inbox" : "Archive"}
                  </AdminButton>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a message to read it.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
