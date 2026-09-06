import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Search } from 'lucide-react';
import { userService } from '../../services/userService';
import type { UserResponse, UserRole } from '../../types';
import './UserListPage.css';

export function UserListPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userService.listUsers(currentPage, 20);
      if (response.success) {
        setUsers(response.data);
        setTotalPages(response.totalPages);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (roleFilter) {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          u.emailId.toLowerCase().includes(q) ||
          u.phoneNumber.includes(q) ||
          (u.membershipId && u.membershipId.toLowerCase().includes(q))
      );
    }
    return result;
  }, [users, searchQuery, roleFilter]);

  const roleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'role-badge admin';
      case 'LIBRARIAN': return 'role-badge librarian';
      default: return 'role-badge member';
    }
  };

  return (
    <div className="admin-users-page">
      <div className="admin-page-header">
        <h1>Users</h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/admin/users/new')}
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      <div className="search-filter-bar">
        <input
          type="text"
          placeholder="Search by name, email, phone, or membership ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="LIBRARIAN">Librarian</option>
          <option value="MEMBER">Member</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}>
          <div className="spinner" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="empty-state">
          <Search size={48} />
          <p>{searchQuery || roleFilter ? 'No users match your filters.' : 'No users found.'}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <table className="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Membership ID</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong style={{ cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => navigate(`/admin/users/${user.id}`)}>
                      {user.firstName} {user.lastName}
                    </strong>
                  </td>
                  <td>{user.emailId}</td>
                  <td>{user.phoneNumber}</td>
                  <td>{user.membershipId || '—'}</td>
                  <td><span className={roleBadgeClass(user.role)}>{user.role}</span></td>
                  <td>{user.branchName || '—'}</td>
                  <td>
                    <span className={user.isActive ? 'status-badge active' : 'status-badge inactive'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="user-table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/users/${user.id}`)} title="Edit">
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile card layout */}
          <div className="user-cards">
            {filteredUsers.map((user) => (
              <div className="user-card-item" key={user.id}>
                <div className="user-card-header">
                  <span className="user-card-name" onClick={() => navigate(`/admin/users/${user.id}`)}>
                    {user.firstName} {user.lastName}
                  </span>
                  <span className={user.isActive ? 'status-badge active' : 'status-badge inactive'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="user-card-meta">
                  <span>{user.emailId}</span>
                  <span>{user.phoneNumber}</span>
                  {user.membershipId && <span>ID: {user.membershipId}</span>}
                  <span className={roleBadgeClass(user.role)} style={{ alignSelf: 'flex-start' }}>{user.role}</span>
                </div>
                <div className="user-card-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/users/${user.id}`)} title="Edit">
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
