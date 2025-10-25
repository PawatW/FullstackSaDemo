'use client';

import { FormEvent, useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthContext';
import { apiFetch } from '../../../lib/api';
import { useAuthedSWR } from '../../../lib/swr';
import type { Customer } from '../../../lib/types';

const toOptional = (value: FormDataEntryValue | null): string | null => {
  const raw = typeof value === 'string' ? value : value ? String(value) : '';
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
};

export default function CustomersPage() {
  const { role, token } = useAuth();
  const { data: customers, mutate } = useAuthedSWR<Customer[]>(role ? '/customers' : null, token);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [customerSearch, setCustomerSearch] = useState('');
  const [inspectedCustomerId, setInspectedCustomerId] = useState<string | null>(null);
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editFormResetKey, setEditFormResetKey] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const canCreate = role === 'SALES';

  const filteredCustomers = useMemo(() => {
    const data = customers ?? [];
    const query = customerSearch.trim().toLowerCase();
    if (!query) {
      return data;
    }
    return data.filter((customer) => {
      const haystack = [
        customer.customerId,
        customer.customerName,
        customer.phone ?? '',
        customer.email ?? '',
        customer.address ?? ''
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [customers, customerSearch]);

  const inspectedCustomer = useMemo(() => {
    if (!inspectedCustomerId) {
      return null;
    }
    return (customers ?? []).find((customer) => customer.customerId === inspectedCustomerId) ?? null;
  }, [customers, inspectedCustomerId]);

  const editingCustomer = useMemo(() => {
    if (!editingCustomerId) {
      return null;
    }
    return (customers ?? []).find((customer) => customer.customerId === editingCustomerId) ?? null;
  }, [customers, editingCustomerId]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(form);
    const customerName = String(formData.get('customerName') ?? '').trim();

    if (!customerName) {
      setError('กรุณากรอกชื่อลูกค้า');
      return;
    }

    const payload = {
      customerName,
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

  const handleInspectCustomer = (customerId: string) => {
    if (inspectedCustomerId === customerId) {
      setInspectedCustomerId(null);
      setDetailModalOpen(false);
      return;
    }
    setInspectedCustomerId(customerId);
    setDetailModalOpen(true);
  };

  const handleOpenEditCustomer = (customerId: string) => {
    setEditingCustomerId(customerId);
    setEditModalOpen(true);
    setError(null);
    setSuccessMessage(null);
    setEditFormResetKey((prev) => prev + 1);
  };

  const handleCloseEditCustomer = () => {
    setEditModalOpen(false);
    setEditingCustomerId(null);
    setEditFormResetKey((prev) => prev + 1);
    setIsUpdating(false);
  };

  const handleUpdateCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !editingCustomerId) return;

    const formData = new FormData(event.currentTarget);
    const customerName = String(formData.get('customerName') ?? '').trim();

    if (!customerName) {
      setError('กรุณากรอกชื่อลูกค้า');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsUpdating(true);

    const payload = {
      customerName,
      address: toOptional(formData.get('address')),
      phone: toOptional(formData.get('phone')),
      email: toOptional(formData.get('email'))
    };

    try {
      await apiFetch<Customer>(`/customers/${editingCustomerId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        token
      });
      setSuccessMessage('อัปเดตข้อมูลลูกค้าเรียบร้อย');
      handleCloseEditCustomer();
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถอัปเดตลูกค้าได้');
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (inspectedCustomerId && !(customers ?? []).some((customer) => customer.customerId === inspectedCustomerId)) {
      setInspectedCustomerId(null);
      setDetailModalOpen(false);
    }
  }, [customers, inspectedCustomerId]);

  useEffect(() => {
    if (editingCustomerId && !(customers ?? []).some((customer) => customer.customerId === editingCustomerId)) {
      setEditModalOpen(false);
      setEditingCustomerId(null);
      setEditFormResetKey((prev) => prev + 1);
      setIsUpdating(false);
    }
  }, [customers, editingCustomerId]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
      </header>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {successMessage && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{successMessage}</div>
      )}

      <section className="card space-y-4 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">รายชื่อลูกค้า</h2>
            <p className="text-sm text-slate-500">ค้นหาและตรวจสอบข้อมูลลูกค้าทั้งหมดจากระบบ</p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
            <input
              type="search"
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
              placeholder="ค้นหาด้วยชื่อ รหัสลูกค้า เบอร์ หรืออีเมล"
              className="w-full md:w-80"
            />
            <p className="text-xs text-slate-400">
              แสดง {filteredCustomers.length} จาก {customers?.length ?? 0} รายการ
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Customer ID</th>
                <th className="px-4 py-3">ชื่อ</th>
                <th className="px-4 py-3">เบอร์ติดต่อ</th>
                <th className="px-4 py-3">อีเมล</th>
                <th className="px-4 py-3">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {customers === undefined ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                    กำลังโหลดข้อมูลลูกค้า...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    {(customers?.length ?? 0) === 0 ? 'ยังไม่มีข้อมูลลูกค้า' : 'ไม่พบลูกค้าที่ตรงกับคำค้นหา'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const isSelected = inspectedCustomerId === customer.customerId;
                  return (
                    <tr
                      key={customer.customerId}
                      className={`hover:bg-slate-50/60 ${isSelected ? 'bg-primary-50/60' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{customer.customerId}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{customer.customerName}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{customer.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{customer.email || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleInspectCustomer(customer.customerId)}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-primary-600 transition hover:border-primary-200 hover:bg-primary-50"
                          >
                            {isSelected ? 'ซ่อน' : 'ดูรายละเอียด'}
                          </button>
                          {canCreate && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditCustomer(customer.customerId)}
                              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              แก้ไข
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isDetailModalOpen && inspectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">รายละเอียดลูกค้า</h2>
                  <p className="text-sm text-slate-500">
                    {inspectedCustomer.customerId} • {inspectedCustomer.customerName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    setInspectedCustomerId(null);
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  ปิด
                </button>
              </div>
              <div className="mt-6 space-y-4 text-sm text-slate-600">
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-slate-600">เบอร์ติดต่อ</p>
                    <p className="mt-1 text-slate-800">{inspectedCustomer.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">อีเมล</p>
                    <p className="mt-1 text-slate-800">{inspectedCustomer.email || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="font-semibold text-slate-600">ที่อยู่</p>
                    <p className="mt-1 text-slate-800">{inspectedCustomer.address || 'ไม่ระบุที่อยู่'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
              <div className="max-h-[85vh] overflow-y-auto p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">แก้ไขข้อมูลลูกค้า</h2>
                    <p className="text-sm text-slate-500">
                      {editingCustomer.customerId} • {editingCustomer.customerName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseEditCustomer}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    ปิด
                  </button>
                </div>
                <form key={editFormResetKey} onSubmit={handleUpdateCustomer} className="mt-6 space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">ชื่อลูกค้า</label>
                      <input name="customerName" defaultValue={editingCustomer.customerName} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">เบอร์โทร</label>
                      <input name="phone" defaultValue={editingCustomer.phone ?? ''} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">อีเมล</label>
                      <input name="email" type="email" defaultValue={editingCustomer.email ?? ''} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-medium text-slate-500">ที่อยู่</label>
                      <textarea name="address" rows={3} defaultValue={editingCustomer.address ?? ''} />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseEditCustomer}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {isUpdating ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {canCreate && (
        <>
          <section className="card space-y-4 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">เพิ่มลูกค้าใหม่</h2>
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
                เพิ่มลูกค้าใหม่
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
                    <form key={formResetKey} onSubmit={handleCreate} className="mt-6 space-y-6">
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
            </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
