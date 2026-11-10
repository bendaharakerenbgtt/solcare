import React, { useState } from 'react';

interface MapsPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (address: string) => void;
  initialAddress?: string;
}

export const MapsPickerModal: React.FC<MapsPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectAddress,
  initialAddress = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [selectedAddr, setSelectedAddr] = useState(
    initialAddress || 'Jl. Mampang Prapatan Raya No. 12, Jakarta Selatan'
  );
  const [lat, setLat] = useState(-6.2382);
  const [lng, setLng] = useState(106.8286);
  const [locating, setLocating] = useState(false);

  if (!isOpen) return null;

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung deteksi lokasi otomatis (GPS).');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        const autoAddr = `Lokasi GPS: Lat ${pos.coords.latitude.toFixed(5)}, Lng ${pos.coords.longitude.toFixed(5)}`;
        setSelectedAddr(autoAddr);
        setSearchQuery(autoAddr);
        setLocating(false);
      },
      (err) => {
        alert('Gagal mendeteksi lokasi GPS: ' + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (!selectedAddr.trim()) {
      alert('Silakan tentukan titik alamat.');
      return;
    }
    onSelectAddress(selectedAddr);
    onClose();
  };

  const mapBbox = `${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}`;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${mapBbox}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 120 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          borderRadius: '20px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📍</span>
            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>Pilih Titik Lokasi Alamat</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.2rem',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Cari jalan, patokan, atau kelurahan..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedAddr(e.target.value);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
              }}
            />
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={locating}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Gunakan GPS perangkat"
            >
              {locating ? 'Mendeteksi...' : '🎯 GPS'}
            </button>
          </div>
        </div>

        {/* Interactive OpenStreetMap View with Center Pin */}
        <div style={{ position: 'relative', width: '100%', height: '240px', background: '#e2e8f0' }}>
          <iframe
            title="Peta Lokasi"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            src={mapSrc}
            style={{ border: 0 }}
          />

          {/* Center Pin overlay */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              fontSize: '2rem',
              filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))',
            }}
          >
            📍
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              right: '8px',
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(4px)',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.74rem',
              color: '#334155',
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
          >
            Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}
          </div>
        </div>

        {/* Address Detail Input & Confirm */}
        <div style={{ padding: '16px 20px', background: '#ffffff' }} className="stack">
          <label className="field">
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
              Detail Alamat Terpilih
            </span>
            <textarea
              rows={2}
              value={selectedAddr}
              onChange={(e) => setSelectedAddr(e.target.value)}
              placeholder="Nomor rumah, RT/RW, nama jalan, patokan lokasi..."
              style={{
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                padding: '10px 12px',
                fontSize: '0.88rem',
              }}
            />
          </label>

          <button
            type="button"
            onClick={handleConfirm}
            style={{
              width: '100%',
              background: '#001b3a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '0.94rem',
              fontWeight: 800,
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            PILIH LOKASI INI
          </button>
        </div>
      </div>
    </div>
  );
};
