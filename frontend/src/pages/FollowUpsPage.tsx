import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as customerService from "../services/customerService";
import { Customer } from "../types";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { extractErrorMessage } from "../services/api";

export default function FollowUpsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await customerService.listCustomers({ limit: 100 });
      const withFollowUps = res.data
        .filter((c) => c.followUpDate)
        .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime());
      setCustomers(withFollowUps);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">CRM Follow-ups</h1>
        <p className="text-sm text-gray-500">All customers with a scheduled follow-up date</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : customers.length === 0 ? (
          <EmptyState title="No follow-ups scheduled" description="Add a follow-up date from a customer's profile." />
        ) : (
          <div className="divide-y divide-gray-50">
            {customers.map((c) => (
              <Link
                key={c.id}
                to={`/customers/${c.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50/60"
              >
                <div>
                  <p className="font-medium text-gray-900">{c.customerName}</p>
                  <p className="text-xs text-gray-500">{c.businessName}</p>
                </div>
                <p className="text-sm font-medium text-brand-600">
                  {new Date(c.followUpDate!).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
