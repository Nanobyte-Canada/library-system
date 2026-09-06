import { BookOpen, BookMarked, Users, AlertTriangle, Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { KpiCard } from '@/components/dashboard/KpiCard';
import './DashboardPage.css';

const recentActivity = [
  { icon: <BookMarked size={16} />, text: <><strong>Jane Smith</strong> borrowed "Designing Data-Intensive Applications"</>, time: '2 hours ago' },
  { icon: <Clock size={16} />, text: <><strong>Alex Chen</strong> returned "Clean Code"</>, time: '3 hours ago' },
  { icon: <AlertTriangle size={16} />, text: <><strong>Maria Garcia</strong> has 2 overdue books</>, time: '5 hours ago' },
  { icon: <Users size={16} />, text: <><strong>Tom Wilson</strong> registered as a new member</>, time: 'Yesterday' },
  { icon: <BookOpen size={16} />, text: <><strong>45 new books</strong> added to Fiction category</>, time: '2 days ago' },
];

const branches = [
  { name: 'Main Branch', books: '—', members: '—' },
  { name: 'East Wing', books: '—', members: '—' },
  { name: 'Community Center', books: '—', members: '—' },
];

export function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div>
      <div className="dashboard-welcome">
        <h1>Welcome back, {user?.firstName || 'there'}</h1>
        <p>Here's what's happening at the library</p>
      </div>

      <div className="dashboard-kpi-grid">
        <KpiCard icon={<BookOpen size={20} />} value="—" label="Total Books" color="green" />
        <KpiCard icon={<BookMarked size={20} />} value="—" label="Active Loans" color="blue" />
        <KpiCard icon={<AlertTriangle size={20} />} value="—" label="Overdue" color="red" />
        <KpiCard icon={<Users size={20} />} value="—" label="Total Users" color="amber" />
      </div>

      <div className="dashboard-section">
        <h2 className="dashboard-section-title">Recent Activity</h2>
        <div className="activity-list">
          {recentActivity.map((item, i) => (
            <div className="activity-item" key={i}>
              <div className="activity-icon">{item.icon}</div>
              <div className="activity-text">{item.text}</div>
              <div className="activity-time">{item.time}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section">
        <h2 className="dashboard-section-title">By Branch</h2>
        <div className="branch-grid">
          {branches.map((branch) => (
            <div className="branch-card" key={branch.name}>
              <div className="branch-card-name">{branch.name}</div>
              <div className="branch-card-stat">{branch.books} books · {branch.members} members</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
