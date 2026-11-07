import React from 'react';
import type { Order, PublicOrderView, Settings } from '../../data/types';
import { displayCode } from '../../lib/format';

interface InvoiceReceiptProps {
  order: Order | PublicOrderView;
  settings?: Settings | null;
  cashierName?: string;
  forwardRef?: React.RefObject<HTMLDivElement>;
}

export const InvoiceReceipt: React.FC<InvoiceReceiptProps> = ({
  order,
  settings,
  cashierName,
  forwardRef,
}) => {
  const pad = (n: number) => n.toString().padStart(2, '0');

  const formatReceiptDateTime = (iso: string | null | undefined) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const formatReceiptDate = (iso: string | null | undefined) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
  };

  const formatCurrency = (val: number) => {
    return 'IDR ' + val.toLocaleString('id-ID');
  };

  // Compile list of service items
  // Multi-item order: order.items has multiple shoes, each with its own services
  // Single-item order: order.services on the root order
  interface DisplayItem {
    header: string;
    services: { name: string; price: number }[];
  }

  const itemsToDisplay: DisplayItem[] = [];

  if (order.items && order.items.length > 0) {
    order.items.forEach((it) => {
      const header = `${it.brand} ${it.model}${it.color ? ` (${it.color})` : ''}`.trim() || it.itemType || 'Sepatu';
      itemsToDisplay.push({
        header,
        services: it.services.map((s) => ({ name: s.name, price: s.price })),
      });
    });
  } else {
    const header = `${order.brand} ${order.model}${order.color ? ` (${order.color})` : ''}`.trim() || order.itemType || 'Sepatu';
    itemsToDisplay.push({
      header,
      services: (order.services || []).map((s) => ({ name: s.name, price: s.price })),
    });
  }

  const productsToDisplay = order.products || [];

  const storeAddress = settings?.address || 'Jl. Mampang Prapatan XV No.32';
  const storePhone = settings?.whatsappNumber ? `Telp. ${settings.whatsappNumber}` : 'Telp. 081210043758';
  
  const customerName = 'customerName' in order ? order.customerName : order.customerDisplayName;
  const customerPhone = 'customerPhone' in order ? order.customerPhone : '-';
  const cashier = cashierName || ('payment' in order ? order.payment.recordedByName : '') || 'Staff';
  const paymentMethod = 'payment' in order ? order.payment.method : order.paymentMethod;
  const paymentStatus = 'payment' in order ? order.payment.status : order.paymentStatus;
  const notes = 'conditionNotes' in order ? (order.conditionNotes || order.internalNotes || '-') : '-';
  const orderTime = 'createdAt' in order ? (order.receivedAt || order.createdAt) : order.receivedAt;

  return (
    <div
      ref={forwardRef}
      className="soleful-receipt-container"
      style={{
        background: '#ffffff',
        color: '#111827',
        width: '100%',
        maxWidth: '460px',
        margin: '0 auto',
        padding: '24px 20px',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
        boxSizing: 'border-box',
        fontSize: '0.88rem',
        lineHeight: 1.4,
      }}
    >
      {/* 1. Brand Logo & Header */}
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <img
            src="/solecare_logo.jpg"
            alt="Soleful Soaks Logo"
            style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' }}
          />
        </div>
        <div style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          SOLEFUL SOAKS!
        </div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', color: '#4b5563', textTransform: 'uppercase', marginTop: '-2px' }}>
          SHOES CARE
        </div>
        <div style={{ fontSize: '0.82rem', marginTop: '6px', color: '#374151' }}>
          {storeAddress}
        </div>
        <div style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 500 }}>
          {storePhone}
        </div>
      </div>

      {/* Red & Blue Dashed Line Divider */}
      <div className="receipt-dashed-divider" />

      {/* 2. Order Metadata */}
      <div style={{ fontSize: '0.82rem', lineHeight: 1.5, margin: '10px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr' }}>
          <span style={{ color: '#4b5563' }}>Tanggal Pesan</span>
          <span>:</span>
          <span style={{ fontWeight: 600 }}>{formatReceiptDateTime(orderTime)}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr' }}>
          <span style={{ color: '#4b5563' }}>Kasir</span>
          <span>:</span>
          <span style={{ fontWeight: 600 }}>{cashier}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr' }}>
          <span style={{ color: '#4b5563' }}>Nama Customer</span>
          <span>:</span>
          <span style={{ fontWeight: 600 }}>{customerName}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr' }}>
          <span style={{ color: '#4b5563' }}>Telp Customer</span>
          <span>:</span>
          <span style={{ fontWeight: 600 }}>{customerPhone}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr' }}>
          <span style={{ color: '#4b5563' }}>Estimasi Selesai</span>
          <span>:</span>
          <span style={{ fontWeight: 600 }}>{formatReceiptDate(order.estimatedAt)}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr' }}>
          <span style={{ color: '#4b5563' }}>Kode Pesanan</span>
          <span>:</span>
          <span style={{ fontWeight: 700, letterSpacing: '0.04em' }}>{displayCode(order.code)}</span>
        </div>
      </div>

      {/* Red & Blue Dashed Line Divider */}
      <div className="receipt-dashed-divider" />

      {/* 3. Services List (Expands dynamically with NO item limit!) */}
      <div style={{ margin: '12px 0' }}>
        <div style={{ fontWeight: 700, fontSize: '0.92rem', textDecoration: 'underline', marginBottom: '8px' }}>
          Jenis Service
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {itemsToDisplay.map((item, idx) => (
            <div key={idx} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#111827' }}>
                {item.header}
              </div>
              {item.services.map((svc, sIdx) => (
                <div key={sIdx} style={{ paddingLeft: '2px', marginTop: '1px' }}>
                  <div style={{ fontSize: '0.82rem', color: '#374151' }}>
                    {svc.name}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>
                    {formatCurrency(svc.price)}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Additional Products */}
          {productsToDisplay.length > 0 && (
            <div style={{ marginTop: '4px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#111827' }}>
                Produk Tambahan
              </div>
              {productsToDisplay.map((prod, pIdx) => (
                <div key={pIdx} style={{ paddingLeft: '2px', marginTop: '2px' }}>
                  <div style={{ fontSize: '0.82rem', color: '#374151' }}>
                    {prod.name} (x{prod.qty})
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>
                    {formatCurrency(prod.subtotal)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Red & Blue Dashed Line Divider */}
      <div className="receipt-dashed-divider" />

      {/* 4. Total and Payment Method */}
      <div style={{ margin: '10px 0', fontSize: '0.86rem', lineHeight: 1.6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr' }}>
          <span style={{ fontWeight: 700 }}>Total Harga</span>
          <span style={{ fontWeight: 700 }}>:</span>
          <span style={{ fontWeight: 800, fontSize: '0.98rem' }}>{formatCurrency(order.total)}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr' }}>
          <span style={{ color: '#4b5563' }}>Pembayaran</span>
          <span>:</span>
          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
            {paymentMethod ? paymentMethod.toUpperCase() : 'TUNAI'} ({paymentStatus === 'lunas' ? 'LUNAS' : 'Belum Lunas'})
          </span>
        </div>
      </div>

      {/* Red & Blue Dashed Line Divider */}
      <div className="receipt-dashed-divider" />

      {/* 5. Perfume & Notes */}
      <div style={{ margin: '10px 0', fontSize: '0.82rem', lineHeight: 1.5 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr' }}>
          <span style={{ color: '#4b5563' }}>Parfume</span>
          <span>:</span>
          <span style={{ fontWeight: 600 }}>{order.fragranceName || 'Green Apple'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr' }}>
          <span style={{ color: '#4b5563' }}>Catatan</span>
          <span>:</span>
          <span>{notes}</span>
        </div>
      </div>

      {/* 6. Footer (Naturally stays below all items without clipping!) */}
      <div
        style={{
          marginTop: '16px',
          paddingTop: '12px',
          textAlign: 'center',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>
          <span style={{ borderBottom: '2px solid #ef4444', paddingBottom: '1px' }}>Thank You</span>{' '}
          <span style={{ borderBottom: '2px solid #2563eb', paddingBottom: '1px' }}>For Trusting</span>{' '}
          <span style={{ borderBottom: '2px solid #ef4444', paddingBottom: '1px' }}>Us</span>
        </div>
        <div style={{ fontSize: '0.86rem', fontWeight: 600, marginTop: '2px' }}>
          <span style={{ borderBottom: '2px solid #2563eb', paddingBottom: '1px' }}>To Clean Your Shoes</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '10px', fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
          </svg>
          <span>: @solefulsoaks</span>
        </div>

        <div style={{ marginTop: '12px', fontSize: '0.72rem', color: '#6b7280' }}>
          Pantau progres & foto pengerjaan di:
          <br />
          <strong style={{ color: '#0369a1' }}>solecare.ebon.vercel.app/cek-pesanan?code={order.code}</strong>
        </div>
      </div>
    </div>
  );
};
