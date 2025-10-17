'use client';

import { FormEvent, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../../components/AuthContext';
import { apiFetch } from '../../../lib/api';
import { useAuthedSWR } from '../../../lib/swr';
import type { Customer, Order, OrderItem, Product } from '../../../lib/types';

interface DraftItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export default function OrdersPage() {
  const { role, token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([{ productId: '', quantity: 1, unitPrice: 0 }]);
  const [isSubmitting, setSubmitting] = useState(false);

  const { data: customers } = useAuthedSWR<Customer[]>('/customers', token);
  const { data: products } = useAuthedSWR<Product[]>('/products', token);
  const { data: allOrders, mutate: mutateAll } = useAuthedSWR<Order[]>(role === 'ADMIN' ? '/orders' : null, token);
  const { data: confirmedOrders, mutate: mutateConfirmed } = useAuthedSWR<Order[]>(role === 'TECHNICIAN' || role === 'ADMIN' || role === 'SALES' ? '/orders/confirmed' : null, token);
  const { data: readyToClose, mutate: mutateReady } = useAuthedSWR<Order[]>(role === 'SALES' || role === 'ADMIN' ? '/orders/ready-to-close' : null, token, {
    refreshInterval: 20000
  });
  const { data: orderItems } = useAuthedSWR<OrderItem[]>(selectedOrder ? `/orders/${selectedOrder}/items` : null, token, {
    revalidateOnFocus: false
  });

  const canCreate = role === 'SALES' || role === 'ADMIN';

  const totalAmount = useMemo(() => {
    return draftItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  }, [draftItems]);

  const handleDraftChange = (index: number, patch: Partial<DraftItem>) => {
    setDraftItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const addDraftRow = () => setDraftItems((prev) => [...prev, { productId: '', quantity: 1, unitPrice: 0 }]);
  const removeDraftRow = (index: number) => setDraftItems((prev) => prev.filter((_, idx) => idx !== index));

  const handleCreateOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const customerId = String(formData.get('customerId'));
    const orderDate = String(formData.get('orderDate'));
    const status = String(formData.get('status') || 'Pending');

    const preparedItems = draftItems
      .filter((item) => item.productId && item.quantity > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice,
        fulfilledQty: 0,
        remainingQty: item.quantity
      }));

    const payload = {
      order: {
        orderDate,
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
      setDraftItems([{ productId: '', quantity: 1, unitPrice: 0 }]);
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้าง Order ไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseOrder = async (orderId: string) => {
    if (!token) return;
    setError(null);
    try {
      await apiFetch<void>(`/orders/${orderId}/close`, {
        method: 'PUT',
        token
      });
      mutateReady();
      mutateAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถปิด Order ได้');
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500">แสดงข้อมูลจาก OrderController: /orders, /orders/confirmed, /orders/ready-to-close</p>
      </header>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Order ที่ได้รับการยืนยัน</h2>
            <p className="text-sm text-slate-500">ดึงจาก /orders/confirmed</p>
          </div>
          <div className="space-y-3">
            {(confirmedOrders ?? []).map((order) => (
              <button
                key={order.orderId}
                type="button"
                onClick={() => setSelectedOrder(order.orderId)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedOrder === order.orderId ? 'border-primary-300 bg-primary-50' : 'border-slate-200 hover:border-primary-200 hover:bg-slate-50'}`}
              >
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{order.orderId}</p>
                    <p className="text-xs text-slate-500">ลูกค้า: {order.customerId} • สถานะ: {order.status}</p>
                  </div>
                  <span className="text-xs text-slate-400">{format(new Date(order.orderDate), 'dd MMM yyyy')}</span>
                </div>
              </button>
            ))}
            {(confirmedOrders?.length ?? 0) === 0 && <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">ยังไม่มี Order ที่ยืนยัน</p>}
          </div>
          {selectedOrder && orderItems && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800">รายการสินค้าใน {selectedOrder}</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {orderItems.map((item) => (
                  <li key={item.orderItemId} className="flex justify-between">
                    <span>
                      {item.productId} • {item.quantity} ชิ้น
                    </span>
                    <span className="text-xs text-slate-500">คงเหลือ {item.remainingQty}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {canCreate && (
          <form onSubmit={handleCreateOrder} className="card space-y-4 p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">สร้าง Order ใหม่</h2>
              <p className="text-sm text-slate-500">เรียกใช้ POST /orders และผูก Staff ผ่าน JWT</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-slate-500">ลูกค้า</label>
                <select name="customerId" required className="w-full">
                  <option value="">เลือก Customer</option>
                  {(customers ?? []).map((customer) => (
                    <option key={customer.customerId} value={customer.customerId}>
                      {customer.customerName} ({customer.customerId})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500">วันที่ Order</label>
                <input name="orderDate" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500">สถานะ</label>
                <select name="status" defaultValue="Pending">
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">รายการสินค้า</p>
                <button type="button" onClick={addDraftRow} className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                  เพิ่มรายการ
                </button>
              </div>
              <div className="space-y-3">
                {draftItems.map((item, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-4">
                    <select value={item.productId} onChange={(event) => handleDraftChange(index, { productId: event.target.value })} className="md:col-span-2">
                      <option value="">เลือกสินค้า</option>
                      {(products ?? []).map((product) => (
                        <option key={product.productId} value={product.productId}>
                          {product.productName} ({product.productId})
                        </option>
                      ))}
                    </select>
                    <input type="number" min={1} value={item.quantity} onChange={(event) => handleDraftChange(index, { quantity: Number(event.target.value) })} />
                    <input type="number" min={0} step={0.01} value={item.unitPrice} onChange={(event) => handleDraftChange(index, { unitPrice: Number(event.target.value) })} />
                    {draftItems.length > 1 && (
                      <button type="button" onClick={() => removeDraftRow(index)} className="text-xs text-rose-500">
                        ลบ
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span>ยอดรวม (คำนวณก่อนส่ง)</span>
                <span className="font-semibold text-slate-800">฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก Order'}
            </button>
          </form>
        )}
      </div>

      {(role === 'SALES' || role === 'ADMIN') && (
        <section className="card space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Order ที่พร้อมปิด</h2>
            <p className="text-sm text-slate-500">ใช้ /orders/ready-to-close และ PUT /orders/{'{orderId}'}/close</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(readyToClose ?? []).map((order) => (
              <div key={order.orderId} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-800">{order.orderId}</p>
                <p className="mt-1 text-xs text-slate-500">สถานะ: {order.status}</p>
                <p className="mt-1 text-xs text-slate-500">ยอดรวม: ฿{Number(order.totalAmount).toLocaleString()}</p>
                <button onClick={() => handleCloseOrder(order.orderId)} className="mt-3 w-full bg-primary-600 py-2 text-xs font-semibold text-white">
                  ปิด Order
                </button>
              </div>
            ))}
            {(readyToClose?.length ?? 0) === 0 && <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">ยังไม่มีรายการพร้อมปิด</p>}
          </div>
        </section>
      )}

      {role === 'ADMIN' && allOrders && (
        <section className="card space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Order ทั้งหมด (สำหรับ Admin)</h2>
            <p className="text-sm text-slate-500">อ่านข้อมูลจาก GET /orders</p>
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
                    <td className="px-4 py-3 text-sm text-slate-500">{format(new Date(order.orderDate), 'dd MMM yyyy')}</td>
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
