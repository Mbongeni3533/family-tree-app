import React, { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Users, TreePine, BarChart3, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Family Tree', href: '/family-tree', icon: TreePine },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <div className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-blue-600">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              state={{ from: location }}
              className={`${
                location.pathname === item.href
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              } block px-3 py-2 rounded-md text-base font-medium`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="flex items-center">
                <item.icon className="inline-flex items-center mr-2 h-5 w-5" />
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-blue-600">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center h-16 px-4 bg-blue-700">
            <h1 className="text-white text-xl font-bold">Family Tree</h1>
          </div>
          <nav className="flex-1 px-2 py-2 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                state={{ from: location }}
                className={`${
                  location.pathname === item.href
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                } group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="px-4 py-4 bg-blue-700">
            <div className="text-xs text-blue-200 mb-2">Signed in as</div>
            <div className="text-white font-medium">{user?.name || user?.email}</div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Mobile header */}
        <div className="md:hidden bg-white shadow">
          <nav className="flex items-center justify-between px-4 py-2">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Family Tree</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <Home className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/family-tree')}
                className="text-gray-600 hover:text-gray-900"
              >
                <TreePine className="h-5 w-5" />
              </button>
            </div>
          </nav>
        </div>

        {/* Page content */}
        <main className="flex-1 bg-gray-50">
          {children}
        </main>

        {/* Mobile footer */}
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Signed in as: {user?.name || user?.email}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop footer */}
      <div className="hidden md:fixed md:bottom-0 md:w-full md:flex md:items-center md:justify-between md:bg-white md:shadow-md md:px-4 md:py-2">
        <div className="text-sm text-gray-600">
          Signed in as: {user?.name || user?.email}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};