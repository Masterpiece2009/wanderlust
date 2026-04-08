import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Map, Compass, Search, User, Settings, LogIn, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from './AuthProvider';
import { signInWithGoogle, logout } from '../firebase';

export function Layout() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col shadow-[4px_0_24px_rgb(0,0,0,0.02)] z-10">
        <div className="p-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-teal-600 flex items-center gap-2">
            <Compass className="w-7 h-7" />
            Wanderlust
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem to="/" icon={<Compass className="w-5 h-5" />} label="Discover" />
          <NavItem to="/search" icon={<Search className="w-5 h-5" />} label="Search" />
          <NavItem to="/roadmap" icon={<Map className="w-5 h-5" />} label="My Roadmap" />
          <NavItem to="/profile" icon={<Settings className="w-5 h-5" />} label="Travel Profile" />
        </nav>

        <div className="p-4 border-t border-slate-200/60">
          {user ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-slate-100/80 transition-colors">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 shadow-sm">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold text-slate-900 truncate">{user.displayName || 'User'}</span>
                  <span className="text-xs font-medium text-slate-500 truncate">{user.email}</span>
                </div>
              </div>
              <button 
                onClick={logout}
                className="flex items-center justify-center gap-2 w-full py-2 text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="flex items-center justify-center gap-2 w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl transition-colors shadow-sm"
            >
              <LogIn className="w-5 h-5" />
              Sign In with Google
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-7xl mx-auto p-8 lg:p-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200",
          isActive 
            ? "bg-teal-50 text-teal-700 shadow-sm" 
            : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900"
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
