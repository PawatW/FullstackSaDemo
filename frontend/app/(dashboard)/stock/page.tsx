'use client';

import { FormEvent, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../../components/AuthContext';
import { apiFetch } from '../../../lib/api';
import { useAuthedSWR } from '../../../lib/swr';
import type { Product, StockTransaction, Supplier } from '../../../lib/types';
import { SearchableSelect, type SearchableOption } from '../../../components/SearchableSelect';

export default function StockPage() {
  const { role, token } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStockInModalOpen, setStockInModalOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [transactionSearch, setTransactionSearch] = useState('');
  const [inspectedTransactionId, setInspectedTransactionId] = useState<string | null>(null);
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);

  const { data: products } = useAuthedSWR<Product[]>(role ? '/products' : null, token);
  const { data: suppliers } = useAuthedSWR<Supplier[]>(role ? '/suppliers' : null, token);
  const { data: transactions, mutate } = useAuthedSWR<StockTransaction[]>(
    role === 'WAREHOUSE' || role === 'ADMIN' ? '/stock/transactions' : null,
    token,
    {
      refreshInterval: 30000
    }
  );

  const canStockIn = role === 'WAREHOUSE' || role === 'ADMIN';
  const canViewTransactions = role === 'WAREHOUSE' || role === 'ADMIN';

  const productOptions = useMemo<SearchableOption[]>(() => {
    return (products ?? []).map((product) => ({
      value: product.productId,
      label: `${product.productName} (${product.productId})`,
      description: [product.unit, product.supplierId ? `Supplier: ${product.supplierId}` : null]
        .filter(Boolean)
        .join(' • ') || undefined,
      keywords: [product.productName, product.productId, product.unit ?? '', product.supplierId ?? '', product.description ?? '']
    }));
  }, [products]);

  const supplierOptions = useMemo<SearchableOption[]>(() => {
    return (suppliers ?? []).map((supplier) => ({
      value: supplier.supplierId,
      label: `${supplier.supplierName} (${supplier.supplierId})`,
      description: [supplier.phone, supplier.email].filter(Boolean).join(' • ') || undefined,
      keywords: [supplier.supplierName, supplier.supplierId, supplier.phone ?? '', supplier.email ?? '', supplier.address ?? '']
    }));
  }, [suppliers]);

  const sortedTransactions = useMemo(() => {
    const data = transactions ?? [];
    return [...data].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const query = transactionSearch.trim().toLowerCase();
    if (!query) {
      return sortedTransactions;
    }
    return sortedTransactions.filter((transaction) => {
      const haystack = [
        transaction.transactionId,
        transaction.productId,
        transaction.staffId,
        transaction.type,
        transaction.description ?? ''
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [sortedTransactions, transactionSearch]);

  const inspectedTransaction = useMemo(() => {
    if (!inspectedTransactionId) {
      return null;
    }
    return sortedTransactions.find((transaction) => transaction.transactionId === inspectedTransactionId) ?? null;
  }, [sortedTransactions, inspectedTransactionId]);

  const handleStockIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    setError(null);
    setMessage(null);

    const formData = new FormData(form);
    const productId = String(formData.get('productId') ?? '').trim();
    const quantityRaw = formData.get('quantity');
    const quantity = quantityRaw === null || quantityRaw === '' ? 0 : Number(quantityRaw);
    const supplierId = String(formData.get('supplierId') ?? '').trim();
    const note = String(formData.get('note') ?? '');

    if (!productId) {
      setError('กรุณาเลือกสินค้า');
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('จำนวนต้องมากกว่า 0');
      return;
    }

    const payload = {
      productId,
      quantity,
      supplierId: supplierId || undefined,
      note: note || undefined
    };

    try {
      await apiFetch<void>('/stock/in', {
        method: 'POST',
        body: JSON.stringify(payload),
        token
      });
      setMessage('บันทึกสินค้าเข้าเรียบร้อย');
      form.reset();
      setStockInModalOpen(false);
      setFormResetKey((prev) => prev + 1);
      setSelectedProductId('');
      setSelectedSupplierId('');
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
                  setSelectedProductId('');
                  setSelectedSupplierId('');
                }}
                className="w-full rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white md:w-auto"
              >
                เปิดฟอร์ม Stock-In
              </button>
            </div>
          </section>

          {isStockInModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60">
              <div className="flex min-h-full items-center justify-center p-4">
                <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
                  <div className="max-h-[85vh] overflow-y-auto p-6">
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
                          setSelectedProductId('');
                          setSelectedSupplierId('');
                        }}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                      >
                        ปิด
                      </button>
                    </div>
                    <form key={formResetKey} onSubmit={handleStockIn} className="mt-6 space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-medium text-slate-500">สินค้า</label>
                          <SearchableSelect
                            key={`stock-product-${formResetKey}`}
                            name="productId"
                            value={selectedProductId}
                            onChange={setSelectedProductId}
                            options={[{ value: '', label: 'เลือกสินค้า' }, ...productOptions]}
                            placeholder="เลือกสินค้า"
                            searchPlaceholder="ค้นหาสินค้า..."
                            emptyMessage="ไม่พบสินค้า"
                            disabled={productOptions.length === 0}
                          />
                          {productOptions.length === 0 && (
                            <p className="text-xs text-rose-500">ยังไม่มีข้อมูลสินค้า</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-500">จำนวน</label>
                          <input name="quantity" type="number" min={1} required />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-500">Supplier</label>
                          <SearchableSelect
                            key={`stock-supplier-${formResetKey}`}
                            name="supplierId"
                            value={selectedSupplierId}
                            onChange={setSelectedSupplierId}
                            options={[{ value: '', label: 'เลือก Supplier (ไม่บังคับ)' }, ...supplierOptions]}
                            placeholder="เลือก Supplier (ไม่บังคับ)"
                            searchPlaceholder="ค้นหา Supplier..."
                            emptyMessage="ไม่พบ Supplier"
                            disabled={supplierOptions.length === 0}
                          />
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
                            setSelectedProductId('');
                            setSelectedSupplierId('');
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
              </div>
            </div>
          )}
        </>
      )}

      {canViewTransactions && (
        <section className="card space-y-4 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">ประวัติธุรกรรมสต็อก</h2>
              <p className="text-sm text-slate-500">ข้อมูลจาก GET /stock/transactions</p>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
              <input
                type="search"
                value={transactionSearch}
                onChange={(event) => setTransactionSearch(event.target.value)}
                placeholder="ค้นหาด้วยรหัสสินค้า ประเภท หรือผู้ทำรายการ"
                className="w-full md:w-80"
              />
              <p className="text-xs text-slate-400">
                แสดง {filteredTransactions.length} จาก {sortedTransactions.length} รายการ
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {transactions === undefined ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                กำลังโหลดประวัติธุรกรรม...
              </p>
            ) : (
              <>
                {filteredTransactions.map((transaction) => (
                  <button
                    key={transaction.transactionId}
                    type="button"
                    onClick={() => {
                      setInspectedTransactionId(transaction.transactionId);
                      setTransactionModalOpen(true);
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 transition hover:border-primary-200 hover:bg-primary-50/40"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{transaction.transactionId}</p>
                        <p className="text-xs text-slate-500">สินค้า {transaction.productId} • ประเภท {transaction.type}</p>
                      </div>
                      <div className="text-xs text-slate-500 md:text-right">
                        <p>{format(new Date(transaction.transactionDate), 'dd MMM yyyy HH:mm')}</p>
                        <p className="mt-1">จำนวน {transaction.quantity} • โดย {transaction.staffId}</p>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredTransactions.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                    {sortedTransactions.length === 0 ? 'ยังไม่มีธุรกรรมสต็อก' : 'ไม่พบรายการที่ตรงกับการค้นหา'}
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {canViewTransactions && isTransactionModalOpen && inspectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            <div className="max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">รายละเอียดธุรกรรม</h2>
                  <p className="text-sm text-slate-500">
                    {inspectedTransaction.transactionId} • {format(new Date(inspectedTransaction.transactionDate), 'dd MMM yyyy HH:mm')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTransactionModalOpen(false);
                    setInspectedTransactionId(null);
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  ปิด
                </button>
              </div>
              <div className="mt-6 space-y-4 text-sm text-slate-700">
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">ประเภท</span>
                    <span className="font-semibold text-slate-800">{inspectedTransaction.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">สินค้า</span>
                    <span className="font-semibold text-slate-800">{inspectedTransaction.productId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">จำนวน</span>
                    <span className="font-semibold text-slate-800">{inspectedTransaction.quantity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">ผู้ทำรายการ</span>
                    <span className="font-semibold text-slate-800">{inspectedTransaction.staffId}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">รายละเอียดเพิ่มเติม</p>
                  <p className="mt-2 text-sm text-slate-700">{inspectedTransaction.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
