'use client';

import { FormEvent, useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthContext';
import { apiFetch } from '../../../lib/api';
import { useAuthedSWR } from '../../../lib/swr';
import type { Supplier } from '../../../lib/types';

const toOptional = (value: FormDataEntryValue | null): string | null => {
  const raw = typeof value === 'string' ? value : value ? String(value) : '';
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
};

export default function SuppliersPage() {
  const { role, token } = useAuth();
  const { data: suppliers, mutate } = useAuthedSWR<Supplier[]>(role ? '/suppliers' : null, token);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [inspectedSupplierId, setInspectedSupplierId] = useState<string | null>(null);
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [editFormResetKey, setEditFormResetKey] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);


  const canCreate = role === 'SALES';

  const filteredSuppliers = useMemo(() => {
    const data = suppliers ?? [];
    const query = supplierSearch.trim().toLowerCase();
    if (!query) {
      return data;
    }
    return data.filter((supplier) => {
      const haystack = [
        supplier.supplierId,
        supplier.supplierName,
        supplier.phone ?? '',
        supplier.email ?? '',
        supplier.address ?? ''
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [suppliers, supplierSearch]);

  const inspectedSupplier = useMemo(() => {
    if (!inspectedSupplierId) {
      return null;
    }
    return (suppliers ?? []).find((supplier) => supplier.supplierId === inspectedSupplierId) ?? null;
  }, [suppliers, inspectedSupplierId]);

  const editingSupplier = useMemo(() => {
    if (!editingSupplierId) {
      return null;
    }
    return (suppliers ?? []).find((supplier) => supplier.supplierId === editingSupplierId) ?? null;
  }, [suppliers, editingSupplierId]);

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

  const handleInspectSupplier = (supplierId: string) => {
    if (inspectedSupplierId === supplierId) {
      setInspectedSupplierId(null);
      setDetailModalOpen(false);
      return;
    }
    setInspectedSupplierId(supplierId);
    setDetailModalOpen(true);
  };

  const handleOpenEditSupplier = (supplierId: string) => {
    setEditingSupplierId(supplierId);
    setEditModalOpen(true);
    setError(null);
    setSuccessMessage(null);
    setEditFormResetKey((prev) => prev + 1);
  };

  const handleCloseEditSupplier = () => {
    setEditModalOpen(false);
    setEditingSupplierId(null);
    setEditFormResetKey((prev) => prev + 1);
    setIsUpdating(false);
  };

  const handleUpdateSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !editingSupplierId) return;

    const formData = new FormData(event.currentTarget);
    const supplierName = String(formData.get('supplierName') ?? '').trim();

    if (!supplierName) {
      setError('กรุณากรอกชื่อ Supplier');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsUpdating(true);

    const payload = {
      supplierName,
      address: toOptional(formData.get('address')),
      phone: toOptional(formData.get('phone')),
      email: toOptional(formData.get('email'))
    };

    try {
      await apiFetch<Supplier>(`/suppliers/${editingSupplierId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        token
      });
      setSuccessMessage('อัปเดตข้อมูล Supplier เรียบร้อย');
      handleCloseEditSupplier();
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถอัปเดต Supplier ได้');
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (inspectedSupplierId && !(suppliers ?? []).some((supplier) => supplier.supplierId === inspectedSupplierId)) {
      setInspectedSupplierId(null);
      setDetailModalOpen(false);
    }
  }, [suppliers, inspectedSupplierId]);

  useEffect(() => {
    if (editingSupplierId && !(suppliers ?? []).some((supplier) => supplier.supplierId === editingSupplierId)) {
      setEditModalOpen(false);
      setEditingSupplierId(null);
      setEditFormResetKey((prev) => prev + 1);
      setIsUpdating(false);
    }
  }, [suppliers, editingSupplierId]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Suppliers</h1>
      </header>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {successMessage && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{successMessage}</div>
      )}

      <section className="card space-y-4 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">รายชื่อ Supplier</h2>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
            <input
              type="search"
              value={supplierSearch}
              onChange={(event) => setSupplierSearch(event.target.value)}
              placeholder="ค้นหาด้วยชื่อบริษัท รหัส เบอร์โทร หรืออีเมล"
              className="w-full md:w-80"
            />
            <p className="text-xs text-slate-400">
              แสดง {filteredSuppliers.length} จาก {suppliers?.length ?? 0} รายการ
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Supplier ID</th>
                <th className="px-4 py-3">ชื่อบริษัท</th>
                <th className="px-4 py-3">เบอร์ติดต่อ</th>
                <th className="px-4 py-3">อีเมล</th>
                <th className="px-4 py-3">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {suppliers === undefined ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                    กำลังโหลดข้อมูล Supplier...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    {(suppliers?.length ?? 0) === 0 ? 'ยังไม่มีข้อมูล Supplier' : 'ไม่พบ Supplier ที่ตรงกับคำค้นหา'}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const isSelected = inspectedSupplierId === supplier.supplierId;
                  return (
                    <tr
                      key={supplier.supplierId}
                      className={`hover:bg-slate-50/60 ${isSelected ? 'bg-primary-50/60' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{supplier.supplierId}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{supplier.supplierName}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{supplier.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{supplier.email || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleInspectSupplier(supplier.supplierId)}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-primary-600 transition hover:border-primary-200 hover:bg-primary-50"
                          >
                            {isSelected ? 'ซ่อน' : 'ดูรายละเอียด'}
                          </button>
                          {canCreate && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditSupplier(supplier.supplierId)}
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

      {isDetailModalOpen && inspectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">รายละเอียด Supplier</h2>
                  <p className="text-sm text-slate-500">
                    {inspectedSupplier.supplierId} • {inspectedSupplier.supplierName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    setInspectedSupplierId(null);
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
                    <p className="mt-1 text-slate-800">{inspectedSupplier.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">อีเมล</p>
                    <p className="mt-1 text-slate-800">{inspectedSupplier.email || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="font-semibold text-slate-600">ที่อยู่</p>
                    <p className="mt-1 text-slate-800">{inspectedSupplier.address || 'ไม่ระบุที่อยู่'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingSupplier && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
              <div className="max-h-[85vh] overflow-y-auto p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">แก้ไขข้อมูล Supplier</h2>
                    <p className="text-sm text-slate-500">
                      {editingSupplier.supplierId} • {editingSupplier.supplierName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseEditSupplier}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    ปิด
                  </button>
                </div>
                <form key={editFormResetKey} onSubmit={handleUpdateSupplier} className="mt-6 space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">ชื่อบริษัท</label>
                      <input name="supplierName" defaultValue={editingSupplier.supplierName} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">เบอร์โทร</label>
                      <input name="phone" defaultValue={editingSupplier.phone ?? ''} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">อีเมล</label>
                      <input name="email" type="email" defaultValue={editingSupplier.email ?? ''} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-medium text-slate-500">ที่อยู่</label>
                      <textarea name="address" rows={3} defaultValue={editingSupplier.address ?? ''} />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseEditSupplier}
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
                <h2 className="text-lg font-semibold text-slate-900">เพิ่ม Supplier</h2>
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
                เพิ่ม Supplier ใหม่
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
