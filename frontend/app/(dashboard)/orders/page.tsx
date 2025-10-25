'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../../components/AuthContext';
import { apiFetch } from '../../../lib/api';
import { useAuthedSWR } from '../../../lib/swr';
import type { Customer, Order, OrderItem, Product } from '../../../lib/types';
import { SearchableSelect, type SearchableOption } from '../../../components/SearchableSelect';

interface DraftItem {
  productId: string;
  quantity: number;
}

const parseDateTime = (value?: string | number | null): Date | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTimeValue = (value?: string | number | null) => {
  const date = parseDateTime(value);
  return date ? date.getTime() : 0;
};

const formatDateTime = (value?: string | number | null, pattern = 'dd MMM yyyy') => {
  const date = parseDateTime(value);
  return date ? format(date, pattern) : '-';
};

export default function OrdersPage() {
  const { role, token } = useAuth();
  const isSales = role === 'SALES';
  const shouldLoadAllOrders = role === 'ADMIN' || isSales;
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [inspectedOrderId, setInspectedOrderId] = useState<string | null>(null);
  const [isOrderModalOpen, setOrderModalOpen] = useState(false);
  const [readyOrderInspectId, setReadyOrderInspectId] = useState<string | null>(null);
  const [isReadyOrderModalOpen, setReadyOrderModalOpen] = useState(false);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([{ productId: '', quantity: 1 }]);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [confirmedSearch, setConfirmedSearch] = useState('');

  const { data: customers } = useAuthedSWR<Customer[]>('/customers', token);
  const { data: products } = useAuthedSWR<Product[]>('/products', token);
  const { data: allOrders, mutate: mutateAll } = useAuthedSWR<Order[]>(shouldLoadAllOrders ? '/orders' : null, token);
  const { data: confirmedOrders, mutate: mutateConfirmed } = useAuthedSWR<Order[]>(
    role === 'TECHNICIAN' || role === 'SALES' ? '/orders/confirmed' : null,
    token
  );
  const { data: readyToClose, mutate: mutateReady } = useAuthedSWR<Order[]>(role === 'SALES' ? '/orders/ready-to-close' : null, token, {
    refreshInterval: 20000
  });
  const { data: orderItems } = useAuthedSWR<OrderItem[]>(inspectedOrderId ? `/orders/${inspectedOrderId}/items` : null, token, {
    revalidateOnFocus: false
  });
  const { data: readyOrderItems, isLoading: isReadyOrderItemsLoading } = useAuthedSWR<OrderItem[]>(
    readyOrderInspectId ? `/orders/${readyOrderInspectId}/items` : null,
    token,
    { revalidateOnFocus: false }
  );

  const canCreate = role === 'SALES';

  const customerOptions = useMemo<SearchableOption[]>(() => {
    return (customers ?? []).map((customer) => ({
      value: customer.customerId,
      label: `${customer.customerName} (${customer.customerId})`,
      description: [customer.phone, customer.email].filter(Boolean).join(' • ') || undefined,
      keywords: [customer.customerName, customer.customerId, customer.phone ?? '', customer.email ?? '', customer.address ?? '']
    }));
  }, [customers]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    (products ?? []).forEach((product) => {
      map.set(product.productId, product);
    });
    return map;
  }, [products]);

  const productOptions = useMemo<SearchableOption[]>(() => {
    return (products ?? []).map((product) => ({
      value: product.productId,
      label: `${product.productName} (${product.productId})`,
      description: [product.unit, product.supplierId ? `Supplier: ${product.supplierId}` : null]
        .filter(Boolean)
        .join(' • ') || undefined,
      keywords: [
        product.productName,
        product.productId,
        product.description ?? '',
        product.unit ?? '',
        product.supplierId ?? ''
      ]
    }));
  }, [products]);

  const sortedConfirmedOrders = useMemo(() => {
    const data = isSales ? allOrders ?? [] : confirmedOrders ?? [];
    return [...data].sort((a, b) => getTimeValue(b.orderDate) - getTimeValue(a.orderDate));
  }, [isSales, allOrders, confirmedOrders]);

  const filteredConfirmedOrders = useMemo(() => {
    const query = confirmedSearch.trim().toLowerCase();
    if (!query) {
      return sortedConfirmedOrders;
    }
    return sortedConfirmedOrders.filter((order) => {
      const haystack = [order.orderId, order.customerId, order.status ?? '', order.staffId ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [sortedConfirmedOrders, confirmedSearch]);

  const inspectedOrder = useMemo(() => {
    if (!inspectedOrderId) return null;
    return sortedConfirmedOrders.find((order) => order.orderId === inspectedOrderId) ?? null;
  }, [sortedConfirmedOrders, inspectedOrderId]);

  const inspectedReadyOrder = useMemo(() => {
    if (!readyOrderInspectId) return null;
    return (readyToClose ?? []).find((order) => order.orderId === readyOrderInspectId) ?? null;
  }, [readyToClose, readyOrderInspectId]);

  useEffect(() => {
    if (readyOrderInspectId && !(readyToClose ?? []).some((order) => order.orderId === readyOrderInspectId)) {
      setReadyOrderInspectId(null);
      setReadyOrderModalOpen(false);
    }
  }, [readyOrderInspectId, readyToClose]);

  const totalAmount = useMemo(() => {
    return draftItems.reduce((sum, item) => {
      const price = productMap.get(item.productId)?.pricePerUnit ?? 0;
      return sum + (item.quantity || 0) * price;
    }, 0);
  }, [draftItems, productMap]);

  const handleDraftChange = (index: number, patch: Partial<DraftItem>) => {
    setDraftItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const addDraftRow = () => setDraftItems((prev) => [...prev, { productId: '', quantity: 1 }]);
  const removeDraftRow = (index: number) => setDraftItems((prev) => prev.filter((_, idx) => idx !== index));

  const resetCreateForm = () => {
    setDraftItems([{ productId: '', quantity: 1 }]);
    setFormResetKey((prev) => prev + 1);
    setSubmitting(false);
    setSelectedCustomerId('');
  };

  const handleCreateOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    const formData = new FormData(form);
    const customerId = selectedCustomerId || String(formData.get('customerId') ?? '');
    const status = 'Confirmed';

    if (!customerId) {
      setError('กรุณาเลือกลูกค้า');
      setSubmitting(false);
      return;
    }

    const preparedItems = draftItems
      .filter((item) => item.productId && item.quantity > 0)
      .map((item) => {
        const product = productMap.get(item.productId);
        const unitPrice = product?.pricePerUnit ?? 0;
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          lineTotal: item.quantity * unitPrice,
          fulfilledQty: 0,
          remainingQty: item.quantity
        };
      });

    const payload = {
      order: {
        customerId,
        status,
        totalAmount
      },
      items: preparedItems
    };

    try {
      await apiFetch<string>('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
        token
      });
      mutateAll();
      mutateConfirmed();
      mutateReady();
      resetCreateForm();
      form.reset();
      setCreateModalOpen(false);
      setSuccessMessage('สร้าง Order เรียบร้อย');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้าง Order ไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReadyOrderInspect = (orderId: string) => {
    if (readyOrderInspectId === orderId) {
      setReadyOrderInspectId(null);
      setReadyOrderModalOpen(false);
      return;
    }
    setReadyOrderInspectId(orderId);
    setReadyOrderModalOpen(true);
  };

  const handleCloseOrder = async (orderId: string) => {
    if (!token) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await apiFetch<void>(`/orders/${orderId}/close`, {
        method: 'PUT',
        token
      });
      mutateReady();
      mutateAll();
      if (readyOrderInspectId === orderId) {
        setReadyOrderModalOpen(false);
        setReadyOrderInspectId(null);
      }
      setSuccessMessage('ปิด Order เรียบร้อย');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถปิด Order ได้');
    }
  };

  const handleViewOrder = (orderId: string) => {
    if (inspectedOrderId === orderId) {
      setInspectedOrderId(null);
      setOrderModalOpen(false);
      return;
    }
    setInspectedOrderId(orderId);
    if (role === 'TECHNICIAN') {
      setOrderModalOpen(true);
    } else {
      setOrderModalOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
      </header>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {successMessage && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{successMessage}</div>
      )}

      {canCreate && (
        <section className="card space-y-4 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Sales: สร้าง Order ใหม่</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                resetCreateForm();
                setCreateModalOpen(true);
              }}
              className="w-full rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white md:w-auto"
            >
              สร้าง Order
            </button>
          </div>
        </section>
      )}

      {canCreate && isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl">
              <div className="max-h-[85vh] overflow-y-auto p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">สร้าง Order ใหม่</h2>
                    <p className="text-sm text-slate-500">กรอกข้อมูล Order พร้อมรายการสินค้าให้ครบถ้วน</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetCreateForm();
                      setCreateModalOpen(false);
                    }}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    ปิด
                  </button>
                </div>
                <form key={formResetKey} onSubmit={handleCreateOrder} className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-medium text-slate-500">ลูกค้า</label>
                  <SearchableSelect
                    key={`customer-${formResetKey}`}
                    name="customerId"
                    value={selectedCustomerId}
                    onChange={setSelectedCustomerId}
                    options={[{ value: '', label: 'เลือก Customer' }, ...customerOptions]}
                    placeholder="เลือก Customer"
                    searchPlaceholder="ค้นหาลูกค้า..."
                    emptyMessage="ไม่พบลูกค้า"
                    disabled={customerOptions.length === 0}
                  />
                  {customerOptions.length === 0 && (
                    <p className="text-xs text-rose-500">ยังไม่มีข้อมูลลูกค้า โปรดเพิ่มในเมนู Customers</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">รายการสินค้า</p>
                  <button
                    type="button"
                    onClick={addDraftRow}
                    disabled={productOptions.length === 0}
                    className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    เพิ่มรายการ
                  </button>
                </div>
                <div className="space-y-3">
                  {draftItems.map((item, index) => {
                    const product = productMap.get(item.productId);
                    const unitPrice = product?.pricePerUnit ?? 0;
                    const lineTotal = (item.quantity || 0) * unitPrice;
                    return (
                      <div
                        key={`${formResetKey}-${index}`}
                        className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-5"
                      >
                        <SearchableSelect
                          value={item.productId}
                          onChange={(nextProductId) => {
                            const safeQuantity = nextProductId ? Math.max(1, item.quantity || 1) : 0;
                            handleDraftChange(index, { productId: nextProductId, quantity: safeQuantity });
                          }}
                          options={[{ value: '', label: 'เลือกสินค้า' }, ...productOptions]}
                          placeholder="เลือกสินค้า"
                          searchPlaceholder="ค้นหาสินค้า..."
                          emptyMessage="ไม่พบสินค้า"
                          disabled={productOptions.length === 0}
                          className="md:col-span-2"
                        />
                        <input
                          type="number"
                          min={1}
                          value={item.productId ? item.quantity : 1}
                          disabled={!item.productId}
                          onChange={(event) => {
                            const rawValue = Number(event.target.value);
                            const nextQuantity = Math.max(1, Number.isFinite(rawValue) ? rawValue : 1);
                            handleDraftChange(index, { quantity: nextQuantity });
                          }}
                        />
                        <div className="flex flex-col justify-center rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                          <span>ราคา/หน่วย</span>
                          <span className="text-sm font-semibold text-slate-800">
                            ฿{unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex flex-col justify-center rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                          <span>ยอดรวม</span>
                          <span className="text-sm font-semibold text-slate-800">
                            ฿{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        {draftItems.length > 1 && (
                          <div className="flex items-center">
                            <button type="button" onClick={() => removeDraftRow(index)} className="text-xs text-rose-500">
                              ลบ
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                  <span>ยอดรวม (คำนวณก่อนส่ง)</span>
                  <span className="font-semibold text-slate-800">฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetCreateForm();
                    setCreateModalOpen(false);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button type="submit" disabled={isSubmitting} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white">
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )}

      {role !== 'ADMIN' && (
        <section className="card space-y-4 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{isSales ? 'All Order' : 'Order ที่ได้รับการยืนยัน'}</h2>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
            <input
              type="search"
              value={confirmedSearch}
              onChange={(event) => setConfirmedSearch(event.target.value)}
              placeholder="ค้นหาด้วย Order ID ลูกค้า หรือสถานะ"
              className="w-full md:w-80"
            />
            <p className="text-xs text-slate-400">
              แสดง {filteredConfirmedOrders.length} จาก {sortedConfirmedOrders.length} รายการ
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">วันที่</th>
                <th className="px-4 py-3">ลูกค้า</th>
                <th className="px-4 py-3">ยอดรวม</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3">ผู้รับผิดชอบ</th>
                <th className="px-4 py-3">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {confirmedOrders === undefined ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredConfirmedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    {sortedConfirmedOrders.length === 0
                      ? isSales
                        ? 'ยังไม่มี Order'
                        : 'ยังไม่มี Order ที่ยืนยัน'
                      : 'ไม่พบ Order ที่ตรงกับการค้นหา'}
                  </td>
                </tr>
              ) : (
                filteredConfirmedOrders.map((order) => {
                  const isSelected = inspectedOrderId === order.orderId;
                  return (
                    <tr
                      key={order.orderId}
                      className={`hover:bg-slate-50/60 ${isSelected ? 'bg-primary-50/60' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{order.orderId}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDateTime(order.orderDate, 'dd MMM yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{order.customerId}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        ฿{Number(order.totalAmount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700">{order.status}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{order.staffId}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleViewOrder(order.orderId)}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-primary-600 transition hover:border-primary-200 hover:bg-primary-50"
                        >
                          {isSelected ? 'ซ่อน' : 'ดูรายละเอียด'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {role !== 'TECHNICIAN' && inspectedOrder && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">รายละเอียด {inspectedOrder.orderId}</h3>
                <p className="text-xs text-slate-500">
                  ลูกค้า {inspectedOrder.customerId} • วันที่ {formatDateTime(inspectedOrder.orderDate, 'dd MMM yyyy')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectedOrderId(null);
                  setOrderModalOpen(false);
                }}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                ปิด
              </button>
            </div>
            <div className="grid gap-3 rounded-xl bg-white p-4 text-xs text-slate-500 md:grid-cols-3">
              <div>
                <p className="font-semibold text-slate-600">สถานะ</p>
                <p className="mt-1 text-slate-800">{inspectedOrder.status}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-600">ยอดรวม</p>
                <p className="mt-1 text-slate-800">฿{Number(inspectedOrder.totalAmount).toLocaleString()}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-600">ผู้รับผิดชอบ</p>
                <p className="mt-1 text-slate-800">{inspectedOrder.staffId}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">รายการสินค้า</p>
              {orderItems ? (
                orderItems.length > 0 ? (
                  <ul className="mt-2 space-y-2 text-sm text-slate-600">
                    {orderItems.map((item) => (
                      <li key={item.orderItemId} className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                        <span>
                          {item.productId} • {item.quantity} ชิ้น
                        </span>
                        <span className="text-xs text-slate-500">คงเหลือ {item.remainingQty}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 rounded-xl bg-white px-4 py-3 text-sm text-slate-500">ยังไม่มีรายการสินค้าใน Order นี้</p>
                )
              ) : (
                <p className="mt-2 rounded-xl bg-white px-4 py-3 text-sm text-slate-500">กำลังโหลดรายการสินค้า...</p>
              )}
            </div>
          </div>
        )}
        </section>
      )}

      {role === 'TECHNICIAN' && isOrderModalOpen && inspectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="max-h-[85vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">รายละเอียด Order</h2>
                  {inspectedOrder ? (
                    <p className="text-sm text-slate-500">
                      {inspectedOrder.orderId} • ลูกค้า {inspectedOrder.customerId} • วันที่{' '}
                      {formatDateTime(inspectedOrder.orderDate, 'dd MMM yyyy')}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">กำลังโหลดข้อมูล Order...</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOrderModalOpen(false);
                    setInspectedOrderId(null);
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  ปิด
                </button>
              </div>
              <div className="mt-6 space-y-4">
                {orderItems ? (
                  orderItems.length > 0 ? (
                    <div className="space-y-3">
                      {orderItems.map((item) => (
                        <div key={item.orderItemId} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          <div>
                            <p className="font-medium text-slate-800">{item.productId}</p>
                            <p className="text-xs text-slate-500">จำนวน {item.quantity} • คงเหลือ {item.remainingQty}</p>
                          </div>
                          <span className="text-xs text-slate-500">ราคา/หน่วย ฿{item.unitPrice.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">ยังไม่มีรายการสินค้าใน Order นี้</p>
                  )
                ) : (
                  <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">กำลังโหลดรายการสินค้า...</p>
                )}
                {inspectedOrder && (
                  <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">ยอดรวม</span>
                      <span className="font-semibold text-slate-800">฿{Number(inspectedOrder.totalAmount).toLocaleString()}</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">สถานะปัจจุบัน: {inspectedOrder.status}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {role === 'SALES' && (
        <section className="card space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Order ที่พร้อมปิด</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(readyToClose ?? []).map((order) => {
              const isInspected = readyOrderInspectId === order.orderId;
              return (
                <div key={order.orderId} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-800">{order.orderId}</p>
                  <p className="mt-1 text-xs text-slate-500">ลูกค้า: {order.customerId}</p>
                  <p className="mt-1 text-xs text-slate-500">วันที่: {formatDateTime(order.orderDate, 'dd MMM yyyy HH:mm')}</p>
                  <p className="mt-1 text-xs text-slate-500">สถานะ: {order.status}</p>
                  <p className="mt-1 text-xs text-slate-500">ยอดรวม: ฿{Number(order.totalAmount).toLocaleString()}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleReadyOrderInspect(order.orderId)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-primary-600 transition hover:border-primary-200 hover:bg-primary-50"
                    >
                      {isInspected ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCloseOrder(order.orderId)}
                      className="w-full rounded-lg bg-primary-600 py-2 text-xs font-semibold text-white"
                    >
                      ปิด Order
                    </button>
                  </div>
                </div>
              );
            })}
            {(readyToClose?.length ?? 0) === 0 && <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">ยังไม่มีรายการพร้อมปิด</p>}
          </div>
        </section>
      )}

      {isReadyOrderModalOpen && inspectedReadyOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="max-h-[85vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">รายละเอียด Order ที่พร้อมปิด</h2>
                  <p className="text-sm text-slate-500">
                    {inspectedReadyOrder.orderId} • ลูกค้า {inspectedReadyOrder.customerId} • วันที่{' '}
                    {formatDateTime(inspectedReadyOrder.orderDate, 'dd MMM yyyy HH:mm')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReadyOrderModalOpen(false);
                    setReadyOrderInspectId(null);
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  ปิด
                </button>
              </div>
              <div className="mt-6 space-y-4 text-sm text-slate-600">
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-slate-600">สถานะ</p>
                    <p className="mt-1 text-slate-800">{inspectedReadyOrder.status}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">ยอดรวม</p>
                    <p className="mt-1 text-slate-800">฿{Number(inspectedReadyOrder.totalAmount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">ผู้รับผิดชอบ</p>
                    <p className="mt-1 text-slate-800">{inspectedReadyOrder.staffId ?? '-'}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">รายการสินค้า</p>
                  {isReadyOrderItemsLoading ? (
                    <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">กำลังโหลดรายการสินค้า...</p>
                  ) : readyOrderItems && readyOrderItems.length > 0 ? (
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {readyOrderItems.map((item) => (
                        <li key={item.orderItemId} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                          <span>
                            {productMap.get(item.productId)?.productName
                              ? `${productMap.get(item.productId)?.productName} (${item.productId})`
                              : item.productId}
                          </span>
                          <span className="text-xs text-slate-500">
                            {item.quantity} ชิ้น • คงเหลือ {item.remainingQty}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">ยังไม่มีรายการสินค้าใน Order นี้</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {role === 'ADMIN' && allOrders && (
        <section className="card space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Order ทั้งหมด </h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">วันที่</th>
                  <th className="px-4 py-3">ลูกค้า</th>
                  <th className="px-4 py-3">ยอดรวม</th>
                  <th className="px-4 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {allOrders.map((order) => (
                  <tr key={order.orderId}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{order.orderId}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDateTime(order.orderDate, 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{order.customerId}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">฿{Number(order.totalAmount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{order.status}</td>
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
