import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Router, RouterProvider } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import CustomerInfoEntry from './pages/CustomerInfoEntry.jsx'
import CrateHandling from './pages/CrateHandling.jsx'
import CustomerInfoManagement from './pages/customer_info_management.jsx'
import JuiceHandlePage from "./pages/JuiceHandlePage.jsx";
import LoadingHandlePage from "./pages/LoadingHandlePage.jsx";
import PickupPage from "./pages/PickupPage.jsx";
import JuiceProcessingManagement from "./pages/JuiceProcessingManagement";
import PalletManagement from "./pages/PalletManagement.jsx";

const router = createBrowserRouter([
  {
  path: "/", element: <LoginPage/>,
},
{
  path: "/customer-info-entry", element: <CustomerInfoEntry/>,
},
{
  path: "/crate-handling", element: <CrateHandling />
},
{
  path: "/customer-management", element: <CustomerInfoManagement />
},
{
path: "/juice-handle",
element: <JuiceHandlePage />,
},
{
  path: "/juice-management",
  element: <JuiceProcessingManagement />
},
{
path: "/loading-handle",
element: <LoadingHandlePage />,
},
{
path: "/pickup",
element: <PickupPage />,
},
{
  path: "/pallet-management",
  element: <PalletManagement />,
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)