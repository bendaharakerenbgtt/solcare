import React, { useRef, useState } from 'react';
import type { Order, PublicOrderView, Settings } from '../../data/types';
import { InvoiceReceipt, type ReceiptTheme } from './InvoiceReceipt';
import { ModalPortal } from './ModalPortal';
import { downloadReceiptPDF } from '../../lib/pdf';
import { displayCode, whatsappLink } from '../../lib/format';

interface InvoiceModalProps {
  order: Order | PublicOrderView;
  settings?: Settings | null;
  cashierName?: string;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  order,
  settings,
  cashierName,
  onClose,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<ReceiptTheme>('black');
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handlePrint = () => {
    if (!receiptRef.current) {
      window.print();
      return;
    }

    // Isolate receipt in an invisible iframe to guarantee 1 single page without parent page bleed
    const existingIframe = document.getElementById('receipt-print-iframe');
    if (existingIframe) existingIframe.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'receipt-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const receiptHtml = receiptRef.current.outerHTML;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Nota - Soleful Soaks</title>
          <style>
            @page {
              size: auto;
              margin: 4mm 6mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              background: #ffffff;
              width: 100%;
              height: auto;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .soleful-receipt-container {
              width: 100% !important;
              max-width: 380px !important;
              margin: 0 auto !important;
              padding: 10px 8px !important;
              box-shadow: none !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
          </style>
        </head>
        <body>
          ${receiptHtml}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        iframe.remove();
      }, 1000);
    }, 250);
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    setDownloading(true);
    setDownloadSuccess(false);
    try {
      const filename = `Nota-SolefulSoaks-${order.code}-${theme === 'color' ? 'Warna' : 'Hitam'}`;
      await downloadReceiptPDF(receiptRef.current, filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      alert('Gagal membuat PDF: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDownloading(false);
    }
  };

  const customerName = 'customerName' in order ? order.customerName : order.customerDisplayName;
  const customerPhone = 'customerPhone' in order ? order.customerPhone : null;
  const waTrackUrl = `https://solcare.ebon.vercel.app/cek-pesanan?code=${order.code}`;
  const waText = `Halo Kak ${customerName}, berikut nota digital pesanan perawatan sepatu di Soleful Soaks! Shoes Care (Kode: ${displayCode(order.code)}).\n\nPantau progres & nota online: ${waTrackUrl}\n\nTerima kasih telah mempercayakan sepatu Anda di Soleful Soaks!`;
  const waHref = customerPhone ? whatsappLink(customerPhone, waText) : null;

  return (
    <ModalPortal>
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        className="invoice-modal-card"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Nota & Invoice Digital
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Kode Pesanan: <strong style={{ color: '#0369a1' }}>{displayCode(order.code)}</strong>
            </span>
          </div>
          <button
            type="button"
            className="btn text"
            onClick={onClose}
            style={{
              padding: '6px 10px',
              fontSize: '1.1rem',
              color: '#64748b',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
            }}
          >
            ✕
          </button>
        </div>

        {/* Theme Selector Toggle (Versi Hitam vs Versi Warna) */}
        <div
          style={{
            padding: '8px 18px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
            Pilihan Tampilan:
          </span>
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setTheme('black')}
              style={{
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: theme === 'black' ? '#0f172a' : 'transparent',
                color: theme === 'black' ? '#ffffff' : '#475569',
                boxShadow: theme === 'black' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              🖤 Versi Hitam (B&W)
            </button>
            <button
              type="button"
              onClick={() => setTheme('color')}
              style={{
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: theme === 'color' ? '#0284c7' : 'transparent',
                color: theme === 'color' ? '#ffffff' : '#475569',
                boxShadow: theme === 'color' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              🎨 Versi Warna
            </button>
          </div>
        </div>

        {/* Action Bar (Print, Download PDF, WhatsApp) */}
        <div
          style={{
            padding: '10px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={handlePrint}
            style={{
              flex: '1 1 120px',
              padding: '8px 12px',
              fontSize: '0.84rem',
              fontWeight: 700,
              background: '#001b3a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect width="12" height="8" x="6" y="14"/>
            </svg>
            Cetak Nota
          </button>

          <button
            type="button"
            className="btn"
            disabled={downloading}
            onClick={handleDownloadPDF}
            style={{
              flex: '1 1 120px',
              padding: '8px 12px',
              fontSize: '0.84rem',
              fontWeight: 700,
              background: downloadSuccess ? '#059669' : '#0d9488',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: downloading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {downloading ? 'Memproses PDF...' : downloadSuccess ? 'Tersimpan!' : 'Unduh PDF'}
          </button>

          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="btn wa"
              style={{
                flex: '1 1 120px',
                padding: '8px 12px',
                fontSize: '0.84rem',
                fontWeight: 700,
                textDecoration: 'none',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              WhatsApp Nota
            </a>
          )}
        </div>

        {/* Scrollable Receipt Area */}
        <div
          style={{
            padding: '20px 16px',
            overflowY: 'auto',
            background: '#e2e8f0',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            id="printable-receipt"
            style={{
              background: '#ffffff',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              borderRadius: '6px',
              width: '100%',
              maxWidth: '420px',
            }}
          >
            <InvoiceReceipt
              order={order}
              settings={settings}
              cashierName={cashierName}
              theme={theme}
              forwardRef={receiptRef}
            />
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
