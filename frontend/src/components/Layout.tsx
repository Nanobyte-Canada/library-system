import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { BookOpen, Users, User, LayoutDashboard, ArrowLeftRight, LogOut, Bell, Menu, X, ScanLine, Building, Shield, Calendar } from 'lucide-react';
import { useState } from 'react';

export function Layout() {
  const { user, logout, hasRole } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = hasRole('ADMIN');
  const isLibrarian = hasRole('LIBRARIAN');
  const isStaff = isAdmin || isLibrarian;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>📚 Library System</h2>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/admin/books" className={({ isActive }) => isActive ? 'active' : ''}>
                <BookOpen size={18} />
                Books
              </NavLink>
              <NavLink to="/admin/categories" className={({ isActive }) => isActive ? 'active' : ''}>
                <BookOpen size={18} />
                Categories
              </NavLink>
            </>
          )}
          <NavLink to="/catalog" className={({ isActive }) => isActive ? 'active' : ''}>
            <BookOpen size={18} />
            Catalog
          </NavLink>
          {!isStaff && (
            <NavLink to="/reservations" className={({ isActive }) => isActive ? 'active' : ''}>
              <Calendar size={18} />
              Reservations
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'active' : ''}>
              <Users size={18} />
              Users
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin/branches" className={({ isActive }) => isActive ? 'active' : ''}>
              <Building size={18} />
              Branches
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin/audit-logs" className={({ isActive }) => isActive ? 'active' : ''}>
              <Shield size={18} />
              Audit Log
            </NavLink>
          )}
          <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
            <User size={18} />
            Profile
          </NavLink>
          {isStaff ? (
            <NavLink to="/checkout-desk" className={({ isActive }) => isActive ? 'active' : ''}>
              <ArrowLeftRight size={18} />
              Checkout Desk
            </NavLink>
          ) : (
            <NavLink to="/checkouts" className={({ isActive }) => isActive ? 'active' : ''}>
              <ArrowLeftRight size={18} />
              My Books
            </NavLink>
          )}
          <NavLink to="/scan" className={({ isActive }) => isActive ? 'active' : ''}>
            <ScanLine size={18} />
            QR Scanner
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ opacity: 0.7 }}>{user?.role}</div>
          </div>
          <button className="btn-secondary" onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none' }}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          <div className="header-right">
            <Bell size={20} style={{ cursor: 'pointer' }} />
            <span style={{ fontSize: 14 }}>{user?.firstName}</span>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
