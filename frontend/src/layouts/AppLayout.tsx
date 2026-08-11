import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Package,
  Boxes,
  FileText,
  ClipboardList,
  UserCog,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Role } from "../types";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles?: Role[];
}

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users, roles: ["ADMIN", "SALES", "ACCOUNTS"] },
  { to: "/products", label: "Products", icon: Package },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/challans", label: "Sales Challans", icon: FileText },
  {
    to: "/follow-ups",
    label: "Follow-ups",
    icon: ClipboardList,
    roles: ["ADMIN", "SALES", "ACCOUNTS"],
  },
  { to: "/users", label: "Users", icon: UserCog, roles: ["ADMIN"] },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(user!.role));

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <SidebarContent items={visibleItems} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-white shadow-xl">
            <div className="flex justify-end p-2">
              <button onClick={() => setMobileOpen(false)} className="p-2 text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent items={visibleItems} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <button
            className="p-2 text-gray-500 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {user?.name?.charAt(0)}
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          EF
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-gray-900">ERPFlow</p>
          <p className="text-[11px] leading-tight text-gray-500">Wholesale Operations</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            <item.icon className="h-4.5 w-4.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
