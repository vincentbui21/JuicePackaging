import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n"; // Initialize i18n
import "./css/animations.css"; // Import animations
import { ThemeModeProvider } from "./contexts/ThemeContext.jsx";

/** Layout & components */
import DashboardLayout from "./components/DashboardLayout.jsx";
import AdminReportsLayout from "./components/AdminReportsLayout.jsx";
import PageHeader from "./components/PageHeader.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";

/** Icons */
import { Home, Users, Package, Droplets, Boxes, Archive, MapPin, UserCog, Grid3X3, Layers, Plus, Settings as Cog, Calendar } from "lucide-react";

/** Pages */
import LoginPage from "./pages/LoginPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CustomerInfoEntry from "./pages/CustomerInfoEntry.jsx";
import CrateHandling from "./pages/CrateHandling.jsx";
import CustomerInfoManagement from "./pages/customer_info_management.jsx";
import JuiceHandlePage from "./pages/JuiceHandlePage.jsx";
import JuiceProcessingManagement from "./pages/JuiceProcessingManagement.jsx";
import UnifiedManagement from "./pages/UnifiedManagement.jsx";
import UnifiedShelvesPalletsManagement from "./pages/UnifiedShelvesPalletsManagement.jsx";
import BoxToPalletLoadingPage from "./pages/BoxToPalletLoadingPage.jsx";
import PalletToShelfHandlePage from "./pages/PalletToShelfHandlePage.jsx";
import PickupPage from "./pages/PickupPage.jsx";
import SettingPage from "./pages/settingPage.jsx";
import AdminReports from "./pages/AdminReports.jsx";
import UserManualPage from "./pages/UserManualPage.jsx";
import DiscountManagement from "./pages/DiscountManagement.jsx";
import ReservationManagement from "./pages/ReservationManagement.jsx";

import DeleteBinPage from "./pages/DeleteBinPage.jsx";

/** Helper to wrap a page with the dashboard layout */
const wrap = (Content, { icon, title, subtitle, badge }) => (
  <DashboardLayout>
    <PageHeader icon={icon} title={title} subtitle={subtitle} badge={badge} />
    <Content />
  </DashboardLayout>
);

/** Router */
const router = createBrowserRouter([
  { path: "/", element: <LoginPage /> },

  // Protected routes
  { path: "/dashboard", element: (
    <ProtectedRoute>
      <DashboardLayout><Dashboard /></DashboardLayout>
    </ProtectedRoute>
  )},

  { path: "/customer-info-entry", element: (
    <ProtectedRoute>{wrap(CustomerInfoEntry, { icon: Users, title: "Customer Info Entry", subtitle: "Register customers and create orders" })}</ProtectedRoute>
  )},
  { path: "/crate-handling", element: (
    <ProtectedRoute>{wrap(CrateHandling, { icon: Package, title: "Crate Management", subtitle: "Scan and prepare crates" })}</ProtectedRoute>
  )},
  { path: "/juice-processing", element: (
    <ProtectedRoute>{wrap(JuiceHandlePage, { icon: Droplets, title: "Juice Processing", subtitle: "Print pouches and mark orders done" })}</ProtectedRoute>
  )},
  { path: "/load-boxes-to-pallet", element: (
    <ProtectedRoute>{wrap(BoxToPalletLoadingPage, { icon: Boxes, title: "Load Boxes → Pallet", subtitle: "Scan boxes onto a pallet" })}</ProtectedRoute>
  )},
  { path: "/load-pallet-to-shelf", element: (
    <ProtectedRoute>{wrap(PalletToShelfHandlePage, { icon: Archive, title: "Load Pallet → Shelf", subtitle: "Place pallets onto shelves and notify customers" })}</ProtectedRoute>
  )},
  { path: "/pickup", element: (
    <ProtectedRoute>{wrap(PickupPage, { icon: MapPin, title: "Pickup Coordination", subtitle: "Find customer orders and mark picked up" })}</ProtectedRoute>
  )},

  // Management
  { path: "/customer-management", element: (
    <ProtectedRoute>{wrap(CustomerInfoManagement, { icon: UserCog, title: "Customer Management" })}</ProtectedRoute>
  )},
  { path: "/discount-management", element: (
    <ProtectedRoute>{wrap(DiscountManagement, { icon: Cog, title: "Discount Management", subtitle: "Manage customer discounts for next season" })}</ProtectedRoute>
  )},
  { path: "/reservation-management", element: (
    <ProtectedRoute>{wrap(ReservationManagement, { icon: Calendar, title: "Reservation Management", subtitle: "View and manage customer pickup reservations" })}</ProtectedRoute>
  )},
  { path: "/delete-bin", element: (
    <ProtectedRoute>{wrap(DeleteBinPage, { icon: UserCog, title: "Delete Bin" })}</ProtectedRoute>
  )},
  { path: "/shelves-pallets-management", element: (
    <ProtectedRoute>{wrap(UnifiedShelvesPalletsManagement, { icon: Grid3X3, title: "Shelves & Pallets Management" })}</ProtectedRoute>
  )},
  { path: "/juice-processing-management", element: (
    <ProtectedRoute>{wrap(JuiceProcessingManagement, { icon: Droplets, title: "Juice Processing Management" })}</ProtectedRoute>
  )},
  { path: "/unified-management", element: (
    <ProtectedRoute>{wrap(UnifiedManagement, { icon: UserCog, title: "Unified Management" })}</ProtectedRoute>
  )},

  // Redirects for merged pages
  { path: "/pallets-management", element: <Navigate to="/shelves-pallets-management" replace /> },
  { path: "/shelve-management", element: <Navigate to="/shelves-pallets-management" replace /> },
  { path: "/create-pallet", element: <Navigate to="/shelves-pallets-management" replace /> },
  { path: "/create-shelve", element: <Navigate to="/shelves-pallets-management" replace /> },

  // Create / Settings
  { path: "/setting", element: (
    <AdminRoute>{wrap(SettingPage, { icon: Cog, title: "Settings" })}</AdminRoute>
  )},

  // Admin
  { path: "/admin/reports", element: (
    <AdminRoute requirePermission="can_view_reports">
      <AdminReportsLayout><AdminReports /></AdminReportsLayout>
    </AdminRoute>
  )},
  
  { path: "/admin/user-manual", element: (
    <AdminRoute requirePermission="can_view_reports">
      <DashboardLayout><UserManualPage /></DashboardLayout>
    </AdminRoute>
  )},
]);

/** Mount app */
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeModeProvider>
      <RouterProvider router={router} />
    </ThemeModeProvider>
  </StrictMode>
);
