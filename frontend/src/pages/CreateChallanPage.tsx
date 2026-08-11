import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import * as challanService from "../services/challanService";
import * as customerService from "../services/customerService";
import * as productService from "../services/productService";
import { Customer, Product } from "../types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { extractErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { Loader2 } from "lucide-react";

interface LineItem {
  productId: string;
  quantity: number;
}

export default function CreateChallanPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ productId: "", quantity: 1 }]);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState<"draft" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customerService.listCustomers({ limit: 100, status: "ACTIVE" }).then((res) => setCustomers(res.data));
    productService.listProducts({ limit: 100 }).then((res) => setProducts(res.data));
  }, []);

  function productById(id: string) {
    return products.find((p) => p.id === id);
  }

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: "", quantity: 1 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const { totalQuantity, grandTotal, rows } = useMemo(() => {
    let totalQuantity = 0;
    let grandTotal = 0;
    const rows = items.map((item) => {
      const product = productById(item.productId);
      const unitPrice = product ? Number(product.unitPrice) : 0;
      const lineTotal = unitPrice * (item.quantity || 0);
      totalQuantity += item.quantity || 0;
      grandTotal += lineTotal;
      return { ...item, product, unitPrice, lineTotal };
    });
    return { totalQuantity, grandTotal, rows };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, products]);

  function validate(): string | null {
    if (!customerId) return "Please select a customer.";
    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) return "Please add at least one valid product line.";
    return null;
  }

  async function handleSaveDraft() {
    const validationError = validate();
    if (validationError) return setError(validationError);
    setError(null);
    setSubmitting("draft");
    try {
      const challan = await challanService.createChallan({
        customerId,
        items: items.filter((i) => i.productId && i.quantity > 0),
        status: "DRAFT",
      });
      showToast("Challan saved as draft.");
      navigate(`/challans/${challan.id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(null);
    }
  }

  async function handleConfirmClick() {
    const validationError = validate();
    if (validationError) return setError(validationError);
    setError(null);
    setConfirmDialogOpen(true);
  }

  async function handleConfirmChallan() {
    setConfirmDialogOpen(false);
    setSubmitting("confirm");
    try {
      const challan = await challanService.createChallan({
        customerId,
        items: items.filter((i) => i.productId && i.quantity > 0),
        status: "CONFIRMED",
      });
      showToast("Challan confirmed and stock updated.");
      navigate(`/challans/${challan.id}`);
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-4 pb-10">
      <button
        onClick={() => navigate("/challans")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Challans
      </button>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Create Sales Challan</h1>
        <p className="text-sm text-gray-500">Select a customer, add products, then save as draft or confirm</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <label className="block text-sm font-medium text-gray-700">Customer</label>
        <select className="input mt-1" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Select a customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.customerName} — {c.businessName}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Line Items</h3>
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">SKU</th>
                <th className="px-4 py-2 font-medium">Available</th>
                <th className="px-4 py-2 font-medium">Unit Price</th>
                <th className="px-4 py-2 font-medium">Quantity</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 min-w-[180px]">
                    <select
                      className="input"
                      value={row.productId}
                      onChange={(e) => updateItem(idx, { productId: e.target.value })}
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.productName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{row.product?.sku ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-500">{row.product?.currentStock ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {row.product ? `₹${row.unitPrice.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2 w-24">
                    <input
                      type="number"
                      min={1}
                      className="input"
                      value={row.quantity}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-900">₹{row.lineTotal.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-end gap-1 border-t border-gray-100 px-4 py-4 text-sm">
          <p className="text-gray-500">
            Total Quantity: <span className="font-medium text-gray-900">{totalQuantity}</span>
          </p>
          <p className="text-base">
            Grand Total: <span className="font-bold text-gray-900">₹{grandTotal.toFixed(2)}</span>
          </p>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={handleSaveDraft}
          disabled={!!submitting}
          className="flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {submitting === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Draft
        </button>
        <button
          onClick={handleConfirmClick}
          disabled={!!submitting}
          className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting === "confirm" && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirm Challan
        </button>
      </div>

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Confirm this challan?"
        description="Are you sure you want to confirm this challan? Stock will be deducted immediately and this action cannot be undone."
        confirmLabel="Confirm Challan"
        onConfirm={handleConfirmChallan}
        onCancel={() => setConfirmDialogOpen(false)}
      />
    </div>
  );
}
