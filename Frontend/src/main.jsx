import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Router, RouterProvider } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import CustomerInfoEntry from './pages/CustomerInfoEntry.jsx'
import CrateHandling from './pages/CrateHandling.jsx'
import CustomerInfoManagement from './pages/customer_info_management.jsx'
import JuiceHandlePage from "./pages/JuiceHandlePage.jsx";
import PalletToShelfHandlePage from './pages/PalletToShelfHandlePage';
import PickupPage from "./pages/PickupPage.jsx";
import JuiceProcessingManagement from "./pages/JuiceProcessingManagement";
import BoxToPalletLoadingPage from './pages/BoxToPalletLoadingPage.jsx'
import ShelveManagement from './pages/ShelveManagement.jsx'
import PalletCreationPage from './pages/PalletCreationPage.jsx'
import PalletsManagementPage from './pages/PalletsManagementPage.jsx'
import ShelveCreationPage from './pages/ShelveCreationPage.jsx'

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
  path: "/load-boxes-to-pallet",
  element: <BoxToPalletLoadingPage />,
},
{
  path: "/load-pallet-to-shelf",
  element: <PalletToShelfHandlePage />,
},
{
path: "/pickup",
element: <PickupPage />,
},
{
  path: "/create-pallet",
  element: <PalletCreationPage />,
},
{
  path: "/create-shelve",
  element: <ShelveCreationPage />,
},
  {
    path: "/shelve-management",
    element: <ShelveManagement />,
  },
    {
    path: "/pallets-management",
      element: <PalletsManagementPage />,
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)