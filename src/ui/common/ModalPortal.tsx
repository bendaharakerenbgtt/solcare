import React from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

/**
 * Merender overlay modal langsung sebagai anak <body>.
 *
 * Tanpa portal, `position: fixed` pada `.modal-backdrop` bisa terkurung oleh
 * ancestor ber-layout khusus (mis. kolom konten 480px pada halaman detail),
 * sehingga backdrop hanya menutupi kolom itu dan bukan seluruh viewport.
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};
