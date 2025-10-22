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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);

  const canCreate = role === 'SALES';

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(form);
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
      form.reset();
      setCreateModalOpen(false);
      setFormResetKey((prev) => prev + 1);
      mutate();
      setSuccessMessage('เพิ่ม Supplier เรียบร้อย');
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
      {successMessage && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{successMessage}</div>
      )}

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
        <>
          <section className="card space-y-4 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">เพิ่ม Supplier</h2>
                <p className="text-sm text-slate-500">POST /suppliers เพื่อรองรับการบันทึก Stock-In</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setCreateModalOpen(true);
                  setFormResetKey((prev) => prev + 1);
                }}
                className="w-full rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white md:w-auto"
              >
                เปิดฟอร์มเพิ่ม Supplier
              </button>
            </div>
          </section>

          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60">
              <div className="flex min-h-full items-center justify-center p-4">
                <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
                  <div className="max-h-[85vh] overflow-y-auto p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">เพิ่ม Supplier</h2>
                        <p className="text-sm text-slate-500">ระบุข้อมูลบริษัทให้ครบถ้วนเพื่อใช้อ้างอิงใน Stock-In</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateModalOpen(false);
                          setSuccessMessage(null);
                          setFormResetKey((prev) => prev + 1);
                        }}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                      >
                        ปิด
                      </button>
                    </div>
                    <form key={formResetKey} onSubmit={handleCreate} className="mt-6 space-y-6">
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
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setCreateModalOpen(false);
                          setSuccessMessage(null);
                          setFormResetKey((prev) => prev + 1);
                        }}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                      >
                        ยกเลิก
                      </button>
                      <button type="submit" className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white">
                        บันทึก Supplier
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}
