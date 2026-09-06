import { useQuery } from '@tanstack/react-query';
import { auditLogService, AuditLog } from '@/services/auditLogService';
import { Shield } from 'lucide-react';
import { useState } from 'react';
import './AuditLogPage.css';

export function AuditLogPage() {
  const [entityType, setEntityType] = useState<string>('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType],
    queryFn: () => auditLogService.getAuditLogs(entityType || undefined),
  });

  return (
    <div className="admin-audit-page">
      <div className="admin-page-header">
        <h1><Shield size={24} /> Audit Log</h1>
        <p>Track system activity and changes</p>
      </div>

      <div className="audit-filters">
        <select value={entityType} onChange={e => setEntityType(e.target.value)}>
          <option value="">All</option>
          <option value="BOOK">Books</option>
          <option value="USER">Users</option>
          <option value="CHECKOUT">Checkouts</option>
          <option value="RESERVATION">Reservations</option>
        </select>
      </div>

      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          {/* Desktop table */}
          <table className="audit-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs?.data?.map((log: AuditLog) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.userName || 'System'}</td>
                  <td>
                    <span className={`action-badge ${log.action.toLowerCase()}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.entityType}</td>
                  <td>{log.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile card layout */}
          <div className="audit-cards">
            {logs?.data?.map((log: AuditLog) => (
              <div className="audit-card-item" key={log.id}>
                <div className="audit-card-header">
                  <span className="audit-card-user">{log.userName || 'System'}</span>
                  <span className="audit-card-time">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <div className="audit-card-detail">
                  <span className={`action-badge ${log.action.toLowerCase()}`}>
                    {log.action}
                  </span>{' '}
                  {log.entityType}{log.details ? ` — ${log.details}` : ''}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
