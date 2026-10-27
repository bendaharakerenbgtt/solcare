import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { PublicLayout } from './ui/public/PublicLayout';
import { HomePage } from './ui/public/HomePage';
import { ServicesPage } from './ui/public/ServicesPage';
import { TrackOrderPage } from './ui/public/TrackOrderPage';
import { AnnouncementsPage } from './ui/public/AnnouncementsPage';
import { ContactPage } from './ui/public/ContactPage';

import { AdminLayout } from './ui/admin/AdminLayout';
import { LoginPage } from './ui/admin/LoginPage';
import { DashboardPage } from './ui/admin/DashboardPage';
import { OrdersListPage } from './ui/admin/OrdersListPage';
import { OrderFormPage } from './ui/admin/OrderFormPage';
import { OrderDetailPage } from './ui/admin/OrderDetailPage';
import { CalendarPage } from './ui/admin/CalendarPage';
import { ServicesAdminPage } from './ui/admin/ServicesAdminPage';
import { ProductsAdminPage } from './ui/admin/ProductsAdminPage';
import { CustomersPage } from './ui/admin/CustomersPage';
import { AnnouncementsAdminPage } from './ui/admin/AnnouncementsAdminPage';
import { ReportsPage } from './ui/admin/ReportsPage';
import { RetentionPage } from './ui/admin/RetentionPage';
import { SettingsPage } from './ui/admin/SettingsPage';
import { StaffAdminPage } from './ui/admin/StaffAdminPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Website Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="layanan" element={<ServicesPage />} />
            <Route path="cek-pesanan" element={<TrackOrderPage />} />
            <Route path="pengumuman" element={<AnnouncementsPage />} />
            <Route path="kontak" element={<ContactPage />} />
          </Route>

          {/* Admin Login */}
          <Route path="/admin/login" element={<LoginPage />} />

          {/* Protected Admin Dashboard Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="orders" element={<OrdersListPage />} />
            <Route path="orders/new" element={<OrderFormPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="orders/:id/edit" element={<OrderFormPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="services" element={<ServicesAdminPage />} />
            <Route path="products" element={<ProductsAdminPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="announcements" element={<AnnouncementsAdminPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="retention" element={<RetentionPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="staff" element={<StaffAdminPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
