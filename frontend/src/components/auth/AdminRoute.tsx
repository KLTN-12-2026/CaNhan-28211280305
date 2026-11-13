import { useAuthStore } from "@/stores/useAuthStore";
import { Navigate, Outlet } from "react-router";

const AdminRoute = () => {
  const { user } = useAuthStore();

  if (user && user.role !== "admin" && user.role !== "superadmin") {
    return <Navigate to="/chat" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
