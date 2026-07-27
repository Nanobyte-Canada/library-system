import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkoutService } from '@/services/checkoutService';
import { BookOpen, ScanLine, CheckCircle, XCircle } from 'lucide-react';
import './CheckoutDeskPage.css';

export function CheckoutDeskPage() {
  const queryClient = useQueryClient();
  const [barcode, setBarcode] = useState('');
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState<'checkout' | 'return'>('checkout');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (action === 'checkout') {
        return checkoutService.checkout({ userId, copyId: barcode });
      }
      return checkoutService.returnBook({ copyId: barcode });
    },
    onSuccess: (response) => {
      setResult({ success: true, message: response.message || 'Operation successful' });
      setBarcode('');
      setUserId('');
      queryClient.invalidateQueries({ queryKey: ['checkouts'] });
    },
    onError: (error: any) => {
      setResult({ success: false, message: error.response?.data?.message || 'Operation failed' });
    },
  });

  const handleSubmit = () => {
    if (action === 'checkout' && (!barcode.trim() || !userId.trim())) return;
    if (action === 'return' && !barcode.trim()) return;
    mutation.mutate();
  };

  return (
    <div className="checkout-desk-page">
      <h1>
        <BookOpen size={24} />
        Checkout Desk
      </h1>

      <div className="desk-controls">
        <div className="action-toggle">
          <button
            className={`action-btn ${action === 'checkout' ? 'active checkout' : ''}`}
            onClick={() => setAction('checkout')}
          >
            Checkout
          </button>
          <button
            className={`action-btn ${action === 'return' ? 'active return' : ''}`}
            onClick={() => setAction('return')}
          >
            Return
          </button>
        </div>
      </div>

      <div className="desk-form">
        {action === 'checkout' && (
          <div className="form-group">
            <label htmlFor="userId">Member ID</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter member ID"
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="barcode">Copy Barcode</label>
          <input
            id="barcode"
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Enter or scan barcode"
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={
            mutation.isPending ||
            (action === 'checkout' && (!barcode.trim() || !userId.trim())) ||
            (action === 'return' && !barcode.trim())
          }
        >
          <ScanLine size={16} />
          {mutation.isPending ? 'Processing...' : action === 'checkout' ? 'Checkout Book' : 'Return Book'}
        </button>
      </div>

      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          {result.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span>{result.message}</span>
          <button className="dismiss" onClick={() => setResult(null)}>×</button>
        </div>
      )}
    </div>
  );
}
