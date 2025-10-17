'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import { apiFetch } from '../../../lib/api';
import { useAuthedSWR } from '../../../lib/swr';
import type { Supplier } from '../../../lib/types';

export default function SuppliersPage() {
  const { role, token } = useAuth();
  const { data: suppliers, mutate } = useAuthedSWR<Supplier[]>(role ? '/suppliers' : null, token);
  const [error, setError] = useState<string | null>(null);

  const canCreate = role === 'WAREHOUSE' || role === 'ADMIN';

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      supplierName: formData.get('supplierName'),
      address: formData.get('address'),
      phone: formData.get('phone'),
      email: formData.get('email')
    };

    try {
      await apiFetch<Supplier>('/suppliers', {
        method: 'POST',
        body: JSON.stringify(payload),
        token
      });
      event.currentTarget.reset();
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถเพิ่ม Supplier ได้');
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Suppliers</h1>
        <p className="text-sm text-slate-500">ข้อมูลจาก SupplierController: GET/POST /suppliers</p>
      </header>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-semibold text-slate-900">รายชื่อ Supplier</h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Supplier ID</th>
                <th className="px-4 py-3">ชื่อบริษัท</th>
                <th className="px-4 py-3">เบอร์ติดต่อ</th>
                <th className="px-4 py-3">อีเมล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(suppliers ?? []).map((supplier) => (
                <tr key={supplier.supplierId}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{supplier.supplierId}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{supplier.supplierName}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{supplier.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{supplier.email || '-'}</td>
                </tr>
              ))}
              {(suppliers?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-5 text-center text-sm text-slate-500">
                    ยังไม่มีข้อมูล Supplier
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {canCreate && (
        <form onSubmit={handleCreate} className="card space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">เพิ่ม Supplier</h2>
            <p className="text-sm text-slate-500">POST /suppliers เพื่อรองรับการบันทึก Stock-In</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500">ชื่อบริษัท</label>
              <input name="supplierName" required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500">เบอร์โทร</label>
              <input name="phone" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500">อีเมล</label>
              <input name="email" type="email" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-medium text-slate-500">ที่อยู่</label>
              <textarea name="address" rows={3} />
            </div>
          </div>
          <button type="submit" className="w-full md:w-auto">
            บันทึก Supplier
          </button>
        </form>
      )}
    </div>
  );
}
