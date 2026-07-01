import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Trophy, User, Store, Search, Moon, Sun, LogOut,
  PanelLeftClose, PanelLeftOpen, BarChart2, ShieldCheck, Zap, Settings,
  Users, Tag, Building2, Star, LayoutGrid, CreditCard, SlidersHorizontal, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../store/useUserStore';
import { useSiteSettings } from '../store/useSiteSettings';
import { useSavedStore } from '../store/useSavedStore';
import NotificationPanel from './NotificationPanel';
import AnimatedBackground from './AnimatedBackground';
import { api, endpoints } from '../utils/api';
import { haptic } from '../utils/haptics';

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

  useEffect(() => {
    const stored = localStorage.getItem('adslife-theme');
    const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = stored === 'dark' || (!stored && prefersDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
    setDarkMode(shouldBeDark);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const mobileMainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = mobileMainRef.current;
    if (!el) return;
    const handleScroll = () => {
      const y = el.scrollTop;
      const delta = y - lastScrollY.current;
      if (y < 8) setHeaderHidden(false);
      else if (delta > 6) setHeaderHidden(true);
      else if (delta < -6) setHeaderHidden(false);
      lastScrollY.current = y;
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('adslife-theme', next ? 'dark' : 'light');
  };

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

  const mainNav: NavItem[] = [
    { to: '/feed',        icon: Home,       label: 'Discover' },
    { to: '/leaderboard', icon: Trophy,      label: 'Leaderboard' },
    { to: '/profile',     icon: User,        label: 'Profile' },
  ];

  const vendorNav: NavItem[] = user?.role === 'vendor' || user?.role === 'admin' ? [
    { to: '/vendor/dashboard', icon: Store,    label: 'Dashboard' },
    { to: '/vendor/audience',  icon: BarChart2, label: 'Analytics' },
  ] : [];

  const adminNav: NavItem[] = user?.role === 'admin' ? [
    { to: '/admin/dashboard',       icon: ShieldCheck,       label: 'Admin Panel' },
    { to: '/admin/users',           icon: Users,              label: 'Users' },
    { to: '/admin/vendors',         icon: Building2,          label: 'Vendors' },
    { to: '/admin/all-offers',      icon: Tag,                label: 'All Offers' },
    { to: '/admin/spotlight',       icon: Star,               label: 'Spotlight' },
    { to: '/admin/categories',      icon: LayoutGrid,         label: 'Categories' },
    { to: '/admin/subscriptions',   icon: CreditCard,         label: 'Subscriptions' },
    { to: '/admin/site-settings',   icon: SlidersHorizontal,  label: 'Site Settings' },
    { to: '/admin/fraud',           icon: Zap,                label: 'Fraud Center' },
  ] : [];

  const mobileNav = [
    ...mainNav,
    ...(user?.role === 'vendor' || user?.role === 'admin'
      ? [{ to: '/vendor/dashboard', icon: Store, label: 'Dashboard' }] : []),
    ...(user?.role === 'admin'
      ? [{ to: '/admin/dashboard', icon: ShieldCheck, label: 'Admin' }] : []),
  ];

  const NavSection = ({ items, title }: { items: NavItem[]; title?: string }) => (
    <>
      {title && items.length > 0 && (
        <div className={`section-label mt-1 transition-all duration-200 ${sidebarOpen ? 'opacity-100 max-h-6' : 'opacity-0 max-h-0 overflow-hidden'}`}>
          {title}
        </div>
      )}
      {items.map(({ to, icon: Icon, label, badge }) => {
        const active = isActive(to);
        return (
          <Link
            key={to}
            to={to}
            className={`nav-item ${active ? 'active' : ''}`}
            title={!sidebarOpen ? label : undefined}
          >
            <motion.div
              className="flex-shrink-0"
              animate={active ? { scale: [1, 1.15, 1.05] } : { scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Icon size={17} />
            </motion.div>
            <span className={`transition-all duration-200 flex-1 min-w-0 ${sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
              {label}
            </span>
            {badge && sidebarOpen && (
              <span className="ml-auto badge badge-primary text-[10px] px-1.5 py-0.5">{badge}</span>
            )}
            {active && sidebarOpen && (
              <ChevronRight size={13} className="flex-shrink-0 opacity-60" />
            )}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--text)] relative">
      <AnimatedBackground />

      {/* ── Sidebar ── */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen z-50 border-r border-[var(--border)] transition-all duration-250 ease-out overflow-hidden"
        style={{
          width: sidebarOpen ? 'var(--sidebar-w)' : 'var(--sidebar-w-sm)',
          background: 'color-mix(in srgb, var(--surface) 95%, transparent)',
          backdropFilter: 'blur(20px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
          boxShadow: 'var(--shadow-nav)',
        }}
      >
        {/* Sidebar header / brand */}
        <div
          className={`flex items-center h-[var(--navbar-h)] border-b border-[var(--border)] flex-shrink-0 transition-all duration-250 ${sidebarOpen ? 'px-4 gap-3' : 'justify-center px-2'}`}
        >
          {sidebarOpen ? (
            <>
              <div className="brand-mark brand-mark-md brand-mark-glow">
                {site.site_logo_url
                  ? <img src={site.site_logo_url} alt={site.site_name} className="w-full h-full object-contain p-0.5" />
                  : (site.site_name?.[0] ?? 'A')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="sidebar-site-name truncate">{site.site_name || 'AdsLife'}</div>
                <div className="sidebar-site-tagline uppercase tracking-wider">{site.site_tagline || 'Discover · Earn · Win'}</div>
              </div>
            </>
          ) : (
            <div className="brand-mark brand-mark-sm brand-mark-glow">
              {site.site_logo_url
                ? <img src={site.site_logo_url} alt={site.site_name} className="w-full h-full object-contain p-0.5" />
                : (site.site_name?.[0] ?? 'A')}
            </div>
          )}

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all duration-150"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto py-3 flex flex-col gap-1 ${sidebarOpen ? 'px-3' : 'px-2 items-center'}`}>
          <NavSection items={mainNav} />
          {vendorNav.length > 0 && <div className="divider" />}
          <NavSection items={vendorNav} title="Business" />
          {adminNav.length > 0 && <div className="divider" />}
          <NavSection items={adminNav} title="Admin" />
        </nav>

        {/* Sidebar footer */}
        <div className={`border-t border-[var(--border)] py-2 flex flex-col gap-1 flex-shrink-0 ${sidebarOpen ? 'px-3' : 'px-2 items-center'}`}>
          <Link
            to="/profile"
            className={`nav-item ${isActive('/profile') ? 'active' : ''}`}
            title={!sidebarOpen ? 'Settings' : undefined}
          >
            <Settings size={17} className="flex-shrink-0" />
            <span className={`transition-all duration-200 ${sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>Settings</span>
          </Link>
          <button
            onClick={toggleDark}
            className="nav-item w-full text-left"
            title={!sidebarOpen ? (darkMode ? 'Light mode' : 'Dark mode') : undefined}
          >
            {darkMode
              ? <Sun size={17} className="flex-shrink-0" />
              : <Moon size={17} className="flex-shrink-0" />}
            <span className={`transition-all duration-200 ${sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
              {darkMode ? 'Light mode' : 'Dark mode'}
            </span>
          </button>
        </div>
      </aside>

      {/* ── Desktop: navbar + content ── */}
      <div
        style={{ marginLeft: sidebarOpen ? 'var(--sidebar-w)' : 'var(--sidebar-w-sm)' }}
        className="hidden md:flex flex-col flex-1 min-w-0 transition-all duration-250 ease-out relative z-10"
      >
        {/* ── Desktop Navbar ── */}
        <header
          className="sticky top-0 z-40 h-[var(--navbar-h)] flex items-center gap-3 px-5 border-b border-[var(--border)]"
          style={{
            background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
            backdropFilter: 'blur(20px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
            boxShadow: 'var(--shadow-nav)',
          }}
        >
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              className="w-full h-10 pl-9 pr-4 rounded-full text-[0.8125rem] text-[var(--text)] placeholder-[var(--text-muted)] outline-none transition-all duration-200"
              style={{
                background: 'var(--surface-2)',
                border: '1.5px solid var(--border)',
              }}
              onFocus={e => {
                (e.target as HTMLInputElement).style.background = 'var(--surface)';
                (e.target as HTMLInputElement).style.borderColor = 'var(--primary)';
                (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px var(--primary-muted)';
              }}
              onBlur={e => {
                (e.target as HTMLInputElement).style.background = 'var(--surface-2)';
                (e.target as HTMLInputElement).style.borderColor = 'var(--border)';
                (e.target as HTMLInputElement).style.boxShadow = 'none';
              }}
              placeholder="Search offers, shops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <div className="flex items-center gap-2 ml-auto">
            {isAuthenticated ? (
              <>
                <NotificationPanel />

                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-150 hover:bg-[var(--surface-2)]"
                  >
                    <div className="brand-mark brand-mark-sm">
                      {user?.avatarUrl
                        ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                        : user?.name?.[0]?.toUpperCase() ?? 'U'
                      }
                    </div>
                    <div className="hidden lg:block text-left">
                      <div className="text-[0.8125rem] font-semibold text-[var(--text)] leading-none font-heading">{user?.name?.split(' ')[0]}</div>
                      <div className="text-[0.625rem] text-[var(--text-muted)] leading-none mt-0.5 capitalize">{user?.role}</div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                        className="absolute right-0 top-full mt-2 w-52 z-50 overflow-hidden"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-xl)',
                          boxShadow: 'var(--shadow-xl)',
                        }}
                      >
                        <div className="px-4 py-3 border-b border-[var(--border)]">
                          <div className="font-heading font-bold text-[var(--text)] text-sm">{user?.name}</div>
                          <div className="text-[0.75rem] text-[var(--text-muted)] truncate">{user?.email}</div>
                        </div>

                        {[
                          { to: '/profile',           icon: User,        label: 'My Profile' },
                          ...(user?.role === 'vendor' || user?.role === 'admin'
                            ? [{ to: '/vendor/dashboard', icon: Store,    label: 'Dashboard' }] : []),
                          ...(user?.role === 'admin'
                            ? [{ to: '/admin/dashboard', icon: ShieldCheck, label: 'Admin Panel' }] : []),
                          { to: '/leaderboard',       icon: Trophy,      label: 'Leaderboard' },
                        ].map(({ to, icon: Icon, label }) => (
                          <Link
                            key={to}
                            to={to}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
                          >
                            <Icon size={14} className="flex-shrink-0" /> {label}
                          </Link>
                        ))}

                        <div className="border-t border-[var(--border)] mt-1 pt-1">
                          <button
                            onClick={async () => {
                              try { await api.post(endpoints.logout); } catch {}
                              logout?.();
                              navigate('/login');
                              setProfileOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                            style={{ color: 'var(--danger)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-light)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <LogOut size={14} className="flex-shrink-0" /> Sign out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm gap-1.5">
                <User size={14} /> Login
              </Link>
            )}
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 py-3 md:py-4 px-3 overflow-x-hidden overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              className="page-shell"
              initial={{ opacity: 0, y: 16, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Mobile layout ── */}
      <div className="md:hidden flex flex-col flex-1 min-w-0 min-h-screen relative z-10">
        {/* Mobile header */}
        <motion.header
          animate={{ y: headerHidden ? '-100%' : 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] as const }}
          className="fixed top-0 left-0 right-0 z-40 mobile-nav-glass border-b"
          style={{ height: 'calc(3.5rem + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="flex items-center gap-3 px-4 h-14">
            <Link to="/feed" className="flex items-center gap-2 flex-shrink-0">
              <div className="brand-mark brand-mark-sm brand-mark-glow">
                {site.site_logo_url
                  ? <img src={site.site_logo_url} alt={site.site_name} className="w-full h-full object-contain p-0.5" />
                  : (site.site_name?.[0] ?? 'A')}
              </div>
              <span className="font-heading font-bold text-[var(--text)] text-[0.9375rem] leading-none tracking-tight">{site.site_name || 'AdsLife'}</span>
            </Link>

            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                className="w-full h-8 pl-8 pr-3 rounded-full text-xs text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
                style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}
                placeholder="Search offers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            <div className="flex items-center gap-1 flex-shrink-0">
              {isAuthenticated && <NotificationPanel />}
            </div>
          </div>
        </motion.header>

        {/* Mobile content */}
        <main
          ref={mobileMainRef}
          className="flex-1 overflow-x-hidden overflow-y-auto"
          style={{
            paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))',
            paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 mobile-nav-glass border-t safe-area-pb"
        >
          <div className="flex items-center justify-around h-[64px] px-2">
            {isAuthenticated ? (
              mobileNav.slice(0, 5).map(({ to, icon: Icon, label }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => haptic('light')}
                    className="relative flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] py-1 transition-colors"
                    style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}
                  >
                    {active && (
                      <motion.span
                        layoutId="mobileNavPill"
                        className="absolute top-0.5 left-1/2 -translate-x-1/2 h-[3px] rounded-full"
                        style={{ background: 'var(--primary)', width: '1.5rem' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <motion.div
                      className="p-1.5 rounded-xl transition-colors"
                      style={{ background: active ? 'var(--primary-light)' : 'transparent' }}
                      animate={active ? { scale: [1, 1.15, 1.05] } : { scale: 1 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                      <Icon size={18} />
                    </motion.div>
                    <span className="text-[9px] font-semibold font-heading tracking-tight">{label}</span>
                  </Link>
                );
              })
            ) : (
              <>
                <Link
                  to="/feed"
                  onClick={() => haptic('light')}
                  className="relative flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] py-1 transition-colors"
                  style={{ color: isActive('/feed') ? 'var(--primary)' : 'var(--text-muted)' }}
                >
                  {isActive('/feed') && (
                    <span
                      className="absolute top-0.5 left-1/2 -translate-x-1/2 h-[3px] rounded-full"
                      style={{ background: 'var(--primary)', width: '1.5rem' }}
                    />
                  )}
                  <div className="p-1.5 rounded-xl" style={{ background: isActive('/feed') ? 'var(--primary-light)' : 'transparent' }}>
                    <Home size={18} />
                  </div>
                  <span className="text-[9px] font-semibold font-heading tracking-tight">Discover</span>
                </Link>

                <Link
                  to="/login"
                  onClick={() => haptic('medium')}
                  className="flex flex-col items-center justify-center gap-0.5 px-5 py-2 text-white rounded-2xl mx-1 flex-shrink-0"
                  style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-primary)' }}
                >
                  <User size={18} />
                  <span className="text-[9px] font-bold font-heading">Login</span>
                </Link>

                <Link
                  to="/register"
                  onClick={() => haptic('light')}
                  className="relative flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] py-1 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <div className="p-1.5 rounded-xl">
                    <Zap size={18} />
                  </div>
                  <span className="text-[9px] font-semibold font-heading tracking-tight">Sign Up</span>
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
