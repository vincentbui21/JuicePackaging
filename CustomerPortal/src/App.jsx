import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import CustomerPortalPage from './pages/CustomerPortalPage';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<CustomerPortalPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
