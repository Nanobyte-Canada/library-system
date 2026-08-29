import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { userService } from '../../services/userService';
import { branchService } from '../../services/branchService';
import type { UserCreateRequest, UserUpdateRequest, Branch, UserRole, MembershipType } from '../../types';
import './UserFormPage.css';

export function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<UserCreateRequest>({
    membershipId: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    emailId: '',
    role: 'MEMBER' as UserRole,
    membershipType: 'PUBLIC' as MembershipType,
    branchId: null,
    password: '',
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBranches();
    if (isEdit && id) {
      loadUser(id);
    }
  }, [id, isEdit]);

  const loadBranches = async () => {
    try {
      const response = await branchService.getAllBranches();
      if (response.success) {
        setBranches(response.data);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const loadUser = async (userId: string) => {
    setLoading(true);
    try {
      const response = await userService.getUser(userId);
      if (response.success && response.data) {
        const user = response.data;
        setFormData({
          membershipId: user.membershipId,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          emailId: user.emailId,
          role: user.role,
          membershipType: user.membershipType,
          branchId: user.branchId,
          password: '',
        });
      }
    } catch (err) {
      setError('Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.firstName || !formData.lastName || !formData.emailId) {
      setError('First name, last name, and email are required');
      return;
    }

    if (!isEdit && !formData.password) {
      setError('Password is required for new users');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && id) {
        const updateData: UserUpdateRequest = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          emailId: formData.emailId,
          role: formData.role,
          membershipType: formData.membershipType,
          branchId: formData.branchId ?? undefined,
        };
        await userService.updateUser(id, updateData);
        setSuccess('User updated successfully');
      } else {
        await userService.createUser(formData);
        setSuccess('User created successfully');
        setTimeout(() => navigate('/admin/users'), 1000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="user-form-page">
      <div className="page-header">
        <button className="btn-secondary" onClick={() => navigate('/admin/users')}>
          <ArrowLeft size={16} />
          Back to Users
        </button>
        <h1 className="page-title">{isEdit ? 'Edit User' : 'Add New User'}</h1>
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <form onSubmit={handleSubmit} className="user-form">
        <div className="form-section">
          <h2>Personal Information</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="emailId">Email *</label>
              <input
                type="email"
                id="emailId"
                name="emailId"
                value={formData.emailId}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="phoneNumber">Phone</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="membershipId">Membership ID</label>
              <input
                type="text"
                id="membershipId"
                name="membershipId"
                value={formData.membershipId}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="membershipType">Membership Type</label>
              <select
                id="membershipType"
                name="membershipType"
                value={formData.membershipType}
                onChange={handleChange}
              >
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
                <option value="PUBLIC">Public</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Account Details</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="role">Role *</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="MEMBER">Member</option>
                <option value="LIBRARIAN">Librarian</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="branchId">Branch</label>
              <select
                id="branchId"
                name="branchId"
                value={formData.branchId || ''}
                onChange={handleChange}
              >
                <option value="">No branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          </div>

          {!isEdit && (
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/admin/users')}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            <Save size={16} />
            {loading ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
}
