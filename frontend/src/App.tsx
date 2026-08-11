import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./layouts/AppLayout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import ProductsPage from "./pages/ProductsPage";
import InventoryPage from "./pages/InventoryPage";
import ChallansPage from "./pages/ChallansPage";
import CreateChallanPage from "./pages/CreateChallanPage";
import ChallanDetailPage from "./pages/ChallanDetailPage";
import FollowUpsPage from "./pages/FollowUpsPage";
import UsersPage from "./pages/UsersPage";

function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route
                path="/customers"
                element={
                  <ProtectedRoute roles={["ADMIN", "SALES", "ACCOUNTS"]}>
                    <CustomersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers/:id"
                element={
                  <ProtectedRoute roles={["ADMIN", "SALES", "ACCOUNTS"]}>
                    <CustomerDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/products" element={<ProductsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />

              <Route path="/challans" element={<ChallansPage />} />
              <Route
                path="/challans/create"
                element={
                  <ProtectedRoute roles={["ADMIN", "SALES"]}>
                    <CreateChallanPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/challans/:id" element={<ChallanDetailPage />} />

              <Route
                path="/follow-ups"
                element={
                  <ProtectedRoute roles={["ADMIN", "SALES", "ACCOUNTS"]}>
                    <FollowUpsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRoute roles={["ADMIN"]}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
