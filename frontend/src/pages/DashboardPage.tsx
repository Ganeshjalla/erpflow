import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Package,
  AlertTriangle,
  Boxes,
  FileCheck2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { getDashboardStats } from "../services/dashboardService";
import { DashboardStats } from "../types";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { Badge, statusColor } from "../components/Badge";
import { extractErrorMessage } from "../services/api";
import { Link } from "react-router-dom";

const CHALLAN_COLORS = ["#eab308", "#22c55e", "#ef4444"];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error || !stats) return <ErrorState message={error ?? "Unable to load dashboard"} onRetry={load} />;

  const challanChartData = [
    { name: "Draft", value: stats.challans.draft },
    { name: "Confirmed", value: stats.challans.confirmed },
    { name: "Cancelled", value: stats.challans.cancelled },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of customers, inventory, and sales activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label="Total Customers" value={stats.customers.total} color="brand" />
        <StatCard icon={UserCheck} label="Active Customers" value={stats.customers.active} color="green" />
        <StatCard icon={Package} label="Products" value={stats.products.total} color="indigo" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={stats.products.lowStock} color="yellow" />
        <StatCard icon={Boxes} label="Total Stock" value={stats.totalStockQuantity} color="blue" />
        <StatCard icon={FileCheck2} label="Confirmed Challans" value={stats.challans.confirmed} color="green" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">Challan Status</h3>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={challanChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {challanChartData.map((_, idx) => (
                    <Cell key={idx} fill={CHALLAN_COLORS[idx]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs text-gray-600">
            {challanChartData.map((d, idx) => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: CHALLAN_COLORS[idx] }}
                />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">Inventory Overview</h3>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Products", value: stats.products.total },
                  { name: "Low Stock", value: stats.products.lowStock },
                  { name: "Out of Stock", value: stats.products.outOfStock },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f1f5" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3763f4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TablePanel title="Recent Challans" viewAllHref="/challans">
          {stats.recentChallans.length === 0 && <p className="p-4 text-sm text-gray-400">No challans yet.</p>}
          {stats.recentChallans.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{c.challanNumber}</p>
                <p className="truncate text-xs text-gray-500">{c.customerName}</p>
              </div>
              <Badge color={statusColor(c.status)}>{c.status}</Badge>
            </div>
          ))}
        </TablePanel>

        <TablePanel title="Low Stock Products" viewAllHref="/products?lowStock=true">
          {stats.products.lowStock + stats.products.outOfStock === 0 && (
            <p className="p-4 text-sm text-gray-400">All products are well stocked.</p>
          )}
          {stats.recentStockMovements.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{m.productName}</p>
                <p className="truncate text-xs text-gray-500">{m.sku}</p>
              </div>
              <Badge color={m.movementType === "IN" ? "green" : "gray"}>
                {m.movementType} {m.quantity}
              </Badge>
            </div>
          ))}
        </TablePanel>

        <TablePanel title="Upcoming Follow-ups" viewAllHref="/follow-ups">
          {stats.upcomingFollowUps.length === 0 && (
            <p className="p-4 text-sm text-gray-400">No upcoming follow-ups.</p>
          )}
          {stats.upcomingFollowUps.map((f) => (
            <div key={f.id} className="px-4 py-2.5 text-sm">
              <p className="font-medium text-gray-900">{f.customerName}</p>
              <p className="truncate text-xs text-gray-500">{f.note}</p>
              <p className="text-xs text-brand-600">
                {new Date(f.followUpDate).toLocaleDateString()}
              </p>
            </div>
          ))}
        </TablePanel>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: "brand" | "green" | "indigo" | "yellow" | "blue";
}) {
  const colorMap: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    green: "bg-green-50 text-green-600",
    indigo: "bg-indigo-50 text-indigo-600",
    yellow: "bg-yellow-50 text-yellow-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className={`inline-flex items-center justify-center rounded-lg p-2 ${colorMap[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function TablePanel({
  title,
  viewAllHref,
  children,
}: {
  title: string;
  viewAllHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <Link to={viewAllHref} className="text-xs font-medium text-brand-600 hover:underline">
          View all
        </Link>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}
