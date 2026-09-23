import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  LifeBuoy, 
  FileSpreadsheet, 
  Users, 
  LogOut, 
  Zap, 
  ChevronRight,
  ShieldCheck,
  BarChart3,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Settings
} from 'lucide-react';
import { AdminUser } from '../types';
import Logo, { LogoIcon } from './Logo';

interface Props {
  user: AdminUser;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<Props> = ({ user, activeTab, onSelectTab, onLogout }) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('ee_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('ee_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Keyboard shortcut (Ctrl+B or Cmd+B) to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isSuperadmin = user.role === 'superadmin';
  const isAdminOrSuper = isSuperadmin || user.role === 'admin';
  const isAccounting = isAdminOrSuper || user.role === 'accounting';
  const isSupport = isAdminOrSuper || user.role === 'support';

  const navItems = [
    {
      id: 'overview',
      label: 'Executive Overview',
      icon: LayoutDashboard,
      visible: isAdminOrSuper || isAccounting,
    },
    {
      id: 'analytics',
      label: 'Analytics & Trends',
      icon: BarChart3,
      visible: isAdminOrSuper || isAccounting,
    },
    {
      id: 'support_chat',
      label: 'Live WhatsApp Chat',
      icon: MessageSquare,
      visible: isSupport,
    },
    {
      id: 'support',
      label: 'Orders & Interventions',
      icon: LifeBuoy,
      visible: isSupport,
    },
    {
      id: 'accounting',
      label: 'Accounting & Ledger',
      icon: FileSpreadsheet,
      visible: isAccounting,
    },
    {
      id: 'customers',
      label: 'Customers & Meters',
      icon: Users,
      visible: isSupport || isAdminOrSuper,
    },
    {
      id: 'staff',
      label: 'Staff & Access (RBAC)',
      icon: ShieldCheck,
      visible: isSuperadmin,
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      visible: isAdminOrSuper,
    },
  ].filter(item => item.visible);

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'SA';

  return (
    <aside
      className={`bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between h-screen shrink-0 select-none transition-all duration-200 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Brand Header */}
      <div>
        <div className={`border-b border-zinc-800/80 flex items-center ${collapsed ? 'flex-col gap-2 py-3 px-2' : 'h-14 justify-between px-4'}`}>
          {!collapsed ? (
            <>
              <div className="flex items-center min-w-0">
                <Logo className="h-6 w-auto text-white shrink-0" />
              </div>
              <button
                onClick={toggleCollapse}
                title="Collapse sidebar (Ctrl+B)"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors shrink-0 ml-1 cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* Brand mark */}
              <button
                onClick={toggleCollapse}
                title="EnergiEase (Click to expand)"
                className="w-8 h-8 flex items-center justify-center shrink-0 hover:opacity-85 transition-opacity cursor-pointer"
              >
                <LogoIcon className="w-6 h-6" />
              </button>
              {/* Always-visible Expand Toggle Button */}
              <button
                onClick={toggleCollapse}
                title="Expand sidebar (Ctrl+B)"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors relative group cursor-pointer"
              >
                <PanelLeft className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-zinc-900 border border-zinc-700 text-white text-xs font-medium rounded-md shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  Expand sidebar (Ctrl+B)
                </div>
              </button>
            </>
          )}
        </div>

        {/* Navigation Items */}
        <nav className={`p-2.5 space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
          {!collapsed && (
            <div className="text-[11px] uppercase font-semibold tracking-wider text-zinc-400 px-3 py-2">
              Main Menu
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            if (collapsed) {
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={item.label}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative group cursor-pointer ${
                    isActive
                      ? 'bg-zinc-800/80 text-white border border-zinc-700/80 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {/* Tooltip on hover */}
                  <div className="absolute left-full ml-2 px-2.5 py-1 bg-zinc-900 border border-zinc-700 text-white text-xs font-medium rounded-md shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {item.label}
                  </div>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 h-9 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-zinc-800/80 text-white border border-zinc-700/80 font-medium shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-200' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Profile */}
      <div className={`border-t border-zinc-800/80 bg-zinc-950 ${collapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3.5'}`}>
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between gap-2 mb-3 px-1">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-zinc-200 truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono truncate">
                  {user.email}
                </div>
              </div>
              <span className="text-[10px] uppercase font-mono font-medium px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 shrink-0">
                {user.role}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 h-8 rounded-lg text-xs font-medium text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <>
            <div
              className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-200 cursor-default font-mono"
              title={`${user.firstName} ${user.lastName} (${user.role}) • ${user.email}`}
            >
              {initials}
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
};
