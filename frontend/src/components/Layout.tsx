import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, BookMarked, ArrowLeftRight, User,
  Search, Bell, LogOut, BookCopy, Library, Users, Building, ScrollText
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import './Layout.css';

export function Layout() {
  const { user, logout } = useAuthStore();
  const avatarInitial = user?.firstName?.charAt(0) ?? '?';
  const isAdmin = user?.role === 'ADMIN';
  const isLibrarian = user?.role === 'LIBRARIAN';
  const canManageBooks = isAdmin || isLibrarian;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">📚</div>
          <span className="sidebar-logo-text">Library</span>
        </div>
        <nav className="sidebar-nav">
          {/* Main section */}
          <div className="sidebar-section-label">Main</div>
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={18} /><span>Dashboard</span>
          </NavLink>
          <NavLink to="/catalog" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
            <BookOpen size={18} /><span>Catalog</span>
          </NavLink>
          <NavLink to="/checkouts" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
            <BookMarked size={18} /><span>My Books</span>
          </NavLink>
          <NavLink to="/scan" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
            <ArrowLeftRight size={18} /><span>Checkout / Return</span>
          </NavLink>

          {/* Library Admin section (ADMIN + LIBRARIAN) */}
          {canManageBooks && (
            <>
              <div className="sidebar-section-label" style={{marginTop: 'var(--space-4)'}}>Library Admin</div>
              <NavLink to="/admin/books" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
                <BookCopy size={18} /><span>Books</span>
              </NavLink>
              <NavLink to="/admin/categories" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
                <Library size={18} /><span>Categories</span>
              </NavLink>
            </>
          )}

          {/* System Admin section (ADMIN only) */}
          {isAdmin && (
            <>
              <div className="sidebar-section-label" style={{marginTop: 'var(--space-4)'}}>System Admin</div>
              <NavLink to="/admin/users" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
                <Users size={18} /><span>Users</span>
              </NavLink>
              <NavLink to="/admin/branches" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
                <Building size={18} /><span>Branches</span>
              </NavLink>
              <NavLink to="/admin/audit-logs" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
                <ScrollText size={18} /><span>Audit Log</span>
              </NavLink>
              <NavLink to="/checkout-desk" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
                <ArrowLeftRight size={18} /><span>Checkout Desk</span>
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-avatar">{avatarInitial}</div>
          <span className="sidebar-user-name">{user?.firstName} {user?.lastName}</span>
          <button type="button" onClick={logout} className="sidebar-logout" aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="main-wrapper">
        {/* Mobile Header */}
        <div className="mobile-header">
          <div className="mobile-header-logo">📚</div>
          <span className="mobile-header-title">Library</span>
          <div className="mobile-header-actions">
            <button className="header-icon-btn" aria-label="Search"><Search size={20} /></button>
            <button className="header-icon-btn" aria-label="Notifications"><Bell size={20} /></button>
          </div>
        </div>

        {/* Desktop Header */}
        <header className="header">
          <div className="header-search">
            <Search size={16} /> Search books, authors...
          </div>
          <div className="header-actions">
            <button className="header-icon-btn" aria-label="Notifications"><Bell size={20} /></button>
          </div>
        </header>

        {/* Content */}
        <div className="content">
          <Outlet />
        </div>
      </div>

      {/* Bottom Tab Bar (mobile) */}
      <div className="bottom-tab-bar">
        <NavLink to="/dashboard" className={({ isActive }) => `bottom-tab${isActive ? ' active' : ''}`}>
          <LayoutDashboard />Home
        </NavLink>
        <NavLink to="/catalog" className={({ isActive }) => `bottom-tab${isActive ? ' active' : ''}`}>
          <BookOpen />Catalog
        </NavLink>
        <NavLink to="/checkouts" className={({ isActive }) => `bottom-tab${isActive ? ' active' : ''}`}>
          <BookMarked />My Books
        </NavLink>
        <NavLink to="/scan" className={({ isActive }) => `bottom-tab${isActive ? ' active' : ''}`}>
          <ArrowLeftRight />Checkout
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `bottom-tab${isActive ? ' active' : ''}`}>
          <User />Profile
        </NavLink>
      </div>
    </div>
  );
}
