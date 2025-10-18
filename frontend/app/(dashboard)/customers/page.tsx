'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import { apiFetch } from '../../../lib/api';
import { useAuthedSWR } from '../../../lib/swr';
import type { Customer } from '../../../lib/types';

export default function CustomersPage() {
  const { role, token } = useAuth();
  const { data: customers, mutate } = useAuthedSWR<Customer[]>(role ? '/customers' : null, token);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);

  const canCreate = ['ADMIN', 'SALES', 'TECHNICIAN', 'FOREMAN'].includes(role ?? '');

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(form);
    const customerName = String(formData.get('customerName') ?? '').trim(); // FIX: extract name and trim it

    if (!customerName) { // FIX: check if name is empty
      setError('กรุณากรอกชื่อลูกค้า');
      return;
    }

    const payload = {
      customerName: customerName, // Use the extracted value
      address: toOptional(formData.get('address')),
      phone: toOptional(formData.get('phone')),
      email: toOptional(formData.get('email'))
    };

    try {
      await apiFetch<Customer>('/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
        token
      });
      form.reset();
      setCreateModalOpen(false);
      setFormResetKey((prev) => prev + 1);
      mutate();
      setSuccessMessage('เพิ่มลูกค้าเรียบร้อย');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถสร้างลูกค้าได้');
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
        <p className="text-sm text-slate-500">ข้อมูลจาก CustomerController: GET/POST /customers</p>
      </header>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {successMessage && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{successMessage}</div>
      )}

      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-semibold text-slate-900">รายชื่อลูกค้า</h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Customer ID</th>
                <th className="px-4 py-3">ชื่อ</th>
                <th className="px-4 py-3">เบอร์ติดต่อ</th>
                <th className="px-4 py-3">อีเมล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(customers ?? []).map((customer) => (
                <tr key={customer.customerId}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{customer.customerId}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{customer.customerName}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{customer.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{customer.email || '-'}</td>
                </tr>
              ))}
              {(customers?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-5 text-center text-sm text-slate-500">
                    ยังไม่มีข้อมูลลูกค้า
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
                <h2 className="text-lg font-semibold text-slate-900">เพิ่มลูกค้าใหม่</h2>
                <p className="text-sm text-slate-500">POST /customers เพื่อใช้ใน Order</p>
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
                เปิดฟอร์มเพิ่มลูกค้า
              </button>
            </div>
          </section>

          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
              <div className="w-full max-w-3xl space-y-6 rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">เพิ่มลูกค้าใหม่</h2>
                    <p className="text-sm text-slate-500">กรอกข้อมูลลูกค้าให้ครบถ้วนก่อนบันทึก</p>
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
                <form key={formResetKey} onSubmit={handleCreate} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">ชื่อลูกค้า</label>
                      <input name="customerName" required />
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
                      บันทึกลูกค้า
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
