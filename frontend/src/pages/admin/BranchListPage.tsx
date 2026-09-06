import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchService, Branch } from '@/services/branchService';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, MapPin, Phone, Mail } from 'lucide-react';
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
    <div className="admin-branches-page">
      <div className="admin-page-header">
        <h1>Branches</h1>
        <button className="btn btn-primary" onClick={() => navigate('/admin/branches/new')}>
          <Plus size={16} /> Add Branch
        </button>
      </div>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>Loading...</div>
      ) : (
        <div className="branch-grid">
          {branches?.data?.map((branch: Branch) => (
            <div className="branch-card" key={branch.id}>
              <div className="branch-card-name">{branch.name}</div>
              {branch.address && (
                <div className="branch-card-detail">
                  <MapPin size={14} /> {branch.address}
                </div>
              )}
              {branch.phone && (
                <div className="branch-card-detail">
                  <Phone size={14} /> {branch.phone}
                </div>
              )}
              {branch.email && (
                <div className="branch-card-detail">
                  <Mail size={14} /> {branch.email}
                </div>
              )}
              <div className="branch-card-actions">
                <button className="btn btn-outline btn-sm" onClick={() => navigate(`/admin/branches/${branch.id}`)}>
                  <Edit size={14} /> Edit
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { if (confirm('Delete this branch?')) deleteMutation.mutate(branch.id); }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
