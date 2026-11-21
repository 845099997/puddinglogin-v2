import { useCallback, useEffect, useMemo, useState } from 'react';
import { boot, get, setCsrf, type Site, type User } from './lib/api';
import { ToastProvider, useToast } from './lib/ui';
import AuthPage from './pages/AuthPage';
import DashboardLayout from './pages/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import AppsPage from './pages/AppsPage';
import AccountsPage from './pages/AccountsPage';
import LogsPage from './pages/LogsPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import AdminLoginPage from './pages/AdminLoginPage';
import TestPage from './pages/TestPage';
import TicketsPage from './pages/TicketsPage';

type Route = {
  name:
    | 'login'
    | 'register'
    | 'findpwd'
    | 'dashboard'
    | 'apps'
    | 'accounts'
    | 'logs'
    | 'tickets'
    | 'profile'
    | 'admin'
    | 'test'
    | 'admin-login';
};

function parseHash(): Route {
  const raw = (window.location.hash || '').replace(/^#\/?/, '');
  const clean = raw.split('?')[0];
  switch (clean) {
    case 'register':
      return { name: 'register' };
    case 'findpwd':
      return { name: 'findpwd' };
    case 'dashboard':
      return { name: 'dashboard' };
    case 'apps':
      return { name: 'apps' };
    case 'accounts':
      return { name: 'accounts' };
    case 'logs':
      return { name: 'logs' };
    case 'tickets':
      return { name: 'tickets' };
    case 'profile':
      return { name: 'profile' };
    case 'admin':
      return { name: 'admin' };
    case 'test':
      return { name: 'test' };
    case 'admin/login':
    case 'admin-login':
      return { name: 'admin-login' };
    default:
      return { name: 'login' };
  }
}

function hashQuery(): URLSearchParams {
  const raw = (window.location.hash || '').replace(/^#\/?/, '');
  const idx = raw.indexOf('?');
  return new URLSearchParams(idx >= 0 ? raw.slice(idx + 1) : '');
}

function nav(path: string) {
  window.location.hash = '/' + path.replace(/^\//, '');
}

function AppInner() {
  const toast = useToast();
  const [route, setRoute] = useState<Route>(parseHash);
  const [site, setSite] = useState<Site>(boot.site);
  const [user, setUser] = useState<User | null>(boot.user);
  const [ready, setReady] = useState<boolean>(Boolean(boot.site));
  const [query, setQuery] = useState<URLSearchParams>(hashQuery);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      setQuery(hashQuery());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    let alive = true;
    get<{ site: Site; csrf_token: string }>('site').then((res) => {
      if (!alive) return;
      if (res.code === 0 && res.data) {
        setSite(res.data.site);
        if (res.data.csrf_token) setCsrf(res.data.csrf_token);
      }
      setReady(true);
    });
    get<{ logged: boolean; user: User | null; csrf_token: string }>('me').then((res) => {
      if (!alive) return;
      if (res.code === 0 && res.data) {
        setUser(res.data.user);
        if (res.data.csrf_token) setCsrf(res.data.csrf_token);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (route.name === 'admin' || route.name === 'admin-login') {
      document.title = '管理后台 · ' + (site.sitename || 'PuddingLogin');
      return;
    }
    document.title = site.title || site.sitename || 'PuddingLogin';
  }, [site, route.name]);

  const isPrivate = ['dashboard', 'apps', 'accounts', 'logs', 'tickets', 'test', 'profile'].includes(route.name);
  const isAdminRoute = route.name === 'admin' || route.name === 'admin-login';

  const needLogin = isPrivate && route.name !== 'test';
  useEffect(() => {
    if (ready && needLogin && !user) {
      nav('login');
    }
  }, [ready, needLogin, user]);

  useEffect(() => {
    if (ready && user && !isPrivate && !isAdminRoute && route.name === 'login') {
      nav('dashboard');
    }
  }, [ready, user, isPrivate, isAdminRoute, route.name]);

  useEffect(() => {
    if (!ready) return;
    if (isAdminRoute && !user) {
      nav('admin-login');
      return;
    }
    if (route.name === 'admin' && user && !user.is_admin) {
      nav('admin-login');
      return;
    }
    if (route.name === 'admin-login' && user && user.is_admin) {
      nav('admin');
    }
  }, [ready, isAdminRoute, route.name, user]);

  const go = useCallback((path: string) => nav(path), []);

  const content = useMemo(() => {
    if (route.name === 'test' && !user) {
      return <TestPage site={site} onBack={() => nav('login')} />;
    }
    if (route.name === 'admin-login') {
      if (user && user.is_admin) {
        return (
          <div className='flex min-h-screen items-center justify-center'>
            <div className='h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-berry-500' />
          </div>
        );
      }
      return (
        <AdminLoginPage
          site={site}
          onSuccess={(u) => {
            setUser(u);
            nav('admin');
            toast.push('success', '管理员登录成功');
          }}
          onBack={() => nav('login')}
        />
      );
    }
    if (route.name === 'admin') {
      if (!user || !user.is_admin) {
        return (
          <div className='flex min-h-screen items-center justify-center'>
            <div className='h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-berry-500' />
          </div>
        );
      }
      return <AdminPage site={site} user={user} onGo={go} onUser={setUser} />;
    }
    if (isPrivate && !user) {
      return (
        <div className='flex min-h-screen items-center justify-center'>
          <div className='h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-berry-500' />
        </div>
      );
    }
    if (isPrivate && user) {
      const page = (() => {
        switch (route.name) {
          case 'apps':
            return <AppsPage site={site} />;
          case 'accounts':
            return <AccountsPage site={site} />;
          case 'logs':
            return <LogsPage />;
          case 'tickets':
            return <TicketsPage />;
          case 'test':
            return <TestPage site={site} embedded />;
          case 'profile':
            return <ProfilePage user={user} onUser={setUser} />;
          default:
            return <DashboardHome user={user} onGo={go} />;
        }
      })();
      return (
        <DashboardLayout site={site} user={user} current={route.name} onGo={go} onUser={setUser}>
          {page}
        </DashboardLayout>
      );
    }
    return (
      <AuthPage
        site={site}
        mode={route.name === 'register' ? 'register' : route.name === 'findpwd' ? 'findpwd' : 'login'}
        query={query}
        onMode={(m) => nav(m)}
        onSuccess={(u) => {
          setUser(u);
          nav('dashboard');
          toast.push('success', '欢迎回来，' + (u.nickname || u.username));
        }}
      />
    );
  }, [route.name, isPrivate, user, site, query, go, toast]);

  return <div className='min-h-screen bg-ink-900'>{content}</div>;
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
