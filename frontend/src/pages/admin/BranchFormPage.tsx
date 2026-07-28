import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { branchService, BranchCreateRequest } from '@/services/branchService';
import { Save, ArrowLeft } from 'lucide-react';
import './BranchFormPage.css';

export function BranchFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState<BranchCreateRequest>({ name: '', address: '', phone: '', email: '' });

  const { data: existing } = useQuery({
    queryKey: ['branch', id],
    queryFn: () => branchService.getBranch(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing?.data) {
      setForm({ name: existing.data.name, address: existing.data.address, phone: existing.data.phone, email: existing.data.email });
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: () => isEdit ? branchService.updateBranch(id!, form) : branchService.createBranch(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      navigate('/admin/branches');
    },
  });

  return (
    <div className="branch-form-page">
      <div className="page-header">
        <h1>{isEdit ? 'Edit Branch' : 'New Branch'}</h1>
        <button className="btn-secondary" onClick={() => navigate('/admin/branches')}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>
      <div className="form-card">
        <div className="form-group">
          <label>Name</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Address</label>
          <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <button className="btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
          <Save size={16} /> {mutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
