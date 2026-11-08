import React from 'react';
import type { Order, PublicOrderView, Settings } from '../../data/types';
import { displayCode } from '../../lib/format';

export type ReceiptTheme = 'color' | 'black';

interface InvoiceReceiptProps {
  order: Order | PublicOrderView;
  settings?: Settings | null;
  cashierName?: string;
  theme?: ReceiptTheme;
  forwardRef?: React.RefObject<HTMLDivElement>;
}

export const InvoiceReceipt: React.FC<InvoiceReceiptProps> = ({
  order,
  settings,
  cashierName,
  theme = 'black',
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
  const rawNotes = 'conditionNotes' in order ? (order.conditionNotes || order.internalNotes || '') : '';
  const notes = rawNotes && rawNotes !== '-' ? rawNotes : '';
  const orderTime = 'createdAt' in order ? (order.receivedAt || order.createdAt) : order.receivedAt;

  const isBlack = theme === 'black';
  const dividerClass = isBlack ? 'receipt-dashed-divider black' : 'receipt-dashed-divider';
  const textColor = isBlack ? '#000000' : '#111827';
  const mutedTextColor = isBlack ? '#000000' : '#374151';

  return (
    <div
      ref={forwardRef}
      className="soleful-receipt-container"
      style={{
        background: '#ffffff',
        color: textColor,
        width: '100%',
        maxWidth: '420px',
        margin: '0 auto',
        padding: '24px 20px',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
        boxSizing: 'border-box',
        fontSize: '0.86rem',
        lineHeight: 1.4,
      }}
    >
      {/* 1. Brand Logo & Store Header */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <img
          src={isBlack ? '/logo-black.png' : '/logo-color.jpg'}
          alt="Soleful Soaks! Shoes Care"
          style={{
            width: '180px',
            maxWidth: '85%',
            height: 'auto',
            display: 'block',
            margin: '0 auto 6px auto',
            objectFit: 'contain',
          }}
        />
        <div style={{ fontWeight: 600, fontSize: '0.96rem', letterSpacing: '0.01em', marginTop: '4px', color: textColor }}>
          Soleful Soaks!
        </div>
        <div style={{ fontSize: '0.82rem', marginTop: '2px', color: mutedTextColor }}>
          {storeAddress}
        </div>
        <div style={{ fontSize: '0.82rem', marginTop: '1px', color: mutedTextColor, fontWeight: 500 }}>
          {storePhone}
        </div>
      </div>

      {/* Dashed Line Divider */}
      <div className={dividerClass} />

      {/* 2. Order Metadata */}
      <div style={{ fontSize: '0.82rem', lineHeight: 1.55, margin: '8px 0', color: textColor }}>
        <div style={{ display: 'grid', gridTemplateColumns: '115px 10px 1fr' }}>
          <span>Tanggal Pesan</span>
          <span>:</span>
          <span style={{ fontWeight: 600 }}>{formatReceiptDateTime(orderTime)}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '115px 10px 1fr' }}>
          <span>Kasir</span>
          <span>:</span>
          <span style={{ fontWeight: 600 }}>{cashier}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '115px 10px 1fr' }}>
          <span>Nama Customer</span>
          <span>:</span>
          <span style={{ fontWeight: 600 }}>{customerName}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '115px 10px 1fr' }}>
          <span>Telp Customer</span>
          <span>:</span>
          <span style={{ fontWeight: 600 }}>{customerPhone}</span>
        </div>
        {order.estimatedAt && (
          <div style={{ display: 'grid', gridTemplateColumns: '115px 10px 1fr' }}>
            <span>Estimasi Selesai</span>
            <span>:</span>
            <span style={{ fontWeight: 600 }}>{formatReceiptDate(order.estimatedAt)}</span>
          </div>
        )}
      </div>

      {/* Dashed Line Divider */}
      <div className={dividerClass} />

      {/* 3. Services List */}
      <div style={{ margin: '10px 0' }}>
        <div style={{ fontWeight: 700, fontSize: '0.90rem', textDecoration: 'underline', marginBottom: '8px', color: textColor }}>
          Jenis Service
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {itemsToDisplay.map((item, idx) => (
            <div key={idx} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: textColor }}>
                {item.header}
              </div>
              {item.services.map((svc, sIdx) => (
                <div key={sIdx} style={{ marginTop: '1px' }}>
                  <div style={{ fontSize: '0.82rem', color: mutedTextColor }}>
                    {svc.name}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: textColor }}>
                    {formatCurrency(svc.price)}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Additional Products */}
          {productsToDisplay.length > 0 && (
            <div style={{ marginTop: '4px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div style={{ fontWeight: 700, fontSize: '0.86rem', textDecoration: 'underline', marginBottom: '6px', color: textColor }}>
                Produk Tambahan
              </div>
              {productsToDisplay.map((prod, pIdx) => (
                <div key={pIdx} style={{ marginTop: '2px' }}>
                  <div style={{ fontSize: '0.82rem', color: mutedTextColor }}>
                    {prod.name} (x{prod.qty})
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: textColor }}>
                    {formatCurrency(prod.subtotal)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dashed Line Divider */}
      <div className={dividerClass} />

      {/* 4. Total and Payment Method */}
      <div style={{ margin: '8px 0', fontSize: '0.84rem', lineHeight: 1.6, color: textColor }}>
        <div style={{ display: 'grid', gridTemplateColumns: '115px 10px 1fr' }}>
          <span style={{ fontWeight: 700 }}>Total Harga</span>
          <span style={{ fontWeight: 700 }}>:</span>
          <span style={{ fontWeight: 800, fontSize: '0.94rem' }}>{formatCurrency(order.total)}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '115px 10px 1fr' }}>
          <span>Pembayaran</span>
          <span>:</span>
          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
            {paymentMethod ? paymentMethod.toUpperCase() : 'TUNAI'}
          </span>
        </div>
      </div>

      {/* Dashed Line Divider */}
      <div className={dividerClass} />

      {/* 5. Perfume & Notes */}
      <div style={{ margin: '8px 0', fontSize: '0.82rem', lineHeight: 1.55, color: textColor }}>
        <div style={{ display: 'grid', gridTemplateColumns: '115px 10px 1fr' }}>
          <span>Parfume</span>
          <span>:</span>
          <span style={{ fontWeight: 600 }}>{order.fragranceName || 'Green Apple'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '115px 10px 1fr' }}>
          <span>Catatan</span>
          <span>:</span>
          <span>{notes}</span>
        </div>
      </div>

      {/* Dashed Line Divider */}
      <div className={dividerClass} />

      {/* 6. Footer */}
      <div
        style={{
          marginTop: '14px',
          paddingTop: '6px',
          textAlign: 'center',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          color: textColor,
        }}
      >
        <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>
          <span style={{ borderBottom: isBlack ? '1.5px solid #000000' : '2px solid #c82d38', paddingBottom: '1px' }}>
            Thank You
          </span>{' '}
          <span style={{ borderBottom: isBlack ? '1.5px solid #000000' : '2px solid #0c2340', paddingBottom: '1px' }}>
            For Trusting
          </span>{' '}
          <span style={{ borderBottom: isBlack ? '1.5px solid #000000' : '2px solid #c82d38', paddingBottom: '1px' }}>
            Us
          </span>
        </div>
        <div style={{ fontSize: '0.86rem', fontWeight: 600, marginTop: '3px' }}>
          <span style={{ borderBottom: isBlack ? '1.5px solid #000000' : '2px solid #0c2340', paddingBottom: '1px' }}>
            To Clean Your Shoes
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px', fontSize: '0.82rem', fontWeight: 600 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
          </svg>
          <span>: @solefulsoaks</span>
        </div>
      </div>
    </div>
  );
};
