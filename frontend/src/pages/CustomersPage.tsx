import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import * as customerService from "../services/customerService";
import { Customer, Pagination } from "../types";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { PaginationBar } from "../components/PaginationBar";
import { Badge, statusColor } from "../components/Badge";
import { Modal } from "../components/Modal";
import { CustomerForm } from "../components/CustomerForm";
import { extractErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function CustomersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user?.role === "ADMIN" || user?.role === "SALES";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [customerType, setCustomerType] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await customerService.listCustomers({
        page,
        limit: 10,
        search: search || undefined,
        status: status || undefined,
        customerType: customerType || undefined,
      });
      setCustomers(res.data);
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
  }, [page, status, customerType]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (page === 1) load();
      else setPage(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleCreate(data: Partial<Customer>) {
    await customerService.createCustomer(data);
    showToast("Customer created successfully.");
    setModalOpen(false);
    load();
  }

  async function handleUpdate(data: Partial<Customer>) {
    if (!editing) return;
    await customerService.updateCustomer(editing.id, data);
    showToast("Customer updated successfully.");
    setEditing(null);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">Manage your customer relationships and leads</p>
        </div>
        {canManage && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Add Customer
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-100 bg-white p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, business, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select
          className="input w-auto"
          value={customerType}
          onChange={(e) => setCustomerType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="DISTRIBUTOR">Distributor</option>
        </select>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers found"
            description="Try adjusting your search or filters, or add a new customer."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Business</th>
                    <th className="px-4 py-3 font-medium">Mobile</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Follow-up</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <Link to={`/customers/${c.id}`} className="font-medium text-brand-700 hover:underline">
                          {c.customerName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.businessName}</td>
                      <td className="px-4 py-3 text-gray-600">{c.mobileNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{c.customerType}</td>
                      <td className="px-4 py-3">
                        <Badge color={statusColor(c.status)}>{c.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage && (
                          <button
                            onClick={() => setEditing(c)}
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

            {/* Mobile cards */}
            <div className="divide-y divide-gray-50 md:hidden">
              {customers.map((c) => (
                <Link
                  key={c.id}
                  to={`/customers/${c.id}`}
                  className="block px-4 py-3 hover:bg-gray-50/60"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{c.customerName}</p>
                      <p className="text-xs text-gray-500">{c.businessName}</p>
                    </div>
                    <Badge color={statusColor(c.status)}>{c.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {c.mobileNumber} · {c.customerType}
                  </p>
                </Link>
              ))}
            </div>

            {pagination && <PaginationBar pagination={pagination} onPageChange={setPage} />}
          </>
        )}
      </div>

      <Modal open={modalOpen} title="Add Customer" onClose={() => setModalOpen(false)}>
        <CustomerForm onSubmit={handleCreate} onCancel={() => setModalOpen(false)} />
      </Modal>

      <Modal open={!!editing} title="Edit Customer" onClose={() => setEditing(null)}>
        {editing && (
          <CustomerForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
        )}
      </Modal>
    </div>
  );
}
