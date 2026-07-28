import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchService, Branch } from '@/services/branchService';
import { useNavigate } from 'react-router-dom';
import { Building, Plus, Edit, Trash2 } from 'lucide-react';
import './BranchListPage.css';

export function BranchListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getAllBranches(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => branchService.deleteBranch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });

  return (
    <div className="branch-list-page">
      <div className="page-header">
        <h1><Building size={24} /> Branches</h1>
        <button className="btn-primary" onClick={() => navigate('/admin/branches/new')}>
          <Plus size={16} /> Add Branch
        </button>
      </div>
      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches?.data?.map((branch: Branch) => (
                <tr key={branch.id}>
                  <td>{branch.name}</td>
                  <td>{branch.address}</td>
                  <td>{branch.phone}</td>
                  <td>{branch.email}</td>
                  <td className="actions">
                    <button onClick={() => navigate(`/admin/branches/${branch.id}`)}><Edit size={16} /></button>
                    <button onClick={() => { if (confirm('Delete this branch?')) deleteMutation.mutate(branch.id); }}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
