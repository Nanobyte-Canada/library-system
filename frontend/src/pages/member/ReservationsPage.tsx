import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationService, Reservation } from '@/services/reservationService';
import { Calendar, Clock, XCircle, Users } from 'lucide-react';
import './ReservationsPage.css';

export function ReservationsPage() {
  const queryClient = useQueryClient();

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

  return (
    <div className="reservations-page">
      <h1><Calendar size={24} /> My Reservations</h1>
      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : !reservations?.data || reservations.data.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} />
          <p>No reservations</p>
        </div>
      ) : (
        <div className="reservation-list">
          {reservations.data.map((r: Reservation) => {
            const badge = getStatusBadge(r.status);
            return (
              <div key={r.id} className="reservation-card">
                <div className="reservation-info">
                  <h3>{r.bookName}</h3>
                  <p className="branch">{r.branchName}</p>
                  <p className="queue">
                    <Users size={14} /> Queue position: #{r.queuePosition}
                  </p>
                  <p className="date">
                    <Clock size={14} /> Reserved: {new Date(r.reservedAt).toLocaleDateString()}
                  </p>
                  {r.expiresAt && (
                    <p className="expires">Expires: {new Date(r.expiresAt).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="reservation-actions">
                  <span className={`status-badge ${badge.class}`}>{badge.label}</span>
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
