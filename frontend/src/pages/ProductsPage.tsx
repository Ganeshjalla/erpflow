import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import * as productService from "../services/productService";
import { Product, Pagination } from "../types";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { PaginationBar } from "../components/PaginationBar";
import { Badge, statusColor } from "../components/Badge";
import { Modal } from "../components/Modal";
import { ProductForm } from "../components/ProductForm";
import { extractErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function ProductsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user?.role === "ADMIN" || user?.role === "WAREHOUSE";
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [lowStock, setLowStock] = useState(searchParams.get("lowStock") === "true");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await productService.listProducts({
        page,
        limit: 10,
        search: search || undefined,
        category: category || undefined,
        lowStock: lowStock || undefined,
      });
      setProducts(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, lowStock]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (page === 1) load();
      else setPage(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function toggleLowStock() {
    const next = !lowStock;
    setLowStock(next);
    if (next) setSearchParams({ lowStock: "true" });
    else setSearchParams({});
  }

  async function handleCreate(data: any) {
    await productService.createProduct(data);
    showToast("Product created successfully.");
    setModalOpen(false);
    load();
  }

  async function handleUpdate(data: any) {
    if (!editing) return;
    await productService.updateProduct(editing.id, data);
    showToast("Product updated successfully.");
    setEditing(null);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Manage your product catalog</p>
        </div>
        {canManage && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-100 bg-white p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <input
          className="input w-auto"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <label className="flex items-center gap-2 rounded-md border border-gray-200 px-3 text-sm text-gray-700">
          <input type="checkbox" checked={lowStock} onChange={toggleLowStock} />
          Low stock only
        </label>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : products.length === 0 ? (
          <EmptyState title="No products found" description="Try adjusting your search or filters." />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium">Min Stock</th>
                    <th className="px-4 py-3 font-medium">Warehouse</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.productName}</td>
                      <td className="px-4 py-3 text-gray-600">{p.sku}</td>
                      <td className="px-4 py-3 text-gray-600">{p.category}</td>
                      <td className="px-4 py-3 text-gray-600">₹{Number(p.unitPrice).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-600">{p.currentStock}</td>
                      <td className="px-4 py-3 text-gray-600">{p.minimumStock}</td>
                      <td className="px-4 py-3 text-gray-600">{p.warehouseLocation}</td>
                      <td className="px-4 py-3">
                        <Badge color={statusColor(p.stockStatus)}>{p.stockStatus.replace("_", " ")}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage && (
                          <button
                            onClick={() => setEditing(p)}
                            className="text-xs font-medium text-brand-600 hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-50 md:hidden">
              {products.map((p) => (
                <div key={p.id} className="px-4 py-3" onClick={() => canManage && setEditing(p)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{p.productName}</p>
                      <p className="text-xs text-gray-500">{p.sku} · {p.category}</p>
                    </div>
                    <Badge color={statusColor(p.stockStatus)}>{p.stockStatus.replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Stock: {p.currentStock} / min {p.minimumStock} · ₹{Number(p.unitPrice).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {pagination && <PaginationBar pagination={pagination} onPageChange={setPage} />}
          </>
        )}
      </div>

      <Modal open={modalOpen} title="Add Product" onClose={() => setModalOpen(false)}>
        <ProductForm onSubmit={handleCreate} onCancel={() => setModalOpen(false)} />
      </Modal>

      <Modal open={!!editing} title="Edit Product" onClose={() => setEditing(null)}>
        {editing && (
          <ProductForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
        )}
      </Modal>
    </div>
  );
}
