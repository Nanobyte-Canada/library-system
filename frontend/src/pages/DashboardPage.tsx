import { useAuthStore } from '@/stores/authStore';

export function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p style={{ marginBottom: 24, color: 'var(--text-secondary)' }}>
        Welcome back, {user?.firstName}!
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Total Books</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>—</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Active Loans</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>—</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Overdue Books</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--danger)' }}>—</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Total Users</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>—</div>
        </div>
      </div>
    </div>
  );
}
