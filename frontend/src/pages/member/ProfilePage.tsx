import { useState, useEffect } from 'react';
import { Lock, Save, Mail, Phone, CreditCard, Building2 } from 'lucide-react';
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

  const initials = `${(profile.firstName?.[0] || '').toUpperCase()}${(profile.lastName?.[0] || '').toUpperCase()}`;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="profile-grid">
        <div className="profile-info-card">
          <div className="profile-header">
            <div className="profile-avatar">{initials}</div>
            <div>
              <div className="profile-name">{profile.firstName} {profile.lastName}</div>
              <span className="profile-email">{profile.emailId}</span>
              <span className="profile-role">{profile.role}</span>
            </div>
          </div>
          <div className="profile-body">
            {!editing ? (
              <>
                <div className="profile-details">
                  <div className="profile-detail-item">
                    <Mail />
                    <span className="profile-detail-label">Email</span>
                    <span className="profile-detail-value">{profile.emailId}</span>
                  </div>
                  <div className="profile-detail-item">
                    <Phone />
                    <span className="profile-detail-label">Phone</span>
                    <span className="profile-detail-value">{profile.phoneNumber || 'Not provided'}</span>
                  </div>
                  <div className="profile-detail-item">
                    <CreditCard />
                    <span className="profile-detail-label">Member ID</span>
                    <span className="profile-detail-value">{profile.membershipId || 'Not assigned'}</span>
                  </div>
                  <div className="profile-detail-item">
                    <Building2 />
                    <span className="profile-detail-label">Branch</span>
                    <span className="profile-detail-value">{profile.branchName || 'Not assigned'}</span>
                  </div>
                </div>
                <button className="btn btn-outline" onClick={() => setEditing(true)}>
                  Edit Profile
                </button>
              </>
            ) : (
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
                  <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Save />
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="profile-edit-card">
          <h2>Security</h2>

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
                <button type="button" className="btn btn-outline" onClick={() => setShowPasswordForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Lock />
                  Change Password
                </button>
              </div>
            </form>
          ) : (
            <>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-4)' }}>
                Keep your account secure by using a strong password.
              </p>
              <button className="btn btn-outline" onClick={() => setShowPasswordForm(true)}>
                <Lock />
                Change Password
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
