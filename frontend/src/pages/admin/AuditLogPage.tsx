import { useQuery } from '@tanstack/react-query';
import { auditLogService, AuditLog } from '@/services/auditLogService';
import { Shield, Filter } from 'lucide-react';
import { useState } from 'react';
import './AuditLogPage.css';

export function AuditLogPage() {
  const [entityType, setEntityType] = useState<string>('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType],
    queryFn: () => auditLogService.getAuditLogs(entityType || undefined),
  });

  return (
    <div className="audit-log-page">
      <div className="page-header">
        <h1><Shield size={24} /> Audit Log</h1>
        <div className="filter">
          <Filter size={16} />
          <select value={entityType} onChange={e => setEntityType(e.target.value)}>
            <option value="">All</option>
            <option value="BOOK">Books</option>
            <option value="USER">Users</option>
            <option value="CHECKOUT">Checkouts</option>
            <option value="RESERVATION">Reservations</option>
          </select>
        </div>
      </div>
      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="table-container">
          <table>
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
                  <td><span className="action-badge">{log.action}</span></td>
                  <td>{log.entityType}</td>
                  <td className="details">{log.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
