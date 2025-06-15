import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import CustomerInfoEntry from './pages/CustomerInfoEntry.jsx';
import JuiceHandlePage from './pages/JuiceHandlePage.jsx';
import LoadingHandlePage from './pages/LoadingHandlePage.jsx';
import PickupPage from './pages/PickupPage.jsx';

const router = createBrowserRouter([
  { path: "/", element: <LoginPage /> },
  { path: "/customer-info-entry", element: <CustomerInfoEntry /> },
  { path: "/juice-handle", element: <JuiceHandlePage /> },
  { path: "/loading-handle", element: <LoadingHandlePage /> },
  { path: "/pickup", element: <PickupPage /> },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
