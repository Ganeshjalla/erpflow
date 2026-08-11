import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import * as challanService from "../services/challanService";
import { ChallanListItem, Pagination } from "../types";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { PaginationBar } from "../components/PaginationBar";
import { Badge, statusColor } from "../components/Badge";
import { extractErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function ChallansPage() {
  const { user } = useAuth();
  const canCreate = user?.role === "ADMIN" || user?.role === "SALES";

  const [challans, setChallans] = useState<ChallanListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await challanService.listChallans({
        page,
        limit: 10,
        search: search || undefined,
        status: status || undefined,
      });
      setChallans(res.data);
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
  }, [page, status]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (page === 1) load();
      else setPage(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sales Challans</h1>
          <p className="text-sm text-gray-500">Create and track sales challans</p>
        </div>
        {canCreate && (
          <Link
            to="/challans/create"
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Create Challan
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-100 bg-white p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by challan number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : challans.length === 0 ? (
          <EmptyState
            title="No challans found"
            description="Create your first sales challan to get started."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 font-medium">Challan Number</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Total Qty</th>
                    <th className="px-4 py-3 font-medium">Total Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created By</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {challans.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <Link to={`/challans/${c.id}`} className="font-medium text-brand-700 hover:underline">
                          {c.challanNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.customerName}</td>
                      <td className="px-4 py-3 text-gray-600">{c.totalQuantity}</td>
                      <td className="px-4 py-3 text-gray-600">₹{Number(c.totalAmount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge color={statusColor(c.status)}>{c.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.createdByName}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-50 md:hidden">
              {challans.map((c) => (
                <Link key={c.id} to={`/challans/${c.id}`} className="block px-4 py-3 hover:bg-gray-50/60">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{c.challanNumber}</p>
                      <p className="text-xs text-gray-500">{c.customerName}</p>
                    </div>
                    <Badge color={statusColor(c.status)}>{c.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Qty {c.totalQuantity} · ₹{Number(c.totalAmount).toFixed(2)}
                  </p>
                </Link>
              ))}
            </div>

            {pagination && <PaginationBar pagination={pagination} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  );
}
