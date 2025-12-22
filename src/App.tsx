import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import AdminLayout from './layouts/AdminLayout';
import LandingPage from './pages/customer/LandingPage';
import Dashboard from './pages/admin/Dashboard';
import Stock from './pages/admin/Stock';
import Financials from './pages/admin/Financials';
import Rentals from './pages/admin/Rentals';
import Customers from './pages/admin/Customers';
import Assets from './pages/admin/Assets';
import Expenses from './pages/admin/Expenses';
import Employees from './pages/admin/Employees';
import POS from './pages/pos/POS';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          {/* Public Customer Routes */}
          <Route path="/" element={<LandingPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="estoque" element={<Stock />} />
            <Route path="financeiro" element={<Financials />} />
            <Route path="locacoes" element={<Rentals />} />
            <Route path="clientes" element={<Customers />} />
            <Route path="equipamentos" element={<Assets />} />
            <Route path="despesas" element={<Expenses />} />
            <Route path="funcionarios" element={<Employees />} />
          </Route>

          {/* POS Route */}
          <Route path="/pos" element={<POS />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
