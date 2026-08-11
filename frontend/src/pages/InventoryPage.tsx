import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import * as inventoryService from "../services/inventoryService";
import * as productService from "../services/productService";
import { Product, StockMovement, Pagination } from "../types";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { PaginationBar } from "../components/PaginationBar";
import { Badge, statusColor } from "../components/Badge";
import { Modal } from "../components/Modal";
import { extractErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function InventoryPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canMoveStock = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  const [overview, setOverview] = useState<Product[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [movementsError, setMovementsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);

  async function loadOverview() {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await inventoryService.getInventoryOverview();
      setOverview(data);
    } catch (err) {
      setOverviewError(extractErrorMessage(err));
    } finally {
      setOverviewLoading(false);
    }
  }

  async function loadMovements() {
    setMovementsLoading(true);
    setMovementsError(null);
    try {
      const res = await inventoryService.listMovements({ page, limit: 8 });
      setMovements(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setMovementsError(extractErrorMessage(err));
    } finally {
      setMovementsLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleMovementRecorded() {
    setModalOpen(false);
    showToast("Stock movement recorded.");
    loadOverview();
    setPage(1);
    loadMovements();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">Live stock levels across all warehouses</p>
        </div>
        {canMoveStock && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Add Stock Movement
          </button>
        )}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Stock Summary</h3>
        </div>
        {overviewLoading ? (
          <LoadingState />
        ) : overviewError ? (
          <ErrorState message={overviewError} onRetry={loadOverview} />
        ) : overview.length === 0 ? (
          <EmptyState title="No products yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Current Stock</th>
                  <th className="px-4 py-3 font-medium">Minimum Stock</th>
                  <th className="px-4 py-3 font-medium">Warehouse</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {overview.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.productName}</td>
                    <td className="px-4 py-3 text-gray-600">{p.sku}</td>
                    <td className="px-4 py-3 text-gray-600">{p.currentStock}</td>
                    <td className="px-4 py-3 text-gray-600">{p.minimumStock}</td>
                    <td className="px-4 py-3 text-gray-600">{p.warehouseLocation}</td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor(p.stockStatus)}>{p.stockStatus.replace("_", " ")}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Movement History</h3>
        </div>
        {movementsLoading ? (
          <LoadingState />
        ) : movementsError ? (
          <ErrorState message={movementsError} onRetry={loadMovements} />
        ) : movements.length === 0 ? (
          <EmptyState title="No stock movements yet" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Quantity</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                    <th className="px-4 py-3 font-medium">Created By</th>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {m.productName} <span className="text-gray-400">({m.sku})</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={m.movementType === "IN" ? "green" : "gray"}>{m.movementType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.quantity}</td>
                      <td className="px-4 py-3 text-gray-600">{m.reason}</td>
                      <td className="px-4 py-3 text-gray-600">{m.createdByName}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(m.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && <PaginationBar pagination={pagination} onPageChange={setPage} />}
          </>
        )}
      </div>

      <Modal open={modalOpen} title="Record Stock Movement" onClose={() => setModalOpen(false)}>
        <MovementForm onDone={handleMovementRecorded} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}

function MovementForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    productService.listProducts({ limit: 100 }).then((res) => setProducts(res.data));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!productId || !reason || quantity <= 0) {
      setError("Please select a product, valid quantity, and reason.");
      return;
    }
    setSubmitting(true);
    try {
      await inventoryService.recordMovement({ productId, quantity, movementType, reason });
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
        <label className="block text-sm font-medium text-gray-700">Product</label>
        <select className="input mt-1" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Select a product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.productName} ({p.sku}) — stock: {p.currentStock}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Movement Type</label>
          <select
            className="input mt-1"
            value={movementType}
            onChange={(e) => setMovementType(e.target.value as "IN" | "OUT")}
          >
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Quantity</label>
          <input
            type="number"
            min={1}
            className="input mt-1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Reason</label>
        <input
          className="input mt-1"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Purchase received / Damaged goods / Stock audit..."
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
          Record Movement
        </button>
      </div>
    </form>
  );
}
