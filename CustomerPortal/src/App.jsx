import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CustomerPortalPage from './pages/CustomerPortalPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CustomerPortalPage />} />
      </Routes>
    </Router>
  );
}

export default App;
