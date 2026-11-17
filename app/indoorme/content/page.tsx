"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { ExternalLink, ImagePlus, Loader2, RotateCcw, X } from "lucide-react";
import { AdminButton } from "@/components/ui/admin-button";
import {
  PAGES,
  SECTIONS,
  withDefaults,
  type FieldDef,
  type PageKey,
  type SectionDef,
} from "@/lib/site-content";

type Values = Record<string, any>;
type ProductOption = { id: string; title: string };

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";

export default function SiteContentPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [page, setPage] = useState<PageKey>("home");
  const [saved, setSaved] = useState<Record<string, Values>>({});
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data, error }, { data: productRows }] = await Promise.all([
        supabase.from("site_content").select("id, content"),
        supabase.from("products").select("id, title").eq("status", "active").order("title"),
      ]);
      if (error) {
        console.error("Error loading site content:", error);
        setTableMissing(true);
      }
      const rows: Record<string, unknown> = {};
      for (const row of data ?? []) rows[row.id] = row.content;
      const values: Record<string, Values> = {};
      for (const section of SECTIONS) values[section.key] = withDefaults(section.key, rows[section.key]);
      setSaved(values);
      setProducts((productRows as ProductOption[]) ?? []);
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = PAGES.find((p) => p.key === page)!;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Site Content</h1>
          <p className="text-sm text-gray-500">Edit the text and pictures on your store pages. Changes go live when you save.</p>
        </div>
        <a
          href={current.path}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-gray-700 hover:underline"
        >
          View {current.label} page <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {tableMissing && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Site content isn&apos;t set up in the database yet. Apply the <code>site_content</code> migration, then reload.
          Pages keep showing their current text until then.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {PAGES.map((p) => (
          <AdminButton key={p.key} size="sm" variant={page === p.key ? "default" : "outline"} onClick={() => setPage(p.key)}>
            {p.label}
          </AdminButton>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.filter((s) => s.page === page).map((section) => (
            <SectionEditor
              key={section.key}
              section={section}
              initial={saved[section.key]}
              products={products}
              onSaved={(values) => setSaved((prev) => ({ ...prev, [section.key]: values }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionEditor({
  section,
  initial,
  products,
  onSaved,
}: {
  section: SectionDef;
  initial: Values;
  products: ProductOption[];
  onSaved: (values: Values) => void;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  const set = (name: string, value: any) => setValues((prev) => ({ ...prev, [name]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: section.key, content: values }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Save failed");
      const next = withDefaults(section.key, body.content);
      setValues(next);
      onSaved(next);
      toast.success(`${section.title} saved`);
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border">
      <div className="border-b p-4">
        <h2 className="font-medium">{section.title}</h2>
        {section.description && <p className="mt-1 text-sm text-gray-500">{section.description}</p>}
      </div>
      <div className="space-y-5 p-4">
        {section.fields.map((field) => (
          <Field key={field.name} field={field} value={values[field.name]} onChange={(v) => set(field.name, v)} products={products} />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 border-t p-4">
        <AdminButton
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => setValues(structuredClone(section.defaults))}
          title="Fill in the original text. Nothing changes on the site until you save."
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Restore original
        </AdminButton>
        <div className="flex gap-2">
          {dirty && (
            <AdminButton size="sm" variant="outline" type="button" onClick={() => setValues(initial)} disabled={saving}>
              Discard
            </AdminButton>
          )}
          <AdminButton size="sm" type="button" onClick={save} disabled={!dirty || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </AdminButton>
        </div>
      </div>
    </section>
  );
}

function Field({
  field,
  value,
  onChange,
  products,
}: {
  field: FieldDef;
  value: any;
  onChange: (value: any) => void;
  products: ProductOption[];
}) {
  const id = `field-${field.name}`;
  const label = (
    <label htmlFor={id} className="mb-1 block text-sm font-medium">
      {field.label}
    </label>
  );
  const help = field.help ? <p className="mt-1 text-xs text-gray-500">{field.help}</p> : null;

  switch (field.type) {
    case "text":
    case "url":
      return (
        <div>
          {label}
          <input id={id} className={inputClass} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
          {help}
        </div>
      );
    case "textarea":
      return (
        <div>
          {label}
          <textarea id={id} rows={4} className={inputClass} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
          {help}
        </div>
      );
    case "list":
      return (
        <div>
          {label}
          <textarea
            id={id}
            rows={5}
            className={inputClass}
            value={(value ?? []).join("\n")}
            onChange={(e) => onChange(e.target.value.split("\n"))}
          />
          {help}
        </div>
      );
    case "image":
      return (
        <div>
          <span className="mb-1 block text-sm font-medium">{field.label}</span>
          <ImageField value={value ?? ""} onChange={onChange} />
          {help}
        </div>
      );
    case "product":
      return (
        <div>
          {label}
          <select id={id} className={inputClass} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">None (hide section)</option>
            {value && !products.some((p) => p.id === value) && <option value={value}>(product no longer active)</option>}
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          {help}
        </div>
      );
    case "items": {
      const items: Values[] = Array.isArray(value) ? value : [];
      return (
        <div>
          <span className="mb-2 block text-sm font-medium">{field.label}</span>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: field.count }, (_, i) => {
              const item = items[i] ?? {};
              const update = (name: string, v: string) => {
                const next = Array.from({ length: field.count }, (_, j) => ({ ...(items[j] ?? {}) }));
                next[i][name] = v;
                onChange(next);
              };
              return (
                <div key={i} className="space-y-3 rounded-lg bg-gray-50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {field.itemLabel} {i + 1}
                  </div>
                  {field.fields.map((sub) => (
                    <div key={sub.name}>
                      <span className="mb-1 block text-xs font-medium">{sub.label}</span>
                      {sub.type === "image" ? (
                        <ImageField value={item[sub.name] ?? ""} onChange={(v) => update(sub.name, v)} compact />
                      ) : sub.type === "textarea" ? (
                        <textarea rows={4} className={inputClass} value={item[sub.name] ?? ""} onChange={(e) => update(sub.name, e.target.value)} />
                      ) : (
                        <input className={inputClass} value={item[sub.name] ?? ""} onChange={(e) => update(sub.name, e.target.value)} />
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {help}
        </div>
      );
    }
  }
}

function ImageField({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/site-content/upload", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Upload failed");
      onChange(body.url);
      toast.success("Image uploaded. Save to publish it.");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={compact ? "space-y-2" : "flex items-start gap-4"}>
      <div
        className={`relative overflow-hidden rounded-lg border bg-gray-100 ${compact ? "aspect-square w-full" : "h-28 w-44 shrink-0"}`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">No image</div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <AdminButton size="sm" variant="outline" type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
          {value ? "Replace" : "Upload"}
        </AdminButton>
        {value && (
          <AdminButton size="sm" variant="ghost" type="button" onClick={() => onChange("")}>
            <X className="mr-2 h-4 w-4" /> Remove
          </AdminButton>
        )}
      </div>
    </div>
  );
}
