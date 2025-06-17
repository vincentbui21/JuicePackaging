import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Router, RouterProvider } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import CustomerInfoEntry from './pages/CustomerInfoEntry.jsx'
import CrateHandling from './pages/CrateHandling.jsx'

const router = createBrowserRouter([
  {
  path: "/", element: <LoginPage/>,
},
{
  path: "/customer-info-entry", element: <CustomerInfoEntry/>,
},
{
  path: "/crate-handling", element: <CrateHandling />
}
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)
