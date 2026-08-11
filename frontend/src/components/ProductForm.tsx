import { useState } from "react";
import { Product } from "../types";
import { extractErrorMessage } from "../services/api";
import { Loader2 } from "lucide-react";

interface ProductFormProps {
  initial?: Partial<Product>;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({ initial, onSubmit, onCancel }: ProductFormProps) {
  const [form, setForm] = useState({
    productName: initial?.productName ?? "",
    sku: initial?.sku ?? "",
    category: initial?.category ?? "",
    unitPrice: initial?.unitPrice ?? "",
    currentStock: initial?.currentStock ?? 0,
    minimumStock: initial?.minimumStock ?? 0,
    warehouseLocation: initial?.warehouseLocation ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof typeof form, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.productName || !form.sku || !form.category || !form.warehouseLocation) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        unitPrice: Number(form.unitPrice),
        currentStock: Number(form.currentStock),
        minimumStock: Number(form.minimumStock),
      });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Product Name *">
          <input className="input" value={form.productName} onChange={(e) => update("productName", e.target.value)} />
        </Field>
        <Field label="SKU *">
          <input className="input" value={form.sku} onChange={(e) => update("sku", e.target.value)} />
        </Field>
        <Field label="Category *">
          <input className="input" value={form.category} onChange={(e) => update("category", e.target.value)} />
        </Field>
        <Field label="Warehouse Location *">
          <input
            className="input"
            value={form.warehouseLocation}
            onChange={(e) => update("warehouseLocation", e.target.value)}
          />
        </Field>
        <Field label="Unit Price (₹) *">
          <input
            type="number"
            min={0}
            step="0.01"
            className="input"
            value={form.unitPrice}
            onChange={(e) => update("unitPrice", e.target.value)}
          />
        </Field>
        <Field label="Minimum Stock">
          <input
            type="number"
            min={0}
            className="input"
            value={form.minimumStock}
            onChange={(e) => update("minimumStock", Number(e.target.value))}
          />
        </Field>
        {!initial && (
          <Field label="Opening Stock">
            <input
              type="number"
              min={0}
              className="input"
              value={form.currentStock}
              onChange={(e) => update("currentStock", Number(e.target.value))}
            />
          </Field>
        )}
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Product
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
