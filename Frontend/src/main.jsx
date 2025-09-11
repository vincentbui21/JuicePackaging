import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

/** Layout & components */
import DashboardLayout from "./components/DashboardLayout.jsx";
import PageHeader from "./components/PageHeader.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

/** Icons */
import { Home, Users, Package, Droplets, Boxes, Archive, MapPin, UserCog, Grid3X3, Layers, Plus, Settings as Cog } from "lucide-react";

/** Pages */
import LoginPage from "./pages/LoginPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CustomerInfoEntry from "./pages/CustomerInfoEntry.jsx";
import CrateHandling from "./pages/CrateHandling.jsx";
import CustomerInfoManagement from "./pages/customer_info_management.jsx";
import JuiceHandlePage from "./pages/JuiceHandlePage.jsx";
import JuiceProcessingManagement from "./pages/JuiceProcessingManagement.jsx";
import BoxToPalletLoadingPage from "./pages/BoxToPalletLoadingPage.jsx";
import PalletToShelfHandlePage from "./pages/PalletToShelfHandlePage.jsx";
import PalletCreationPage from "./pages/PalletCreationPage.jsx";
import PalletsManagementPage from "./pages/PalletsManagementPage.jsx";
import ShelveCreationPage from "./pages/ShelveCreationPage.jsx";
import ShelveManagement from "./pages/ShelveManagement.jsx";
import PickupPage from "./pages/PickupPage.jsx";
import SettingPage from "./pages/settingPage.jsx";

/** Theme */
const theme = createTheme({
  palette: {
    primary: { main: "#2e7d32" },
    success: { main: "#2e7d32" },
    warning: { main: "#f59e0b" },
    info: { main: "#2f80ed" },
    background: { default: "#f3f7f4" },
  },
  shape: { borderRadius: 12 },
});

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
  { path: "/pallets-management", element: (
    <ProtectedRoute>{wrap(PalletsManagementPage, { icon: Grid3X3, title: "Pallets Management" })}</ProtectedRoute>
  )},
  { path: "/shelve-management", element: (
    <ProtectedRoute>{wrap(ShelveManagement, { icon: Layers, title: "Shelves Management" })}</ProtectedRoute>
  )},
  { path: "/juice-processing-management", element: (
    <ProtectedRoute>{wrap(JuiceProcessingManagement, { icon: Droplets, title: "Juice Processing Management" })}</ProtectedRoute>
  )},

  // Create / Settings
  { path: "/create-pallet", element: (
    <ProtectedRoute>{wrap(PalletCreationPage, { icon: Plus, title: "Create Pallet" })}</ProtectedRoute>
  )},
  { path: "/create-shelve", element: (
    <ProtectedRoute>{wrap(ShelveCreationPage, { icon: Plus, title: "Create Shelf" })}</ProtectedRoute>
  )},
  { path: "/setting", element: (
    <ProtectedRoute>{wrap(SettingPage, { icon: Cog, title: "Settings" })}</ProtectedRoute>
  )},
]);

/** Mount app */
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>
);
