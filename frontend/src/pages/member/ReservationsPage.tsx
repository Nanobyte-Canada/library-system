import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationService, Reservation } from '@/services/reservationService';
import { Calendar, Clock, XCircle, Users } from 'lucide-react';
import './ReservationsPage.css';

type Tab = 'all' | 'pending' | 'ready' | 'fulfilled' | 'cancelled' | 'expired';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'ready', label: 'Ready' },
  { key: 'fulfilled', label: 'Fulfilled' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'expired', label: 'Expired' },
];

export function ReservationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations', 'my'],
    queryFn: () => reservationService.getMyReservations(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => reservationService.cancelReservation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] }),
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { class: string; label: string }> = {
      PENDING: { class: 'pending', label: 'Pending' },
      READY: { class: 'ready', label: 'Ready for Pickup' },
      FULFILLED: { class: 'fulfilled', label: 'Fulfilled' },
      CANCELLED: { class: 'cancelled', label: 'Cancelled' },
      EXPIRED: { class: 'expired', label: 'Expired' },
    };
    return map[status] || { class: '', label: status };
  };

  const filteredReservations = reservations?.data?.filter((r: Reservation) => {
    if (activeTab === 'all') return true;
    return r.status === activeTab.toUpperCase();
  }) || [];

  return (
    <div className="reservations-page">
      <div className="reservations-header">
        <h1><Calendar size={24} /> My Reservations</h1>
        <div className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : filteredReservations.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} />
          <p>No reservations</p>
        </div>
      ) : (
        <div className="reservation-grid">
          {filteredReservations.map((r: Reservation) => {
            const badge = getStatusBadge(r.status);
            return (
              <div key={r.id} className="reservation-card">
                <div className="reservation-book-title">{r.bookName}</div>
                <div className="reservation-meta">
                  <div className="reservation-meta-item">
                    <Users size={14} />
                    <span>{r.branchName}</span>
                  </div>
                  <div className="reservation-meta-item">
                    <Users size={14} />
                    <span>Queue position: #{r.queuePosition}</span>
                  </div>
                  <div className="reservation-meta-item">
                    <Clock size={14} />
                    <span>Reserved: {new Date(r.reservedAt).toLocaleDateString()}</span>
                  </div>
                  {r.expiresAt && (
                    <div className="reservation-meta-item">
                      <Clock size={14} />
                      <span>Expires: {new Date(r.expiresAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div className="reservation-actions">
                  <span className={`reservation-status ${badge.class}`}>{badge.label}</span>
                  {(r.status === 'PENDING' || r.status === 'READY') && (
                    <button
                      className="btn-cancel"
                      onClick={() => cancelMutation.mutate(r.id)}
                      disabled={cancelMutation.isPending}
                    >
                      <XCircle size={14} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
