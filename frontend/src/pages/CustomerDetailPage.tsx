import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import * as customerService from "../services/customerService";
import { CustomerDetail } from "../types";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { Badge, statusColor } from "../components/Badge";
import { Modal } from "../components/Modal";
import { extractErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user?.role === "ADMIN" || user?.role === "SALES";

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await customerService.getCustomer(id);
      setCustomer(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <LoadingState />;
  if (error || !customer) return <ErrorState message={error ?? "Customer not found"} onRetry={load} />;

  return (
    <div className="space-y-4">
      <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{customer.customerName}</h1>
            <Badge color={statusColor(customer.status)}>{customer.status}</Badge>
          </div>
          <p className="text-sm text-gray-500">{customer.businessName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profile */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-900">Business Information</h3>
          <dl className="mt-3 space-y-2.5 text-sm">
            <Row label="Mobile" value={customer.mobileNumber} />
            <Row label="Email" value={customer.email || "—"} />
            <Row label="Business Name" value={customer.businessName} />
            <Row label="GST Number" value={customer.gstNumber || "—"} />
            <Row label="Customer Type" value={customer.customerType} />
            <Row label="Address" value={customer.address} />
            <Row
              label="Follow-up Date"
              value={customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : "—"}
            />
            <Row label="Notes" value={customer.notes || "—"} />
          </dl>
        </div>

        {/* Follow-ups timeline */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Follow-up History</h3>
            {canManage && (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add Note
              </button>
            )}
          </div>

          {customer.followUps.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">No follow-ups recorded yet.</p>
          ) : (
            <ol className="mt-4 space-y-4 border-l border-gray-100 pl-4">
              {customer.followUps.map((f) => (
                <li key={f.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" />
                  <p className="text-sm text-gray-800">{f.note}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {new Date(f.followUpDate).toLocaleDateString()} · by {f.createdByName} ·{" "}
                    {new Date(f.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          )}

          <h3 className="mt-6 text-sm font-semibold text-gray-900">Recent Challans</h3>
          {customer.recentChallans.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400">No challans yet.</p>
          ) : (
            <div className="mt-2 divide-y divide-gray-50">
              {customer.recentChallans.map((ch) => (
                <Link
                  key={ch.id}
                  to={`/challans/${ch.id}`}
                  className="flex items-center justify-between py-2 text-sm hover:bg-gray-50/60"
                >
                  <span className="font-medium text-brand-700">{ch.challanNumber}</span>
                  <Badge color={statusColor(ch.status)}>{ch.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={modalOpen} title="Add Follow-up Note" onClose={() => setModalOpen(false)}>
        <FollowUpForm
          customerId={customer.id}
          onDone={() => {
            setModalOpen(false);
            showToast("Follow-up note added.");
            load();
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function FollowUpForm({
  customerId,
  onDone,
  onCancel,
}: {
  customerId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note) {
      setError("Note is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await customerService.addFollowUp(customerId, note, followUpDate);
      onDone();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Note</label>
        <textarea
          className="input mt-1"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Customer requested quotation for 100 units."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Follow-up Date</label>
        <input
          type="date"
          className="input mt-1"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
        />
      </div>
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="flex justify-end gap-2">
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
          Add Note
        </button>
      </div>
    </form>
  );
}
