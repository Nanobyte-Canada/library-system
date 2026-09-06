import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkoutService } from '@/services/checkoutService';
import { ScanLine, CheckCircle, XCircle, Camera, Keyboard, BookOpen, RotateCcw } from 'lucide-react';
import './QRScannerPage.css';

export function QRScannerPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'scan' | 'manual'>('manual');
  const [action, setAction] = useState<'checkout' | 'return'>('checkout');
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [recentActivity, setRecentActivity] = useState<
    Array<{ id: string; type: 'checkout' | 'return'; bookName: string; barcode: string; time: string }>
  >([]);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  const mutation = useMutation({
    mutationFn: (data: { barcode: string }) => {
      if (action === 'checkout') {
        return checkoutService.scanCheckout(data);
      }
      return checkoutService.scanReturn(data);
    },
    onSuccess: (response) => {
      const message = response.message || 'Operation successful';
      setResult({ success: true, message });
      setRecentActivity((prev) => [
        {
          id: Date.now().toString(),
          type: action,
          bookName: message,
          barcode,
          time: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 9),
      ]);
      setBarcode('');
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
      const scanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
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
    if (barcodeToSubmit.trim()) {
      mutation.mutate({ barcode: barcodeToSubmit.trim() });
    }
  };

  const handleModeChange = (newMode: 'scan' | 'manual') => {
    if (newMode === 'manual') {
      stopScanner();
    }
    setMode(newMode);
  };

  return (
    <div className="qr-scanner-page">
      <div className="scanner-header">
        <h1>Scan & Borrow</h1>
        <p>Scan a QR code or enter a barcode to check out or return a book</p>
      </div>

      <div className="scanner-mode-toggle">
        <button
          className={`mode-btn ${mode === 'scan' ? 'active' : ''}`}
          onClick={() => handleModeChange('scan')}
        >
          <Camera size={16} />
          Camera
        </button>
        <button
          className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => handleModeChange('manual')}
        >
          <Keyboard size={16} />
          Manual
        </button>
      </div>

      {mode === 'scan' && (
        <div className="qr-section">
          <div id="qr-reader" ref={scannerRef}></div>
          <p className="qr-placeholder">
            <Camera size={48} />
          </p>
        </div>
      )}

      {mode === 'manual' && (
        <div className="barcode-input-section">
          <label htmlFor="barcode-input">Book barcode</label>
          <div className="barcode-input-row">
            <input
              id="barcode-input"
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Enter barcode manually"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitBarcode()}
            />
          </div>
        </div>
      )}

      <div className="action-buttons">
        <button
          className={`btn btn-primary ${action === 'checkout' ? '' : 'btn-outline'}`}
          onClick={() => setAction('checkout')}
          disabled={action === 'checkout'}
        >
          <BookOpen size={16} />
          Checkout
        </button>
        <button
          className={`btn ${action === 'return' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setAction('return')}
          disabled={action === 'return'}
        >
          <RotateCcw size={16} />
          Return
        </button>
      </div>

      {mode === 'manual' && (
        <div className="action-buttons">
          <button
            className="btn btn-primary"
            onClick={() => handleSubmitBarcode()}
            disabled={!barcode.trim() || mutation.isPending}
            style={{ width: '100%' }}
          >
            <ScanLine size={16} />
            {mutation.isPending ? 'Processing...' : action === 'checkout' ? 'Checkout Book' : 'Return Book'}
          </button>
        </div>
      )}

      {result && (
        <div className={result.success ? 'success-banner' : 'error-banner'}>
          {result.success ? <CheckCircle size={18} /> : <XCircle size={18} />}
          <span>{result.message}</span>
          <button className="dismiss" onClick={() => setResult(null)}>×</button>
        </div>
      )}

      {recentActivity.length > 0 && (
        <div className="recent-activity">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {recentActivity.map((item) => (
              <div key={item.id} className="activity-item">
                <div className={`activity-item-icon ${item.type}`}>
                  {item.type === 'checkout' ? <BookOpen size={14} /> : <RotateCcw size={14} />}
                </div>
                <div className="activity-item-text">
                  <strong>{item.type === 'checkout' ? 'Checked out' : 'Returned'}</strong> {item.bookName}
                </div>
                <div className="activity-item-time">{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
