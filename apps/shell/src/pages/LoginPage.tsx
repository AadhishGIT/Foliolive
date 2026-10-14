import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../store';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Banner,
} from '@foliolive/ui';
import {
  Activity,
  ShieldCheck,
  UserCheck,
  Lock,
  User as UserIcon,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import type { User } from '@foliolive/shared-types';

export function LoginPage() {
  const [username, setUsername] = useState('pm_demo');
  const [password, setPassword] = useState('Password123!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/portfolio';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please provide both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const bffUrl = import.meta.env.VITE_BFF_HTTP_URL || 'http://localhost:4000';

    try {
      const response = await fetch(`${bffUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          dispatch(setUser({ user: json.data.user, token: json.data.token }));
          navigate(from, { replace: true });
          return;
        }
      }

      if (response.status === 401) {
        setErrorMessage('Invalid username or password. Check credentials.');
      } else {
        // Fallback for standalone/mock demonstration mode
        fallbackLocalLogin(username, password);
      }
    } catch {
      // If BFF server is offline during dev, use deterministic local credential fallback
      fallbackLocalLogin(username, password);
    } finally {
      setIsLoading(false);
    }
  };

  const fallbackLocalLogin = (uname: string, pass: string) => {
    if (uname === 'pm_demo' && pass === 'Password123!') {
      const demoPm: User = {
        id: 'usr_pm_01',
        username: 'pm_demo',
        email: 'pm_demo@foliolive.internal',
        fullName: 'Lead Portfolio Manager',
        role: 'ROLE_PM',
        createdAt: '2026-01-01T00:00:00Z',
      };
      dispatch(setUser({ user: demoPm, token: 'dev_token_pm' }));
      navigate(from, { replace: true });
    } else if (uname === 'viewer_demo' && pass === 'Password123!') {
      const demoViewer: User = {
        id: 'usr_viewer_01',
        username: 'viewer_demo',
        email: 'viewer_demo@foliolive.internal',
        fullName: 'Risk Viewer Analyst',
        role: 'ROLE_VIEWER',
        createdAt: '2026-01-01T00:00:00Z',
      };
      dispatch(setUser({ user: demoViewer, token: 'dev_token_viewer' }));
      navigate(from, { replace: true });
    } else {
      setErrorMessage('Invalid credentials. Use demo accounts below.');
    }
  };

  const handleQuickDemo = (uname: string) => {
    setUsername(uname);
    setPassword('Password123!');
    setErrorMessage(null);

    // Immediate login
    if (uname === 'pm_demo') {
      const demoPm: User = {
        id: 'usr_pm_01',
        username: 'pm_demo',
        email: 'pm_demo@foliolive.internal',
        fullName: 'Lead Portfolio Manager',
        role: 'ROLE_PM',
        createdAt: '2026-01-01T00:00:00Z',
      };
      dispatch(setUser({ user: demoPm, token: 'dev_token_pm' }));
      navigate(from, { replace: true });
    } else {
      const demoViewer: User = {
        id: 'usr_viewer_01',
        username: 'viewer_demo',
        email: 'viewer_demo@foliolive.internal',
        fullName: 'Risk Viewer Analyst',
        role: 'ROLE_VIEWER',
        createdAt: '2026-01-01T00:00:00Z',
      };
      dispatch(setUser({ user: demoViewer, token: 'dev_token_viewer' }));
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20 text-white mb-2">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Foliolive Analytics</h1>
          <p className="text-xs text-slate-400">
            Institutional Portfolio & Real-Time Risk Platform
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">
              Institutional Sign In
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Sign in with your portfolio management or risk analyst credentials.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMessage && (
              <div className="mb-4">
                <Banner variant="error" title="Authentication Error">
                  <div className="flex items-center gap-1.5 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                </Banner>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="username-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    id="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. pm_demo"
                    className="pl-9 bg-slate-950/80 border-slate-700 text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="password-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    id="password-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pl-9 bg-slate-950/80 border-slate-700 text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="default"
                className="w-full mt-2 font-medium"
                isLoading={isLoading}
              >
                Sign In <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2 border-t border-slate-800/80">
            <div className="text-[11px] text-slate-400 text-center uppercase tracking-wider font-semibold">
              Instant One-Click Demo Access
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-1.5 text-xs border-slate-700 hover:bg-slate-800"
                onClick={() => handleQuickDemo('pm_demo')}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-white">PM Demo</span>
                <Badge variant="success" className="text-[9px] px-1 py-0 ml-1">
                  Write
                </Badge>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-1.5 text-xs border-slate-700 hover:bg-slate-800"
                onClick={() => handleQuickDemo('viewer_demo')}
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-white">Viewer Demo</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">
                  Read
                </Badge>
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Security notice */}
        <p className="text-[11px] text-slate-400 text-center font-mono">
          Strict WCAG 2.2 AA • JWT Resource Guarded • Simulated Institutional Environment
        </p>
      </div>
    </div>
  );
}
