import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkoutService } from '@/services/checkoutService';
import { BookOpen, ScanLine, CheckCircle, XCircle, Camera, Keyboard, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import './CheckoutDeskPage.css';

interface ActivityItem {
  id: number;
  type: 'checkout' | 'return';
  barcode: string;
  memberName: string;
  time: Date;
}

export function CheckoutDeskPage() {
  const queryClient = useQueryClient();
  const [memberName, setMemberName] = useState('');
  const [userId, setUserId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [action, setAction] = useState<'checkout' | 'return'>('checkout');
  const [mode, setMode] = useState<'scan' | 'manual'>('manual');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (action === 'checkout') {
        return checkoutService.checkout({ userId, copyId: barcode });
      }
      return checkoutService.returnBook({ copyId: barcode });
    },
    onSuccess: (response) => {
      const msg = response.message || 'Operation successful';
      setResult({ success: true, message: msg });
      setActivityLog((prev) => [
        {
          id: Date.now(),
          type: action,
          barcode,
          memberName: action === 'checkout' ? memberName || userId : '—',
          time: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
      setBarcode('');
      setUserId('');
      setMemberName('');
      queryClient.invalidateQueries({ queryKey: ['checkouts'] });
    },
    onError: (error: any) => {
      setResult({ success: false, message: error.response?.data?.message || 'Operation failed' });
    },
  });

  useEffect(() => {
    if (mode === 'scan' && scannerRef.current) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [mode]);

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (html5QrCodeRef.current) {
        stopScanner();
      }
      const scanner = new Html5Qrcode('qr-reader-admin');
      html5QrCodeRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          setBarcode(decodedText);
          handleSubmitBarcode(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error('Scanner error:', err);
      setMode('manual');
    }
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(() => {});
      html5QrCodeRef.current.clear();
      html5QrCodeRef.current = null;
    }
  };

  const handleSubmitBarcode = (value?: string) => {
    const barcodeToSubmit = value || barcode;
    if (action === 'checkout' && (!barcodeToSubmit.trim() || !userId.trim())) return;
    if (action === 'return' && !barcodeToSubmit.trim()) return;
    setBarcode(barcodeToSubmit);
    mutation.mutate();
  };

  const handleSubmit = () => {
    if (action === 'checkout' && (!barcode.trim() || !userId.trim())) return;
    if (action === 'return' && !barcode.trim()) return;
    mutation.mutate();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="checkout-desk-page">
      <div className="checkout-desk-header">
        <h1>
          <BookOpen size={22} />
          Checkout &amp; Return
          <span className="admin-badge">Admin</span>
        </h1>
        <p>Process book checkouts and returns for library members</p>
      </div>

      {action === 'checkout' && (
        <div className="member-lookup">
          <h3>Member</h3>
          <div className="member-lookup-input">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Member ID"
            />
            <input
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Member name (optional)"
            />
          </div>
        </div>
      )}

      <div className="scanner-mode-toggle">
        <button
          className={`mode-btn ${action === 'checkout' ? 'active' : ''}`}
          onClick={() => setAction('checkout')}
        >
          <ArrowUpCircle size={16} />
          Checkout
        </button>
        <button
          className={`mode-btn ${action === 'return' ? 'active' : ''}`}
          onClick={() => { setAction('return'); stopScanner(); }}
        >
          <ArrowDownCircle size={16} />
          Return
        </button>
      </div>

      <div className="scanner-mode-toggle">
        <button
          className={`mode-btn ${mode === 'scan' ? 'active' : ''}`}
          onClick={() => setMode('scan')}
        >
          <Camera size={16} />
          Camera
        </button>
        <button
          className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => { setMode('manual'); stopScanner(); }}
        >
          <Keyboard size={16} />
          Manual
        </button>
      </div>

      {mode === 'scan' && (
        <div className="qr-section">
          <div className="qr-placeholder">
            <div id="qr-reader-admin" ref={scannerRef}></div>
          </div>
          <p className="caption">Point camera at QR code or barcode</p>
        </div>
      )}

      {mode === 'manual' && (
        <div className="barcode-input-section">
          <label htmlFor="barcode">Book Barcode</label>
          <div className="barcode-input-row">
            <input
              id="barcode"
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Enter or scan barcode"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>
      )}

      <div className="action-buttons">
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={
            mutation.isPending ||
            (action === 'checkout' && (!barcode.trim() || !userId.trim())) ||
            (action === 'return' && !barcode.trim())
          }
        >
          <ScanLine size={16} />
          {mutation.isPending
            ? 'Processing...'
            : action === 'checkout'
              ? 'Checkout Book'
              : 'Return Book'}
        </button>
      </div>

      {result && (
        <div className={result.success ? 'success-banner' : 'error-banner'}>
          {result.success ? <CheckCircle size={18} /> : <XCircle size={18} />}
          <span>{result.message}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setResult(null)}
            style={{ marginLeft: 'auto' }}
          >
            ×
          </button>
        </div>
      )}

      {activityLog.length > 0 && (
        <div className="recent-activity">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {activityLog.map((item) => (
              <div className="activity-item" key={item.id}>
                <div className={`activity-item-icon ${item.type}`}>
                  {item.type === 'checkout' ? (
                    <ArrowUpCircle size={14} />
                  ) : (
                    <ArrowDownCircle size={14} />
                  )}
                </div>
                <div className="activity-item-text">
                  <strong>{item.type === 'checkout' ? 'Checked out' : 'Returned'}</strong>{' '}
                  {item.barcode}
                  {item.memberName && item.memberName !== '—' && (
                    <> to {item.memberName}</>
                  )}
                </div>
                <span className="activity-item-time">{formatTime(item.time)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
