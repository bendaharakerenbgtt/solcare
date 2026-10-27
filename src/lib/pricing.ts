import type { OrderProductLine, OrderServiceLine, Service } from '../data/types';

export function computeTotal(services: Pick<OrderServiceLine, 'price'>[], products: Pick<OrderProductLine, 'subtotal'>[]): number {
  const s = services.reduce((a, l) => a + (Number(l.price) || 0), 0);
  const p = products.reduce((a, l) => a + (Number(l.subtotal) || 0), 0);
  return Math.round(s + p);
}

export function lineFromService(s: Service): OrderServiceLine {
  return {
    serviceId: s.id,
    name: s.name,
    category: s.category,
    price: s.priceMin,
    priceMin: s.priceMin,
    priceMax: s.priceMax,
    workloadWeight: s.workloadWeight,
    durationMinDays: s.durationMinDays,
    durationMaxDays: s.durationMaxDays,
    expressHours: s.expressHours,
  };
}

export interface Validation {
  errors: string[];
  warnings: string[];
}

/** Business validation for the service lines of an order draft. */
export function validateServiceLines(lines: OrderServiceLine[], catalog: Service[]): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byId = new Map(catalog.map((s) => [s.id, s]));

  if (!lines.length) errors.push('Pilih minimal satu layanan.');
  for (const l of lines) {
    if (!Number.isFinite(l.price) || l.price < 0) errors.push(`Harga "${l.name}" tidak valid.`);
    else if (l.priceMax != null && (l.price < l.priceMin || l.price > l.priceMax)) {
      warnings.push(`Harga "${l.name}" (${l.price}) di luar rentang katalog ${l.priceMin}–${l.priceMax}.`);
    } else if (l.priceMax == null && l.category !== 'express' && l.price !== l.priceMin) {
      warnings.push(`Harga "${l.name}" disesuaikan dari harga katalog ${l.priceMin}.`);
    }
  }

  const express = lines.filter((l) => l.category === 'express');
  if (express.length > 1) errors.push('Hanya boleh memilih satu layanan express.');
  if (express.length) {
    const bases = lines.filter((l) => l.category === 'main' || l.category === 'other');
    if (!bases.length) errors.push('Express harus dikombinasikan dengan layanan utama.');
    for (const b of bases) {
      const svc = b.serviceId ? byId.get(b.serviceId) : undefined;
      if (!svc?.expressEligible) errors.push(`Express tidak tersedia untuk "${b.name}". Express hanya untuk layanan yang ditandai boleh express (default: Basic Clean & Deep Clean).`);
    }
  }
  return { errors, warnings };
}
