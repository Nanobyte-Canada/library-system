import { useState, useEffect } from 'react';
import { User, Lock, Save } from 'lucide-react';
import { userService } from '../../services/userService';
import { useAuthStore } from '../../stores/authStore';
import type { UserResponse, UserUpdateRequest, PasswordChangeRequest } from '../../types';
import './ProfilePage.css';

export function ProfilePage() {
  const { user: _authUser } = useAuthStore();
  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<UserUpdateRequest>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });

  const [passwordData, setPasswordData] = useState<PasswordChangeRequest>({
    currentPassword: '',
    newPassword: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await userService.getProfile();
      if (response.success && response.data) {
        setProfile(response.data);
        setFormData({
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          phoneNumber: response.data.phoneNumber,
        });
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.firstName || !formData.lastName) {
      setError('First name and last name are required');
      return;
    }

    try {
      const response = await userService.updateProfile(formData);
      if (response.success) {
        setSuccess('Profile updated successfully');
        setEditing(false);
        loadProfile();
      } else {
        setError(response.message || 'Update failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setError('Both passwords are required');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    try {
      const response = await userService.changePassword(passwordData);
      if (response.success) {
        setSuccess('Password changed successfully');
        setShowPasswordForm(false);
        setPasswordData({ currentPassword: '', newPassword: '' });
      } else {
        setError(response.message || 'Password change failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password change failed');
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="error-state">Failed to load profile</div>;
  }

  return (
    <div className="profile-page">
      <h1 className="page-title">My Profile</h1>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <div className="profile-grid">
        <div className="profile-card">
          <div className="profile-header">
            <User size={24} />
            <h2>Personal Information</h2>
            {!editing && (
              <button className="btn-secondary" onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleProfileUpdate} className="profile-form">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={formData.firstName || ''}
                  onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={formData.lastName || ''}
                  onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phoneNumber || ''}
                  onChange={e => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info">
              <div className="info-row">
                <span className="info-label">Name:</span>
                <span>{profile.firstName} {profile.lastName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span>{profile.emailId}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Phone:</span>
                <span>{profile.phoneNumber || 'Not provided'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Membership ID:</span>
                <span>{profile.membershipId || 'Not assigned'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Role:</span>
                <span className={`role-badge role-${profile.role.toLowerCase()}`}>{profile.role}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Branch:</span>
                <span>{profile.branchName || 'Not assigned'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="profile-card">
          <div className="profile-header">
            <Lock size={24} />
            <h2>Password</h2>
            {!showPasswordForm && (
              <button className="btn-secondary" onClick={() => setShowPasswordForm(true)}>
                Change Password
              </button>
            )}
          </div>

          {showPasswordForm ? (
            <form onSubmit={handlePasswordChange} className="profile-form">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={e => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={e => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPasswordForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Lock size={16} />
                  Change Password
                </button>
              </div>
            </form>
          ) : (
            <p className="password-hint">Click "Change Password" to update your password.</p>
          )}
        </div>
      </div>
    </div>
  );
}
