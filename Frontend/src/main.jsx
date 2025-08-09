import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Vincent-wins pages
import LoginPage from './pages/LoginPage.jsx';                                     // 
import CustomerInfoEntry from './pages/CustomerInfoEntry.jsx';                      // 
import CrateHandling from './pages/CrateHandling.jsx';                              // merged version
import CustomerInfoManagement from './pages/customer_info_management.jsx';          // 
import JuiceHandlePage from './pages/JuiceHandlePage.jsx';                          // 
import JuiceProcessingManagement from './pages/JuiceProcessingManagement.jsx';      // 

/** Your added pages (Eric logic kept, styled with Vincent UI) */
import BoxToPalletLoadingPage from './pages/BoxToPalletLoadingPage.jsx';            // :contentReference[oaicite:7]{index=7}
import PalletToShelfHandlePage from './pages/PalletToShelfHandlePage.jsx';          // 
import PalletCreationPage from './pages/PalletCreationPage.jsx';                    // 
import PalletsManagementPage from './pages/PalletsManagementPage.jsx';              // 
import ShelveCreationPage from './pages/ShelveCreationPage.jsx';                    // 
import ShelveManagement from './pages/ShelveManagement.jsx';                        // 
import PickupPage from './pages/PickupPage.jsx';                                    // 
import SettingPage from './pages/settingPage.jsx';                                  // 

const router = createBrowserRouter([
  { path: '/', element: <LoginPage/> },

  // Operations
  { path: '/customer-info-entry', element: <CustomerInfoEntry/> },
  { path: '/crate-handling', element: <CrateHandling/> },
  { path: '/juice-handle', element: <JuiceHandlePage/> },
  { path: '/load-boxes-to-pallet', element: <BoxToPalletLoadingPage/> },          // NEW
  { path: '/load-pallet-to-shelf', element: <PalletToShelfHandlePage/> },         // NEW
  { path: '/pickup', element: <PickupPage/> },

  // Admin/Management
  { path: '/customer-management', element: <CustomerInfoManagement/> },
  { path: '/juice-management', element: <JuiceProcessingManagement/> },
  { path: '/pallets-management', element: <PalletsManagementPage/> },
  { path: '/shelve-management', element: <ShelveManagement/> },

  // Utilities
  { path: '/create-pallet', element: <PalletCreationPage/> },
  { path: '/create-shelve', element: <ShelveCreationPage/> },
  { path: '/setting', element: <SettingPage/> },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>
);
