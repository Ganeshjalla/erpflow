import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import * as challanService from "../services/challanService";
import { ChallanDetail } from "../types";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { Badge, statusColor } from "../components/Badge";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { extractErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user?.role === "ADMIN" || user?.role === "SALES";

  const [challan, setChallan] = useState<ChallanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await challanService.getChallan(id);
      setChallan(data);
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

  async function handleConfirm() {
    if (!id) return;
    setConfirmOpen(false);
    setActionLoading(true);
    try {
      await challanService.confirmChallan(id);
      showToast("Challan confirmed and stock updated.");
      load();
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!id) return;
    setCancelOpen(false);
    setActionLoading(true);
    try {
      await challanService.cancelChallan(id);
      showToast("Challan cancelled.");
      load();
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !challan) return <ErrorState message={error ?? "Challan not found"} onRetry={load} />;

  const isDraft = challan.status === "DRAFT";

  return (
    <div className="space-y-4 pb-10">
      <Link to="/challans" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Challans
      </Link>

      <div className="rounded-xl border border-gray-100 bg-white p-6 sm:p-8">
        {/* Document header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                EF
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">ERPFlow</p>
                <p className="text-xs text-gray-500">Wholesale Operations Management</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">{challan.challanNumber}</p>
            <p className="text-xs text-gray-500">
              {new Date(challan.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <div className="mt-1">
              <Badge color={statusColor(challan.status)}>{challan.status}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Bill To</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{challan.customerName}</p>
            <p className="text-sm text-gray-500">{challan.customerBusinessName}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">Created By</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{challan.createdByName}</p>
            {challan.confirmedAt && (
              <p className="text-xs text-gray-500">
                Confirmed on {new Date(challan.confirmedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">SKU</th>
                <th className="px-4 py-2 font-medium">Quantity</th>
                <th className="px-4 py-2 font-medium">Unit Price</th>
                <th className="px-4 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {challan.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{item.productNameSnapshot}</td>
                  <td className="px-4 py-2.5 text-gray-500">{item.skuSnapshot}</td>
                  <td className="px-4 py-2.5 text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-gray-600">₹{Number(item.unitPriceSnapshot).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                    ₹{Number(item.totalPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <p className="text-gray-500">
            Total Quantity: <span className="font-medium text-gray-900">{challan.totalQuantity}</span>
          </p>
          <p className="text-lg">
            Total Amount: <span className="font-bold text-gray-900">₹{Number(challan.totalAmount).toFixed(2)}</span>
          </p>
        </div>

        {canManage && (
          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-6">
            {isDraft && (
              <Link
                to={`/challans/${challan.id}`}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500 opacity-60"
                onClick={(e) => e.preventDefault()}
                title="Edit draft support: use Create Challan flow to adjust items, or contact admin"
              >
                Edit Draft
              </Link>
            )}
            {isDraft && (
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={actionLoading}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                Confirm Draft
              </button>
            )}
            {isDraft && (
              <button
                onClick={() => setCancelOpen(true)}
                disabled={actionLoading}
                className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Cancel
              </button>
            )}
            {!isDraft && (
              <p className="text-xs text-gray-400">
                {challan.status === "CONFIRMED"
                  ? "Confirmed challans cannot be edited or cancelled."
                  : "This challan has been cancelled."}
              </p>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm this challan?"
        description="Are you sure you want to confirm this challan? Stock will be deducted."
        confirmLabel="Confirm Challan"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this challan?"
        description="This will mark the draft challan as cancelled. This cannot be undone."
        confirmLabel="Cancel Challan"
        danger
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  );
}
