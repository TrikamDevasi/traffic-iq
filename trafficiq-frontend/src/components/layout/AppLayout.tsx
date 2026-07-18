import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { 
  Activity, 
  Map as MapIcon, 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  LogOut, 
  Moon, 
  Sun,
  Menu,
  Bell,
  PlayCircle
} from 'lucide-react';
import { clsx } from 'clsx';

const AppLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: Activity, path: '/' },
    { name: 'Live Map', icon: MapIcon, path: '/map' },
    { name: 'Analytics', icon: BarChart3, path: '/analytics' },
    { name: 'Simulation', icon: PlayCircle, path: '/simulation' },
    { name: 'Alerts', icon: AlertTriangle, path: '/alerts' },
    { name: 'Notifications', icon: Bell, path: '/notifications' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: 'Admin Panel', icon: Settings, path: '/admin' });
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Sidebar */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-dark-panel border-r border-slate-200 dark:border-dark-border transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-dark-border">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-500 font-bold text-xl">
            <Activity className="h-6 w-6" />
            <span>TrafficIQ</span>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-dark-panel border-b border-slate-200 dark:border-dark-border flex items-center justify-between px-4 sm:px-6 z-40">
          <button 
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-md"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            
            <div className="flex items-center gap-3 border-l border-slate-200 dark:border-dark-border pl-4">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-semibold">{user?.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role}</div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AppLayout;
