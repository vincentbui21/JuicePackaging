import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

/** Layout pieces */
import DashboardLayout from "./components/DashboardLayout.jsx";
import PageHeader from "./components/PageHeader.jsx";

/** Icons */
import {
  Home, Users, Package, Droplets, Boxes, Archive, MapPin,
  UserCog, Grid3X3, Layers, Plus, Settings as Cog
} from "lucide-react";

/** PAGES (your existing ones) */
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

/** THEME (already used earlier) */
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

/** Helper to wrap a page with the new chrome */
const wrap = (Content, { icon, title, subtitle, badge }) => (
  <DashboardLayout>
    <PageHeader icon={icon} title={title} subtitle={subtitle} badge={badge} />
    <Content />
  </DashboardLayout>
);

/** ROUTER */
const router = createBrowserRouter([
  { path: "/", element: <LoginPage /> },
  { path: '/dashboard', element: (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  )},
  
  // Operations
  { path: "/customer-info-entry", element: wrap(CustomerInfoEntry, { icon: Users, title: "Customer Info Entry", subtitle: "Register customers and create orders" }) },
  { path: "/crate-handling", element: wrap(CrateHandling, { icon: Package, title: "Crate Management", subtitle: "Scan and prepare crates" }) },
  { path: "/juice-processing", element: wrap(JuiceHandlePage, { icon: Droplets, title: "Juice Processing", subtitle: "Print pouches and mark orders done" }) },
  { path: "/load-boxes-to-pallet", element: wrap(BoxToPalletLoadingPage, { icon: Boxes, title: "Load Boxes → Pallet", subtitle: "Scan boxes onto a pallet" }) },
  { path: "/load-pallet-to-shelf", element: wrap(PalletToShelfHandlePage, { icon: Archive, title: "Load Pallet → Shelf", subtitle: "Place pallets onto shelves and notify customers" }) },
  { path: "/pickup", element: wrap(PickupPage, { icon: MapPin, title: "Pickup Coordination", subtitle: "Find customer orders and mark picked up" }) },

  // Management
  { path: "/customer-management", element: wrap(CustomerInfoManagement, { icon: UserCog, title: "Customer Management" }) },
  { path: "/pallets-management", element: wrap(PalletsManagementPage, { icon: Grid3X3, title: "Pallets Management" }) },
  { path: "/shelve-management", element: wrap(ShelveManagement, { icon: Layers, title: "Shelves Management" }) },
  {path: "/juice-processing-management", element: wrap(JuiceProcessingManagement, { icon: Droplets, title: "Juice Processing Management" }) },

  // Create / Settings
  { path: "/create-pallet", element: wrap(PalletCreationPage, { icon: Plus, title: "Create Pallet" }) },
  { path: "/create-shelve", element: wrap(ShelveCreationPage, { icon: Plus, title: "Create Shelf" }) },
  { path: "/setting", element: wrap(SettingPage, { icon: Cog, title: "Settings" }) },
]);

/** MOUNT */
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>
);
