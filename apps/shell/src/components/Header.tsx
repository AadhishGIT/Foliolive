import { NavLink, useNavigate } from 'react-router-dom';
import { Badge, Button, ThemeToggle } from '@foliolive/ui';
import { Activity, ShieldAlert, BellRing, Layers, Radio, LogOut, ChevronDown } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { setPortfolioId, logout, type RootState } from '../store';

const PORTFOLIOS = [
  { id: 'port_global_alpha_01', name: 'Global Alpha Flagship', aum: '$125.4M' },
  { id: 'port_macro_hedge_02', name: 'Macro Discretionary Hedge', aum: '$84.1M' },
  { id: 'port_tech_growth_03', name: 'Tech Growth Alpha', aum: '$42.8M' },
];

export function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { activePortfolioId, connectionStatus, user, isAuthenticated } = useSelector(
    (state: RootState) => state.app
  );

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setPortfolioId(e.target.value));
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-6 lg:gap-8">
          <NavLink to="/portfolio" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-500 transition-colors">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-slate-900 dark:text-white text-base">
                Foliolive
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-mono">
                Risk & P&L Platform
              </span>
            </div>
          </NavLink>

          {/* Navigation links */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              <NavLink
                to="/portfolio"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white font-semibold shadow-sm'
                      : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`
                }
              >
                <Layers className="w-3.5 h-3.5" />
                Holdings & P&L
              </NavLink>
              <NavLink
                to="/risk"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white font-semibold shadow-sm'
                      : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`
                }
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Risk Metrics & VaR
              </NavLink>
              <NavLink
                to="/alerts"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white font-semibold shadow-sm'
                      : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`
                }
              >
                <BellRing className="w-3.5 h-3.5" />
                Limits & Alerts
              </NavLink>
            </nav>
          )}
        </div>

        {/* Right side controls: Portfolio Selector, Live Indicator, Theme, User */}
        <div className="flex items-center gap-3 sm:gap-4">
          {isAuthenticated && (
            <div className="relative flex items-center">
              <label htmlFor="portfolio-select" className="sr-only">
                Select Active Portfolio
              </label>
              <select
                id="portfolio-select"
                value={activePortfolioId}
                onChange={handlePortfolioChange}
                className="appearance-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-900 dark:text-white text-xs font-mono font-medium rounded-md py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {PORTFOLIOS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.aum})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>
          )}

          {/* Real-time Connection Indicator */}
          {isAuthenticated && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
              title={`WebSocket status: ${connectionStatus}`}
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  connectionStatus === 'CONNECTED'
                    ? 'text-emerald-500 dark:text-emerald-400 animate-pulse'
                    : connectionStatus === 'CONNECTING' || connectionStatus === 'RECONNECTING'
                      ? 'text-amber-500 dark:text-amber-400 animate-pulse'
                      : 'text-slate-500 dark:text-slate-400'
                }`}
              />
              <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">
                {connectionStatus === 'CONNECTED'
                  ? 'LIVE FEED'
                  : connectionStatus === 'CONNECTING' || connectionStatus === 'RECONNECTING'
                    ? 'CONNECTING'
                    : 'OFFLINE'}
              </span>
            </div>
          )}

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* User Profile / Logout */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs text-slate-900 dark:text-white font-medium">
                  {user.fullName}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                  {user.role}
                </span>
              </div>
              <Badge
                variant={user.role === 'ROLE_PM' ? 'success' : 'default'}
                className="text-[10px]"
              >
                {user.role === 'ROLE_PM' ? 'PM' : 'VIEWER'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                aria-label="Sign out of Foliolive"
                className="text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-900 p-1.5"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <NavLink to="/login">
              <Button size="sm" variant="default">
                Sign In
              </Button>
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
