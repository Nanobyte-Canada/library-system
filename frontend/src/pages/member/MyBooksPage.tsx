import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkoutService } from '@/services/checkoutService';
import { BookOpen, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { BookIssue } from '@/types';
import './MyBooksPage.css';

export function MyBooksPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const { data: activeCheckouts, isLoading: loadingActive } = useQuery({
    queryKey: ['checkouts', 'my'],
    queryFn: () => checkoutService.getMyCheckouts(),
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['checkouts', 'history'],
    queryFn: () => checkoutService.getCheckoutHistory(),
    enabled: activeTab === 'history',
  });

  const renewMutation = useMutation({
    mutationFn: (issueId: string) => checkoutService.renewIssue(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkouts'] });
    },
  });

  const items = activeTab === 'active' ? activeCheckouts?.data : history?.data;
  const isLoading = activeTab === 'active' ? loadingActive : loadingHistory;

  const getDueDateStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { class: 'overdue', text: `${Math.abs(diffDays)} days overdue` };
    if (diffDays <= 3) return { class: 'due-soon', text: `Due in ${diffDays} days` };
    return { class: 'on-time', text: `Due in ${diffDays} days` };
  };

  return (
    <div className="my-books-page">
      <div className="page-header">
        <h1>My Books</h1>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active Checkouts
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : !items || items.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={48} />
          <p>No books found</p>
        </div>
      ) : (
        <div className="checkout-list">
          {items.map((checkout: BookIssue) => {
            const dueStatus = activeTab === 'active' ? getDueDateStatus(checkout.dueDate) : null;
            return (
              <div key={checkout.id} className="checkout-card">
                <div className="checkout-info">
                  <h3>{checkout.bookName}</h3>
                  <p className="barcode">Barcode: {checkout.barcode}</p>
                  <p className="branch">Branch: {checkout.branchName}</p>
                  <p className="dates">
                    <Clock size={14} />
                    Issued: {new Date(checkout.issueDate).toLocaleDateString()}
                    {checkout.returnDate && (
                      <> | Returned: {new Date(checkout.returnDate).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <div className="checkout-actions">
                  {activeTab === 'active' && dueStatus && (
                    <span className={`due-badge ${dueStatus.class}`}>
                      {dueStatus.class === 'overdue' ? <AlertCircle size={14} /> : <Clock size={14} />}
                      {dueStatus.text}
                    </span>
                  )}
                  {activeTab === 'active' && !checkout.renewed && (
                    <button
                      className="btn-secondary"
                      onClick={() => renewMutation.mutate(checkout.id)}
                      disabled={renewMutation.isPending}
                    >
                      <RefreshCw size={14} />
                      Renew
                    </button>
                  )}
                  {checkout.renewed && (
                    <span className="renewed-badge">
                      <CheckCircle size={14} />
                      Renewed
                    </span>
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
