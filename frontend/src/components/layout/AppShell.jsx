import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, BarChart3, Radar, Brain, Search, Bell, LogOut, 
  Check, AlertTriangle, Zap, CheckCircle2, ChevronDown, User, Layers, Menu, X, PlusCircle, SearchCode 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNotifications } from '../../api/notifications';

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [readIds, setReadIds] = useState([]);

  const notifRef = useRef(null);
  const userRef = useRef(null);

  // Lightweight polling every 8s for new reports and signals
  const { data: rawNotifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 8000,
  });

  const notifications = rawNotifications.map((item) => ({
    ...item,
    isRead: readIds.includes(item.id),
  }));

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Escape key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    setShowUserDropdown(false);
    setIsMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const handleNotificationClick = (item) => {
    if (!readIds.includes(item.id)) {
      setReadIds((prev) => [...prev, item.id]);
    }
    setShowNotifications(false);

    if (item.target_type === 'hotspot') {
      navigate('/hotspots');
    } else if (item.target_type === 'complaint') {
      navigate(`/dashboard?complaint_id=${item.target_id}`);
    }
  };

  const handleMarkAllRead = () => {
    setReadIds(notifications.map((n) => n.id));
  };

  const navItems = [
    { to: '/dashboard', label: 'Civic Operations', icon: LayoutDashboard },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/hotspots', label: 'Hotspots', icon: Radar },
    { to: '/ai-center', label: 'AI Civic Operations', icon: Brain },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden w-full">
      {/* Desktop Light Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white shrink-0 z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <Link to="/" className="flex items-center gap-2">
            <Radar className="w-6 h-6 text-emerald-600 mr-1" />
            <span className="text-lg font-extrabold tracking-tight text-slate-900">CivicNova AI</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="w-4 h-4 mr-3 text-slate-500" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Operational System Badge */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Live System Active</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Municipal Dispatch Network</p>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40"
          />

          {/* Slide-over Menu Panel */}
          <div className="relative w-4/5 max-w-xs bg-white h-full border-r border-slate-200 z-50 flex flex-col p-6 shadow-2xl justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2">
                  <Radar className="w-6 h-6 text-emerald-600" />
                  <span className="text-base font-black tracking-tight text-slate-900">CivicNova AI</span>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Navigation Links */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Navigation</p>
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`
                    }
                  >
                    <item.icon className="w-4.5 h-4.5 mr-3 text-slate-500" />
                    {item.label}
                  </NavLink>
                ))}
              </div>

              {/* Utility Links */}
              <div className="space-y-1 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Actions</p>
                <Link
                  to="/track"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <SearchCode className="w-4 h-4 mr-3 text-slate-500" />
                  Track Report
                </Link>
                <Link
                  to="/report"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50"
                >
                  <PlusCircle className="w-4 h-4 mr-3 text-blue-600" />
                  Report a Problem
                </Link>
              </div>
            </div>

            {/* User Logout Footer */}
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                  AD
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 leading-none">ADMINISTRATOR</p>
                  <p className="text-[10px] text-slate-500 leading-none mt-1">{user?.email || 'admin@civic.gov'}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-3 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 w-full">
        {/* Topbar Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-slate-200 bg-white shrink-0 z-30 w-full">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile/Tablet */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Mobile Logo Branding */}
            <Link to="/" className="lg:hidden flex items-center gap-1.5">
              <Radar className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-black tracking-tight text-slate-900">CivicNova AI</span>
            </Link>

            {/* Desktop Zone Badge */}
            <span className="hidden lg:inline text-xs font-bold text-slate-500 uppercase tracking-wider">
              Karachi Operational Zone
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* Desktop Search Bar */}
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reports, IDs..."
                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 text-slate-900 w-48 lg:w-60 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    navigate(`/dashboard?search=${encodeURIComponent(e.target.value.trim())}`);
                  }
                }}
              />
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="text-slate-600 hover:text-slate-900 transition-colors relative p-2 rounded-xl hover:bg-slate-100"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">Civic Signals</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length > 0 ? (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 items-start ${
                            item.isRead ? 'opacity-60' : 'bg-blue-50/40'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {item.type === 'NEW_REPORT' && <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></div>}
                            {item.type === 'CRITICAL' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                            {item.type === 'HOTSPOT' && <Zap className="w-4 h-4 text-amber-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-bold text-slate-900 truncate">{item.title}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">{item.timestamp}</span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2">{item.message}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-2 opacity-60" />
                        All clear — no pending unread report signals.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop User Dropdown */}
            <div className="relative hidden sm:block" ref={userRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  AD
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-bold text-slate-900 leading-none">ADMINISTRATOR</p>
                  <p className="text-[10px] text-slate-500 leading-none mt-0.5">Civic Operations</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">{user?.name || 'Administrator'}</p>
                    <p className="text-[11px] text-blue-700 font-semibold">{user?.role || 'Civic Operations Lead'}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user?.email || 'admin@civic.gov'}</p>
                  </div>

                  <div className="py-1 text-xs">
                    <Link
                      to="/dashboard"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2.5 text-blue-600" />
                      Civic Operations
                    </Link>
                    <Link
                      to="/analytics"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      <BarChart3 className="w-4 h-4 mr-2.5 text-blue-600" />
                      Analytics
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 pt-1 mt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 font-semibold text-left"
                    >
                      <LogOut className="w-4 h-4 mr-2.5 text-red-600" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-slate-50 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
