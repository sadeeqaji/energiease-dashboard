import React, { useState, useEffect } from 'react';
import { api } from './api';
import { AdminUser, DashboardStats, DiscoHealth, OrderItem } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OrderDrawer } from './components/OrderDrawer';
import { LoginView } from './views/LoginView';
import { OverviewView } from './views/OverviewView';
import { SupportView } from './views/SupportView';
import { AccountingView } from './views/AccountingView';
import { CustomersView } from './views/CustomersView';
import { StaffView } from './views/StaffView';
import { AnalyticsView } from './views/AnalyticsView';
import { SupportDeskView } from './views/SupportDeskView';
import { SettingsView } from './views/SettingsView';

export function App() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(api.getSavedUser());
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  // Global shared data for header and overview
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [discos, setDiscos] = useState<DiscoHealth[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);

  // Load telemetry
  const loadDashboardData = async () => {
    if (!api.getToken()) return;
    try {
      const [statsData, discosData, ordersData] = await Promise.all([
        api.getStats().catch(() => null),
        api.getDiscoHealth().catch(() => []),
        api.getOrders({ limit: 10 }).catch(() => ({ orders: [] })),
      ]);

      if (statsData) setStats(statsData);
      if (discosData) setDiscos(discosData);
      if (ordersData?.orders) setRecentOrders(ordersData.orders);
    } catch (err) {
      console.error('Failed to sync dashboard telemetry:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      // Default initial tab based on role
      if (currentUser.role === 'support') {
        setActiveTab('support_chat');
      } else if (currentUser.role === 'accounting') {
        setActiveTab('accounting');
      } else {
        setActiveTab('overview');
      }
      loadDashboardData();
    }

    const handleUnauthorized = () => {
      setCurrentUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [currentUser?.email]);

  const handleLoginSuccess = (user: AdminUser) => {
    setCurrentUser(user);
    if (user.role === 'support') {
      setActiveTab('support');
    } else if (user.role === 'accounting') {
      setActiveTab('accounting');
    } else {
      setActiveTab('overview');
    }
    loadDashboardData();
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'overview':
        return 'Operations & Executive Overview';
      case 'analytics':
        return 'Business Intelligence & Analytics';
      case 'support_chat':
        return 'Live WhatsApp Support Desk';
      case 'support':
        return 'Customer Support & Order Fulfillment Desk';
      case 'accounting':
        return 'Accounting, Ledger & BuyPower Reconciliation';
      case 'customers':
        return 'Registered Customers & Saved Meters';
      case 'staff':
        return 'Staff & Access Management (RBAC)';
      case 'settings':
        return 'System Settings & Gateway Routing';
      default:
        return 'Operations Portal';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-zinc-100">
      {/* 1px border sidebar */}
      <Sidebar
        user={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onLogout={handleLogout}
      />

      {/* Main App Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          title={getHeaderTitle()}
          stats={stats}
          user={currentUser}
          onRefresh={loadDashboardData}
        />

        <main className={`flex-1 bg-[#09090b] ${activeTab === 'support_chat' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
          {activeTab === 'overview' && (
            <OverviewView
              stats={stats}
              discos={discos}
              recentOrders={recentOrders}
              onSelectOrder={(order) => setSelectedOrder(order)}
              onNavigateToSupport={() => setActiveTab('support')}
              onNavigateToAccounting={() => setActiveTab('accounting')}
              onNavigateToAnalytics={() => setActiveTab('analytics')}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              stats={stats}
              discos={discos}
              recentOrders={recentOrders}
              onNavigateToAccounting={() => setActiveTab('accounting')}
              onNavigateToSupport={() => setActiveTab('support')}
            />
          )}

          {activeTab === 'support_chat' && (
            <div className="h-full p-4 flex flex-col min-h-0">
              <SupportDeskView
                currentUser={currentUser}
                onSelectOrder={(order) => setSelectedOrder(order)}
              />
            </div>
          )}

          {activeTab === 'support' && (
            <SupportView
              user={currentUser}
              onSelectOrder={(order) => setSelectedOrder(order)}
            />
          )}

          {activeTab === 'accounting' && (
            <AccountingView />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              onSearchCustomerOrders={(_phone) => {
                setActiveTab('support');
              }}
            />
          )}

          {activeTab === 'staff' && currentUser.role === 'superadmin' && (
            <StaffView />
          )}

          {activeTab === 'settings' && (currentUser.role === 'admin' || currentUser.role === 'superadmin') && (
            <SettingsView user={currentUser} />
          )}
        </main>
      </div>

      {/* Order Detail & Intervention Drawer */}
      <OrderDrawer
        order={selectedOrder}
        user={currentUser}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={loadDashboardData}
      />
    </div>
  );
}

export default App;
