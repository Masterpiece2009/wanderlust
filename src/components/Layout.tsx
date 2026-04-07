import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Map, Compass, Search, User } from 'lucide-react';
import { cn } from '../lib/utils';

export function Layout() {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-teal-600 flex items-center gap-2">
            <Compass className="w-6 h-6" />
            Wanderlust
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <NavItem to="/" icon={<Compass className="w-5 h-5" />} label="Discover" />
          <NavItem to="/search" icon={<Search className="w-5 h-5" />} label="Search" />
          <NavItem to="/roadmap" icon={<Map className="w-5 h-5" />} label="My Roadmap" />
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
              <User className="w-4 h-4" />
            </div>
            <div className="text-sm font-medium">Demo User</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
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
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          isActive 
            ? "bg-teal-50 text-teal-700" 
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
