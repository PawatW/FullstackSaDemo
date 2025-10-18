'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import { useAuthedSWR } from '../../../lib/swr';
import { apiFetch } from '../../../lib/api';
import type { Product, Supplier } from '../../../lib/types';

export default function InventoryPage() {
  const { token, role } = useAuth();
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<Record<string, boolean>>({});
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);

  const canManage = role === 'WAREHOUSE' || role === 'ADMIN';
  const { data: suppliers } = useAuthedSWR<Supplier[]>(canManage ? '/suppliers' : null, token);
  const { data: products, mutate, isLoading } = useAuthedSWR<Product[]>('/products', token, { refreshInterval: 30000 });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!filter) return products;
    return products.filter(
      (product) =>
        product.productName.toLowerCase().includes(filter.toLowerCase()) ||
        product.productId.toLowerCase().includes(filter.toLowerCase())
    );
  }, [products, filter]);

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    setError(null);
    setSuccessMessage(null);
    const formData = new FormData(event.currentTarget);
    const productName = String(formData.get('productName') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const unit = String(formData.get('unit') ?? '').trim();
    const supplierId = String(formData.get('supplierId') ?? '').trim();
    const imageUrl = String(formData.get('imageUrl') ?? '').trim();

    const quantityRaw = formData.get('quantity');
    const quantity = quantityRaw === null || quantityRaw === '' ? 0 : Number(quantityRaw);
    if (Number.isNaN(quantity) || quantity < 0) {
      setError('จำนวนสินค้าไม่ถูกต้อง');
      return;
    }

    const priceRaw = formData.get('pricePerUnit');
    const pricePerUnit = priceRaw === null || priceRaw === '' ? undefined : Number(priceRaw);
    if (pricePerUnit !== undefined && Number.isNaN(pricePerUnit)) {
      setError('ราคา/หน่วยไม่ถูกต้อง');
      return;
    }

    if (!productName) {
      setError('กรุณากรอกชื่อสินค้า');
      return;
    }

    const payload = {
      productName,
      description: description || undefined,
      unit: unit || undefined,
      pricePerUnit,
      supplierId: supplierId || undefined,
      quantity,
      imageUrl: imageUrl || undefined
    };

    try {
      await apiFetch<Product>('/products', {
        method: 'POST',
        body: JSON.stringify(payload),
        token
      });
      form.reset();
      setCreateModalOpen(false);
      setFormResetKey((prev) => prev + 1);
      mutate();
      setSuccessMessage('เพิ่มสินค้าเรียบร้อย');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถสร้างสินค้าได้');
    }
  };

  const handleAdjust = async (productId: string, diff: number) => {
    if (!token || !diff) return;
    setAdjusting((prev) => ({ ...prev, [productId]: true }));
    setError(null);
    setSuccessMessage(null);
    try {
      await apiFetch<void>(`/products/${productId}/adjust?diff=${diff}`, {
        method: 'PUT',
        token
      });
      mutate();
      setSuccessMessage('ปรับสต็อกเรียบร้อย');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถปรับสต็อกได้');
    } finally {
      setAdjusting((prev) => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
        <p className="text-sm text-slate-500">ดึงข้อมูลจาก /products และรองรับการสร้างสินค้าใหม่ / ปรับสต็อกตาม Use Case</p>
      </header>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {successMessage && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{successMessage}</div>
      )}

      <div className="card space-y-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <input
            type="search"
            placeholder="ค้นหาด้วยชื่อหรือรหัสสินค้า"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="w-full md:w-72"
          />
          <div className="flex flex-col items-start gap-2 md:items-end">
            {canManage && (
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
                เปิดฟอร์มเพิ่มสินค้า
              </button>
            )}
            <p className="text-xs text-slate-400">แสดง {filteredProducts.length} จาก {products?.length ?? 0} รายการ</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">รหัสสินค้า</th>
                <th className="px-4 py-3">ชื่อสินค้า</th>
                <th className="px-4 py-3">คงเหลือ</th>
                <th className="px-4 py-3">หน่วย</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">ราคา/หน่วย</th>
                {canManage && <th className="px-4 py-3 text-right">ปรับสต็อก</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading && (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-4 py-6 text-center text-sm text-slate-400">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              )}
              {!isLoading && filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-4 py-6 text-center text-sm text-slate-400">
                    ไม่พบสินค้า
                  </td>
                </tr>
              )}
              {filteredProducts.map((product) => (
                <tr key={product.productId} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.productId}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{product.productName}</p>
                    {product.description && <p className="text-xs text-slate-500">{product.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">{product.quantity}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{product.unit || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{product.supplierId || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {product.pricePerUnit !== undefined && product.pricePerUnit !== null
                      ? Number(product.pricePerUnit).toLocaleString(undefined, { minimumFractionDigits: 2 })
                      : '-'}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right text-xs">
                      <div className="flex items-center justify-end gap-2">
                        {[1, 5, 10].map((step) => (
                          <button
                            key={step}
                            type="button"
                            className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
                            disabled={adjusting[product.productId]}
                            onClick={() => handleAdjust(product.productId, step)}
                          >
                            +{step}
                          </button>
                        ))}
                        {[1, 5, 10].map((step) => (
                          <button
                            key={`minus-${step}`}
                            type="button"
                            className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                            disabled={adjusting[product.productId]}
                            onClick={() => handleAdjust(product.productId, -step)}
                          >
                            -{step}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canManage && (
        <section className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-900">คำแนะนำจาก Use Case</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li>• ใช้หน้าจอนี้เพื่อดูจำนวนสินค้าปัจจุบันก่อนการเบิก</li>
            <li>• Warehouse สามารถกดปุ่มเพิ่ม/ลดเพื่อปรับยอดตามธุรกรรม Stock-In หรือ Fulfillment</li>
            <li>• สำหรับ Stock-In พร้อมรายละเอียด supplier ให้ไปที่หน้า “Stock Ops”</li>
          </ul>
        </section>
      )}

      {canManage && isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl">
              <div className="max-h-[85vh] overflow-y-auto p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">เพิ่มสินค้าใหม่</h2>
                    <p className="text-sm text-slate-500">กรอกข้อมูลสินค้าเพื่อเรียกใช้งาน POST /products</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(false);
                      setFormResetKey((prev) => prev + 1);
                    }}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    ปิด
                  </button>
                </div>
                <form key={formResetKey} onSubmit={handleCreateProduct} className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500">ชื่อสินค้า</label>
                  <input name="productName" required placeholder="เช่น สายไฟ 2x2.5" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500">จำนวนเริ่มต้น</label>
                  <input name="quantity" type="number" min="0" defaultValue={0} />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500">หน่วย</label>
                  <input name="unit" placeholder="ม้วน / ชิ้น / กล่อง" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500">ราคา/หน่วย</label>
                  <input name="pricePerUnit" type="number" min="0" step="0.01" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500">คำอธิบาย</label>
                  <textarea name="description" rows={3} placeholder="ระบุรายละเอียดสินค้าเพิ่มเติม" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500">Supplier</label>
                  {suppliers && suppliers.length > 0 ? (
                    <select name="supplierId" defaultValue="" className="w-full">
                      <option value="">เลือก Supplier (ไม่บังคับ)</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.supplierId} value={supplier.supplierId}>
                          {supplier.supplierName} ({supplier.supplierId})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input name="supplierId" placeholder="เช่น SUP-001" />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500">Image URL</label>
                  <input name="imageUrl" placeholder="https://..." />
                </div>
              </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(false);
                      setFormResetKey((prev) => prev + 1);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white">
                    บันทึกสินค้า
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
