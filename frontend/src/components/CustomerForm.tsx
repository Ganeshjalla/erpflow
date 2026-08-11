import { useState } from "react";
import { Customer } from "../types";
import { extractErrorMessage } from "../services/api";
import { Loader2 } from "lucide-react";

interface CustomerFormProps {
  initial?: Partial<Customer>;
  onSubmit: (data: Partial<Customer>) => Promise<void>;
  onCancel: () => void;
}

export function CustomerForm({ initial, onSubmit, onCancel }: CustomerFormProps) {
  const [form, setForm] = useState<Partial<Customer>>({
    customerName: initial?.customerName ?? "",
    mobileNumber: initial?.mobileNumber ?? "",
    email: initial?.email ?? "",
    businessName: initial?.businessName ?? "",
    gstNumber: initial?.gstNumber ?? "",
    customerType: initial?.customerType ?? "RETAIL",
    address: initial?.address ?? "",
    status: initial?.status ?? "LEAD",
    notes: initial?.notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Customer>(key: K, value: Customer[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.customerName || !form.mobileNumber || !form.businessName || !form.address) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Customer Name *">
          <input
            className="input"
            value={form.customerName}
            onChange={(e) => update("customerName", e.target.value)}
          />
        </Field>
        <Field label="Mobile Number *">
          <input
            className="input"
            value={form.mobileNumber}
            onChange={(e) => update("mobileNumber", e.target.value)}
          />
        </Field>
        <Field label="Business Name *">
          <input
            className="input"
            value={form.businessName}
            onChange={(e) => update("businessName", e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className="input"
            value={form.email ?? ""}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>
        <Field label="GST Number">
          <input
            className="input"
            value={form.gstNumber ?? ""}
            onChange={(e) => update("gstNumber", e.target.value)}
          />
        </Field>
        <Field label="Customer Type">
          <select
            className="input"
            value={form.customerType}
            onChange={(e) => update("customerType", e.target.value as Customer["customerType"])}
          >
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        </Field>
        <Field label="Status">
          <select
            className="input"
            value={form.status}
            onChange={(e) => update("status", e.target.value as Customer["status"])}
          >
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
      </div>
      <Field label="Address *">
        <textarea
          className="input"
          rows={2}
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
        />
      </Field>
      <Field label="Notes">
        <textarea
          className="input"
          rows={2}
          value={form.notes ?? ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </Field>

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
          Save Customer
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
