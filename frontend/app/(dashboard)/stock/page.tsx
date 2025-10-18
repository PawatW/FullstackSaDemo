'use client';

import { FormEvent, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../../components/AuthContext';
import { apiFetch } from '../../../lib/api';
import { useAuthedSWR } from '../../../lib/swr';
import type { Product, StockTransaction, Supplier } from '../../../lib/types';

export default function StockPage() {
  const { role, token } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStockInModalOpen, setStockInModalOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);

  const { data: products } = useAuthedSWR<Product[]>(role ? '/products' : null, token);
  const { data: suppliers } = useAuthedSWR<Supplier[]>(role ? '/suppliers' : null, token);
  const { data: transactions, mutate } = useAuthedSWR<StockTransaction[]>(role === 'ADMIN' ? '/stock/transactions' : null, token, {
    refreshInterval: 30000
  });

  const canStockIn = role === 'WAREHOUSE' || role === 'ADMIN';

  const handleStockIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      productId: formData.get('productId'),
      quantity: Number(formData.get('quantity') || 0),
      supplierId: formData.get('supplierId'),
      note: formData.get('note')
    };

    try {
      await apiFetch<void>('/stock/in', {
        method: 'POST',
        body: JSON.stringify(payload),
        token
      });
      setMessage('บันทึกสินค้าเข้าเรียบร้อย');
      event.currentTarget.reset();
      setStockInModalOpen(false);
      setFormResetKey((prev) => prev + 1);
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกสินค้าเข้าได้');
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Stock Operations</h1>
        <p className="text-sm text-slate-500">อ้างอิง StockController: /stock/in, /stock/approved-requests, /stock/transactions</p>
      </header>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {message && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{message}</div>}

      {canStockIn && (
        <>
          <section className="card space-y-4 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">บันทึกสินค้าเข้า (Stock-In)</h2>
                <p className="text-sm text-slate-500">POST /stock/in พร้อม Supplier reference</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMessage(null);
                  setStockInModalOpen(true);
                  setFormResetKey((prev) => prev + 1);
                }}
                className="w-full rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white md:w-auto"
              >
                เปิดฟอร์ม Stock-In
              </button>
            </div>
          </section>

          {isStockInModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
              <div className="w-full max-w-3xl space-y-6 rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">บันทึกสินค้าเข้า (Stock-In)</h2>
                    <p className="text-sm text-slate-500">เลือกสินค้าและระบุจำนวนก่อนยืนยัน</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStockInModalOpen(false);
                      setFormResetKey((prev) => prev + 1);
                    }}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    ปิด
                  </button>
                </div>
                <form key={formResetKey} onSubmit={handleStockIn} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-medium text-slate-500">สินค้า</label>
                      <select name="productId" required>
                        <option value="">เลือกสินค้า</option>
                        {(products ?? []).map((product) => (
                          <option key={product.productId} value={product.productId}>
                            {product.productName} ({product.productId})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">จำนวน</label>
                      <input name="quantity" type="number" min={1} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">Supplier</label>
                      <select name="supplierId">
                        <option value="">เลือก Supplier</option>
                        {(suppliers ?? []).map((supplier) => (
                          <option key={supplier.supplierId} value={supplier.supplierId}>
                            {supplier.supplierName} ({supplier.supplierId})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-medium text-slate-500">หมายเหตุ</label>
                      <textarea name="note" rows={3} placeholder="อ้างอิงใบส่งของหรือข้อมูลขนส่ง" />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStockInModalOpen(false);
                        setFormResetKey((prev) => prev + 1);
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                    >
                      ยกเลิก
                    </button>
                    <button type="submit" className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white">
                      บันทึก
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {role === 'ADMIN' && transactions && (
        <section className="card space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">ประวัติธุรกรรมสต็อก</h2>
            <p className="text-sm text-slate-500">ข้อมูลจาก GET /stock/transactions</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Transaction</th>
                  <th className="px-4 py-3">วันที่</th>
                  <th className="px-4 py-3">ประเภท</th>
                  <th className="px-4 py-3">สินค้า</th>
                  <th className="px-4 py-3">จำนวน</th>
                  <th className="px-4 py-3">ผู้ทำรายการ</th>
                  <th className="px-4 py-3">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {transactions.map((transaction) => (
                  <tr key={transaction.transactionId}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{transaction.transactionId}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{format(new Date(transaction.transactionDate), 'dd MMM yyyy HH:mm')}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{transaction.type}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{transaction.productId}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{transaction.quantity}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{transaction.staffId}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{transaction.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
