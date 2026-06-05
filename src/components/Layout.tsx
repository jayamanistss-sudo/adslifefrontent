import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Trophy, User, Store, Search, Moon, Sun, LogOut,
  PanelLeftClose, PanelLeftOpen, BarChart2, ShieldCheck, Zap, Settings,
  Users, Tag, Building2, Star, LayoutGrid, CreditCard, SlidersHorizontal
} from 'lucide-react';
import { useUserStore } from '../store/useUserStore';
import { useSiteSettings } from '../store/useSiteSettings';
import { useSavedStore } from '../store/useSavedStore';
import NotificationPanel from './NotificationPanel';

interface Props { readonly children: React.ReactNode }

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
}

export default function Layout({ children }: Props) {
  const { user, isAuthenticated, logout } = useUserStore();
  const { settings: site, fetch: fetchSite } = useSiteSettings();
  const { load: loadSaved } = useSavedStore();
  useEffect(() => { fetchSite(); }, []);
  useEffect(() => { if (isAuthenticated && user) loadSaved(user.id); }, [isAuthenticated, user?.id]);
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains('dark')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Toggle dark mode
  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + '/');

  const handleSearch = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/feed?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Nav sections
  const mainNav: NavItem[] = [
    { to: '/feed',        icon: Home,       label: 'Discover' },
    { to: '/leaderboard', icon: Trophy,      label: 'Leaderboard' },
    { to: '/profile',     icon: User,        label: 'Profile' },
  ];

  const vendorNav: NavItem[] = user?.role === 'vendor' || user?.role === 'admin' ? [
    { to: '/vendor/dashboard', icon: Store,    label: 'Dashboard' },
    { to: '/vendor/audience', icon: BarChart2, label: 'Analytics' },
  ] : [];

  const adminNav: NavItem[] = user?.role === 'admin' ? [
    { to: '/admin/dashboard',       icon: ShieldCheck, label: 'Admin Panel' },
    { to: '/admin/users',           icon: Users,        label: 'Users' },
    { to: '/admin/vendors',         icon: Building2,    label: 'Vendors' },
    { to: '/admin/all-offers',      icon: Tag,          label: 'All Offers' },
    { to: '/admin/spotlight',       icon: Star,         label: 'Spotlight' },
    { to: '/admin/categories',      icon: LayoutGrid,   label: 'Categories' },
    { to: '/admin/subscriptions',   icon: CreditCard,          label: 'Subscriptions' },
    { to: '/admin/site-settings',   icon: SlidersHorizontal,   label: 'Site Settings' },
    { to: '/admin/fraud',           icon: Zap,          label: 'Fraud Center' },
  ] : [];

  // Mobile bottom nav (flat list)
  const mobileNav = [...mainNav, ...(user?.role === 'vendor' || user?.role === 'admin'
    ? [{ to: '/vendor/dashboard', icon: Store, label: 'Dashboard' }] : [])];

  const NavSection = ({ items, title }: { items: NavItem[]; title?: string }) => (
    <>
      {title && items.length > 0 && (
        <div className={`section-label transition-all duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          {title}
        </div>
      )}
      {items.map(({ to, icon: Icon, label, badge }) => (
        <Link
          key={to}
          to={to}
          className={`nav-item ${isActive(to) ? 'active' : ''}`}
          title={!sidebarOpen ? label : undefined}
        >
          <Icon size={18} className="flex-shrink-0" />
          <span className={`transition-all duration-200 ${sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
            {label}
          </span>
          {badge && sidebarOpen && (
            <span className="ml-auto badge badge-primary text-[10px] px-1.5 py-0.5">{badge}</span>
          )}
        </Link>
      ))}
    </>
  );

  return (
    <div className={`min-h-screen flex bg-[var(--bg)] text-[var(--text)]`}>

      {/* ── Sidebar ── */}
      <aside
        style={{ width: sidebarOpen ? 'var(--sidebar-w)' : 'var(--sidebar-w-sm)' }}
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen z-50 bg-[var(--surface)] border-r border-[var(--border)] transition-all duration-250 ease-out overflow-hidden"
      >
        {/* Sidebar header */}
        <div className={`flex items-center h-[var(--navbar-h)] border-b border-[var(--border)] flex-shrink-0 ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'}`}>
          {sidebarOpen && (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF7420] to-[#B04200] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm overflow-hidden">
              {site.site_logo_url
                ? <img src={site.site_logo_url} alt={site.site_name} className="w-full h-full object-contain p-0.5" />
                : (site.site_name?.[0] ?? 'A')}
            </div>
          )}
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <div className="font-heading font-bold text-[var(--text)] text-[0.9375rem] leading-none whitespace-nowrap">{site.site_name || 'AdsLife'}</div>
              <div className="text-[0.625rem] text-[var(--text-muted)] leading-none mt-0.5 whitespace-nowrap">{site.site_tagline || 'Discover · Earn · Win'}</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
          <NavSection items={mainNav} />
          {vendorNav.length > 0 && <div className="divider" />}
          <NavSection items={vendorNav} title="Business" />
          {adminNav.length > 0 && <div className="divider" />}
          <NavSection items={adminNav} title="Admin" />
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-[var(--border)] p-2 flex flex-col gap-0.5 flex-shrink-0">
          <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`} title={!sidebarOpen ? 'Settings' : undefined}>
            <Settings size={18} className="flex-shrink-0" />
            <span className={`transition-all duration-200 ${sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>Settings</span>
          </Link>
          <button
            onClick={toggleDark}
            className="nav-item w-full text-left"
            title={!sidebarOpen ? (darkMode ? 'Light mode' : 'Dark mode') : undefined}
          >
            {darkMode
              ? <Sun size={18} className="flex-shrink-0" />
              : <Moon size={18} className="flex-shrink-0" />}
            <span className={`transition-all duration-200 ${sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
              {darkMode ? 'Light mode' : 'Dark mode'}
            </span>
          </button>
        </div>

      </aside>

      {/* ── Right side: navbar + content ── */}
      <div
        style={{ marginLeft: sidebarOpen ? 'var(--sidebar-w)' : 'var(--sidebar-w-sm)' }}
        className="hidden md:flex flex-col flex-1 transition-all duration-250 ease-out"
      >
        {/* ── Navbar ── */}
        <header className="sticky top-0 z-40 h-[var(--navbar-h)] bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--border)] flex items-center gap-3 px-5">

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              className="input pl-9 h-9 text-[0.8125rem] bg-[var(--surface-2)] border-transparent focus:border-[var(--primary)] focus:bg-[var(--surface)]"
              placeholder="Search offers, shops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <div className="flex items-center gap-1.5 ml-auto">
            {isAuthenticated ? (
              <>
                <NotificationPanel />

                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF7420] to-[#B04200] flex items-center justify-center text-white font-bold text-xs">
                      {user?.name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <div className="hidden lg:block text-left">
                      <div className="text-[0.8125rem] font-semibold text-[var(--text)] leading-none">{user?.name?.split(' ')[0]}</div>
                      <div className="text-[0.625rem] text-[var(--text-muted)] leading-none mt-0.5 capitalize">{user?.role}</div>
                    </div>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 card py-1 z-50 animate-scale-in">
                      <div className="px-4 py-3 border-b border-[var(--border)]">
                        <div className="font-semibold text-[var(--text)] text-sm">{user?.name}</div>
                        <div className="text-[0.75rem] text-[var(--text-muted)] truncate">{user?.email}</div>
                      </div>

                      <Link to="/profile" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors">
                        <User size={15} /> My Profile
                      </Link>

                      {(user?.role === 'vendor' || user?.role === 'admin') && (
                        <Link to="/vendor/dashboard" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors">
                          <Store size={15} /> Dashboard
                        </Link>
                      )}

                      {user?.role === 'admin' && (
                        <Link to="/admin/dashboard" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors">
                          <ShieldCheck size={15} /> Admin Panel
                        </Link>
                      )}

                      <Link to="/leaderboard" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors">
                        <Trophy size={15} /> Leaderboard
                      </Link>

                      <div className="border-t border-[var(--border)] mt-1 pt-1">
                        <button
                          onClick={() => { logout?.(); navigate('/login'); setProfileOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                        >
                          <LogOut size={15} /> Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm">
                <User size={14} /> Login
              </Link>
            )}
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 p-6 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ── Mobile layout ── */}
      <div className="md:hidden flex flex-col flex-1 min-h-screen">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 h-14 bg-[var(--surface)] border-b border-[var(--border)] flex items-center gap-3 px-4">
          <Link to="/feed" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF7420] to-[#B04200] flex items-center justify-center text-white font-bold text-xs overflow-hidden">
              {site.site_logo_url
                ? <img src={site.site_logo_url} alt={site.site_name} className="w-full h-full object-contain p-0.5" />
                : (site.site_name?.[0] ?? 'A')}
            </div>
            <span className="font-heading font-bold text-[var(--text)] text-sm leading-none">{site.site_name || 'AdsLife'}</span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              className="input pl-8 h-8 text-xs bg-[var(--surface-2)] border-transparent"
              placeholder="Search offers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <div className="flex items-center gap-1">
            {isAuthenticated && (
              <>
                <NotificationPanel />
              </>
            )}
          </div>
        </header>

        {/* Mobile content */}
        <main className="flex-1 pb-20 overflow-x-hidden overflow-y-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)] border-t border-[var(--border)] safe-area-pb">
          <div className="flex items-center justify-around h-16">
            {isAuthenticated ? (
              mobileNav.slice(0, 5).map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                    isActive(to) ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <Icon size={19} />
                  <span className="text-[9px] font-medium">{label}</span>
                </Link>
              ))
            ) : (
              <>
                <Link to="/feed" className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${isActive('/feed') ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                  <Home size={19} />
                  <span className="text-[9px] font-medium">Discover</span>
                </Link>
                <Link to="/login" className="flex flex-col items-center gap-0.5 px-5 py-2 bg-[var(--primary)] text-white rounded-xl mx-2">
                  <User size={19} />
                  <span className="text-[9px] font-semibold">Login</span>
                </Link>
                <Link to="/register" className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors text-[var(--text-muted)]`}>
                  <Zap size={19} />
                  <span className="text-[9px] font-medium">Sign Up</span>
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>

    </div>
  );
}
