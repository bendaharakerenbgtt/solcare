import React from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { whatsappLink } from '../../lib/format';

export const ContactPage: React.FC = () => {
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const waUrl = settings?.whatsappNumber
    ? whatsappLink(settings.whatsappNumber, 'Halo Soleful Soaks!, saya ingin bertanya informasi toko & layanan.')
    : null;

  return (
    <div className="container" style={{ padding: '40px 20px 60px', maxWidth: '700px' }}>
      <div className="section-title">
        <div className="eyebrow">Hubungi & Kunjungi</div>
        <h2>Kontak & Lokasi Workshop</h2>
        <p className="muted">
          Kami siap membantu konsultasi perawatan sepatu, tas, topi, maupun helm kesayangan Anda.
        </p>
      </div>

      <div className="stack" style={{ gap: '20px' }}>
        <div className="card">
          <h3>Customer Service WhatsApp</h3>
          <p className="small muted" style={{ margin: '6px 0 16px' }}>
            Hubungi kami untuk tanya jawab layanan, konfirmasi pesanan, atau permintaan kurir / delivery mandiri.
          </p>
          {waUrl ? (
            <a href={waUrl} target="_blank" rel="noreferrer" className="btn wa">
              💬 Chat WhatsApp Kami ({settings?.whatsappNumber})
            </a>
          ) : (
            <div className="alert warn small">
              Nomor WhatsApp belum dikonfigurasi oleh admin.
            </div>
          )}
        </div>

        <div className="card">
          <h3>Lokasi & Jam Kerja</h3>
          <div className="stack" style={{ gap: '12px', marginTop: '12px' }}>
            <div>
              <strong>Alamat Workshop:</strong>
              <p className="small muted" style={{ margin: '4px 0 0' }}>
                {settings?.address || 'Belum diisi oleh admin.'}
              </p>
            </div>
            <div>
              <strong>Jam Operasional:</strong>
              <p className="small muted" style={{ margin: '4px 0 0' }}>
                {settings?.publicHoursText || `${settings?.openTime || '09:00'} - ${settings?.closeTime || '18:00'} WIB`}
              </p>
            </div>
            {settings?.instagramUrl && (
              <div>
                <strong>Instagram Resmi:</strong>
                <div style={{ marginTop: '4px' }}>
                  <a href={settings.instagramUrl} target="_blank" rel="noreferrer" className="btn secondary sm">
                    Kunjungi Instagram Kami ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card alert info">
          <h4>💡 Informasi Pengantaran / Pickup</h4>
          <p className="small" style={{ margin: '6px 0 0' }}>
            Sistem kami tidak memiliki kurir internal otomatis. Anda dapat memesan kurir instan (Gojek / Grab / Maxim) mandiri setelah berkoordinasi via WhatsApp CS saat pesanan sudah berstatus <strong>Selesai (Siap Diambil)</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
