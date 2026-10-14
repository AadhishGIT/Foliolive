import { NavLink } from 'react-router-dom';
import { Badge } from '@foliolive/ui';
import { Activity, ShieldAlert, BellRing, Layers, Radio } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export function Header() {
  const { activePortfolioId, connectionStatus, user } = useSelector(
    (state: RootState) => state.app
  );

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-base">Foliolive</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">
                Risk & P&L Platform
              </span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`
              }
            >
              <Layers className="w-3.5 h-3.5" />
              Holdings & P&L
            </NavLink>
            <NavLink
              to="/risk"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`
              }
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Risk Metrics & VaR
            </NavLink>
            <NavLink
              to="/alerts"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`
              }
            >
              <BellRing className="w-3.5 h-3.5" />
              Limits & Alerts
            </NavLink>
          </nav>
        </div>

        {/* Right side status indicators */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span>Portfolio:</span>
            <span className="font-mono text-slate-200 font-semibold">{activePortfolioId}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <Radio
              className={`w-3.5 h-3.5 ${
                connectionStatus === 'CONNECTED'
                  ? 'text-emerald-400 animate-pulse'
                  : 'text-amber-400'
              }`}
            />
            <span className="font-mono text-[11px] text-slate-300">
              {connectionStatus === 'CONNECTED' ? 'LIVE FEED' : 'CONNECTING...'}
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <span className="text-xs text-slate-300 font-medium">{user.fullName}</span>
              <Badge variant="outline" className="text-[10px]">
                {user.role}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
