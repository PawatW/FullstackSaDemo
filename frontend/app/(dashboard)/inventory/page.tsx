'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import { useAuthedSWR } from '../../../lib/swr';
import { apiFetch } from '../../../lib/api';
import type { Product } from '../../../lib/types';

export default function InventoryPage() {
  const { token, role } = useAuth();
  const { data: products, mutate, isLoading } = useAuthedSWR<Product[]>('/products', token, { refreshInterval: 30000 });
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<Record<string, boolean>>({});

  const canManage = role === 'WAREHOUSE' || role === 'ADMIN';

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!filter) return products;
    return products.filter((product) => product.productName.toLowerCase().includes(filter.toLowerCase()) || product.productId.toLowerCase().includes(filter.toLowerCase()));
  }, [products, filter]);

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      productName: formData.get('productName'),
      description: formData.get('description'),
      unit: formData.get('unit'),
      pricePerUnit: Number(formData.get('pricePerUnit')) || 0,
      supplierId: formData.get('supplierId'),
      quantity: Number(formData.get('quantity')) || 0,
      imageUrl: formData.get('imageUrl')
    };

    try {
      await apiFetch<Product>('/products', {
        method: 'POST',
        body: JSON.stringify(payload),
        token
      });
      event.currentTarget.reset();
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถสร้างสินค้าได้');
    }
  };

  const handleAdjust = async (productId: string, diff: number) => {
    if (!token || !diff) return;
    setAdjusting((prev) => ({ ...prev, [productId]: true }));
    setError(null);
    try {
      await apiFetch<void>(`/products/${productId}/adjust?diff=${diff}`, {
        method: 'PUT',
        token
      });
      mutate();
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

      <div className="card space-y-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <input
            type="search"
            placeholder="ค้นหาด้วยชื่อหรือรหัสสินค้า"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="w-full md:w-72"
          />
          <p className="text-xs text-slate-400">แสดง {filteredProducts.length} จาก {products?.length ?? 0} รายการ</p>
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
                          <button key={step} type="button" className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200" disabled={adjusting[product.productId]} onClick={() => handleAdjust(product.productId, step)}>
                            +{step}
                          </button>
                        ))}
                        {[1, 5, 10].map((step) => (
                          <button key={`minus-${step}`} type="button" className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200" disabled={adjusting[product.productId]} onClick={() => handleAdjust(product.productId, -step)}>
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
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleCreateProduct} className="card space-y-4 p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">เพิ่มสินค้าใหม่</h2>
              <p className="text-sm text-slate-500">เรียกใช้งาน API POST /products</p>
            </div>
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
                <label className="block text-xs font-medium text-slate-500">Supplier ID</label>
                <input name="supplierId" placeholder="เช่น SUP-001" />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500">Image URL</label>
                <input name="imageUrl" placeholder="https://..." />
              </div>
            </div>
            <button type="submit" className="w-full md:w-auto">
              บันทึกสินค้า
            </button>
          </form>

          <div className="card space-y-4 p-6">
            <h2 className="text-lg font-semibold text-slate-900">คำแนะนำจาก Use Case</h2>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>• ใช้หน้าจอนี้เพื่อดูจำนวนสินค้าปัจจุบันก่อนการเบิก</li>
              <li>• Warehouse สามารถกดปุ่มเพิ่ม/ลดเพื่อปรับยอดตามธุรกรรม Stock-In หรือ Fulfillment</li>
              <li>• สำหรับ Stock-In พร้อมรายละเอียด supplier ให้ไปที่หน้า “Stock Ops”</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
