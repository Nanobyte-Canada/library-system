import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkoutService } from '@/services/checkoutService';
import { ScanLine, CheckCircle, XCircle, Camera, Keyboard } from 'lucide-react';
import './QRScannerPage.css';

export function QRScannerPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'scan' | 'manual'>('manual');
  const [action, setAction] = useState<'checkout' | 'return'>('checkout');
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
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
      setResult({ success: true, message: response.message || 'Operation successful' });
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

  return (
    <div className="qr-scanner-page">
      <h1>QR Scanner</h1>

      <div className="scanner-controls">
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

        <div className="mode-toggle">
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
      </div>

      {mode === 'scan' && (
        <div className="scanner-container">
          <div id="qr-reader" ref={scannerRef}></div>
          <p className="scan-hint">Point camera at QR code or barcode</p>
        </div>
      )}

      {mode === 'manual' && (
        <div className="manual-input">
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Enter barcode manually"
            onKeyPress={(e) => e.key === 'Enter' && handleSubmitBarcode()}
          />
          <button
            className="submit-btn"
            onClick={() => handleSubmitBarcode()}
            disabled={!barcode.trim() || mutation.isPending}
          >
            <ScanLine size={16} />
            {mutation.isPending ? 'Processing...' : action === 'checkout' ? 'Checkout' : 'Return'}
          </button>
        </div>
      )}

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
