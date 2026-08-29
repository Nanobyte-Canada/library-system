import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellClickedEvent } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Plus } from 'lucide-react';
import { userService } from '../../services/userService';
import type { UserResponse } from '../../types';
import './UserListPage.css';

export function UserListPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const columnDefs: ColDef<UserResponse>[] = useMemo(() => [
    { headerName: 'Name', field: 'firstName', sortable: true, filter: true, flex: 1,
      valueFormatter: (params) => {
        const user = params.data;
        return user ? `${user.firstName} ${user.lastName}` : '';
      },
    },
    { headerName: 'Email', field: 'emailId', sortable: true, filter: true, flex: 1 },
    { headerName: 'Phone', field: 'phoneNumber', sortable: true, filter: true, flex: 1 },
    { headerName: 'Membership ID', field: 'membershipId', sortable: true, filter: true, flex: 1 },
    { headerName: 'Role', field: 'role', sortable: true, filter: true, flex: 1,
      cellRenderer: (params: { data: UserResponse }) => {
        const user = params.data;
        if (!user) return '';
        const colors: Record<string, string> = {
          ADMIN: '#ef4444',
          LIBRARIAN: '#f59e0b',
          MEMBER: '#22c55e',
        };
        return `<span style="background:${colors[user.role] || '#6b7280'};color:white;padding:2px 8px;border-radius:12px;font-size:12px">${user.role}</span>`;
      },
    },
    { headerName: 'Branch', field: 'branchName', sortable: true, filter: true, flex: 1 },
    { headerName: 'Status', field: 'isActive', sortable: true, flex: 1,
      cellRenderer: (params: { data: UserResponse }) => {
        const user = params.data;
        if (!user) return '';
        return user.isActive
          ? '<span style="color:#22c55e">Active</span>'
          : '<span style="color:#ef4444">Inactive</span>';
      },
    },
  ], []);

  const onCellClicked = useCallback((event: CellClickedEvent<UserResponse>) => {
    if (event.data) {
      navigate(`/admin/users/${event.data.id}`);
    }
  }, [navigate]);

  useEffect(() => {
    loadUsers();
  }, [currentPage]);

  const loadUsers = async () => {
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
  };

  return (
    <div className="user-list-page">
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <button
          className="btn-primary"
          onClick={() => navigate('/admin/users/new')}
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
        <AgGridReact
          rowData={users}
          columnDefs={columnDefs}
          modules={[AllCommunityModule]}
          pagination={true}
          paginationPageSize={20}
          onCellClicked={onCellClicked}
          loading={loading}
          overlayNoRowsTemplate="No users found"
        />
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-secondary"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
