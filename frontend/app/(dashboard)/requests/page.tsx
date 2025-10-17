'use client';

import { FormEvent, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../../components/AuthContext';
import { apiFetch } from '../../../lib/api';
import { useAuthedSWR } from '../../../lib/swr';
import type { Order, Request, RequestItem, Product } from '../../../lib/types';

interface DraftRequestItem {
  productId: string;
  quantity: number;
}

export default function RequestsPage() {
  const { role, token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [draftItems, setDraftItems] = useState<DraftRequestItem[]>([{ productId: '', quantity: 1 }]);

  const { data: confirmedOrders } = useAuthedSWR<Order[]>(role === 'TECHNICIAN' || role === 'ADMIN' ? '/orders/confirmed' : null, token);
  const { data: products } = useAuthedSWR<Product[]>('/products', token);
  const { data: pendingRequests, mutate: mutatePending } = useAuthedSWR<Request[]>(role === 'FOREMAN' || role === 'ADMIN' ? '/requests/pending' : null, token, { refreshInterval: 15000 });
  const { data: approvedRequests, mutate: mutateApproved } = useAuthedSWR<Request[]>(role === 'WAREHOUSE' || role === 'ADMIN' ? '/stock/approved-requests' : null, token, { refreshInterval: 15000 });
  const { data: readyToClose, mutate: mutateReady } = useAuthedSWR<Request[]>(role === 'WAREHOUSE' || role === 'ADMIN' ? '/requests/ready-to-close' : null, token, { refreshInterval: 30000 });
  const { data: requestItems } = useAuthedSWR<RequestItem[]>(selectedRequestId ? `/requests/${selectedRequestId}/items` : null, token);

  const canCreate = role === 'TECHNICIAN' || role === 'ADMIN';
  const canApprove = role === 'FOREMAN' || role === 'ADMIN';
  const canFulfill = role === 'WAREHOUSE' || role === 'ADMIN';

  const totalQuantity = useMemo(() => draftItems.reduce((sum, item) => sum + (item.quantity || 0), 0), [draftItems]);

  const updateDraftItem = (index: number, patch: Partial<DraftRequestItem>) => {
    setDraftItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const addDraftRow = () => setDraftItems((prev) => [...prev, { productId: '', quantity: 1 }]);
  const removeDraftRow = (index: number) => setDraftItems((prev) => prev.filter((_, idx) => idx !== index));

  const handleCreateRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setError(null);

    const formData = new FormData(event.currentTarget);
    const orderId = String(formData.get('orderId'));
    const requestDate = String(formData.get('requestDate'));
    const description = String(formData.get('description') || '');

    const selectedOrder = confirmedOrders?.find((order) => order.orderId === orderId);
    const customerId = selectedOrder?.customerId;

    const payload = {
      request: {
        orderId,
        customerId,
        requestDate,
        status: 'Awaiting Approval',
        description
      },
      items: draftItems
        .filter((item) => item.productId && item.quantity > 0)
        .map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          fulfilledQty: 0,
          remainingQty: item.quantity
        }))
    };

    try {
      await apiFetch<string>('/requests', {
        method: 'POST',
        body: JSON.stringify(payload),
        token
      });
      setDraftItems([{ productId: '', quantity: 1 }]);
      event.currentTarget.reset();
      mutatePending();
      mutateApproved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถสร้างคำขอเบิกได้');
    }
  };

  const handleApprove = async (requestId: string, action: 'approve' | 'reject') => {
    if (!token) return;
    setError(null);
    try {
      await apiFetch<void>(`/requests/${requestId}/${action}`, {
        method: 'PUT',
        token
      });
      mutatePending();
      mutateApproved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const handleFulfill = async (requestItemId: string, fulfillQty: number) => {
    if (!token || fulfillQty <= 0) return;
    setError(null);
    try {
      await apiFetch<void>('/stock/fulfill', {
        method: 'POST',
        body: JSON.stringify({ requestItemId, fulfillQty }),
        token
      });
      mutateApproved();
      mutateReady();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถเบิกสินค้าได้');
    }
  };

  const handleCloseRequest = async (requestId: string) => {
    if (!token) return;
    setError(null);
    try {
      await apiFetch<void>(`/requests/${requestId}/close`, {
        method: 'PUT',
        token
      });
      mutateReady();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถปิดคำขอได้');
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Requests</h1>
        <p className="text-sm text-slate-500">ครอบคลุม Use Case Technician, Foreman และ Warehouse จาก RequestController และ StockController</p>
      </header>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {canCreate && (
        <form onSubmit={handleCreateRequest} className="card space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Technician: สร้างคำขอเบิก</h2>
            <p className="text-sm text-slate-500">POST /requests พร้อมรายการสินค้า</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-medium text-slate-500">อ้างอิง Order ที่ยืนยัน</label>
              <select name="orderId" required>
                <option value="">เลือก Order</option>
                {(confirmedOrders ?? []).map((order) => (
                  <option key={order.orderId} value={order.orderId}>
                    {order.orderId} • ลูกค้า {order.customerId}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500">วันที่ร้องขอ</label>
              <input name="requestDate" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-medium text-slate-500">รายละเอียดเพิ่มเติม</label>
              <textarea name="description" rows={3} placeholder="ระบุหน้างานหรือหมายเหตุ" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">รายการสินค้า</p>
              <button type="button" onClick={addDraftRow} className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                เพิ่มสินค้า
              </button>
            </div>
            <div className="space-y-3">
              {draftItems.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-4">
                  <select value={item.productId} onChange={(event) => updateDraftItem(index, { productId: event.target.value })} className="md:col-span-2">
                    <option value="">เลือกสินค้า</option>
                    {(products ?? []).map((product) => (
                      <option key={product.productId} value={product.productId}>
                        {product.productName} ({product.productId})
                      </option>
                    ))}
                  </select>
                  <input type="number" min={1} value={item.quantity} onChange={(event) => updateDraftItem(index, { quantity: Number(event.target.value) })} />
                  {draftItems.length > 1 && (
                    <button type="button" onClick={() => removeDraftRow(index)} className="text-xs text-rose-500">
                      ลบ
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span>จำนวนสินค้ารวม</span>
              <span className="font-semibold text-slate-800">{totalQuantity} ชิ้น</span>
            </div>
          </div>
          <button type="submit" className="w-full md:w-auto">
            บันทึกคำขอเบิก
          </button>
        </form>
      )}

      {canApprove && (
        <section className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Foreman: รออนุมัติ</h2>
              <p className="text-sm text-slate-500">ใช้งาน /requests/pending และ PUT approve / reject</p>
            </div>
          </div>
          <div className="space-y-3">
            {(pendingRequests ?? []).map((request) => (
              <div key={request.requestId} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{request.requestId}</p>
                    <p className="text-xs text-slate-500">Order: {request.orderId} • ขอโดย {request.staffId}</p>
                  </div>
                  <span className="text-xs text-slate-400">{format(new Date(request.requestDate), 'dd MMM yyyy')}</span>
                </div>
                {request.description && <p className="mt-3 text-sm text-slate-600">{request.description}</p>}
                <div className="mt-4 flex gap-3">
                  <button onClick={() => handleApprove(request.requestId, 'approve')} className="flex-1 bg-emerald-500 py-2 text-xs font-semibold text-white">
                    อนุมัติ
                  </button>
                  <button onClick={() => handleApprove(request.requestId, 'reject')} className="flex-1 bg-rose-500 py-2 text-xs font-semibold text-white">
                    ปฏิเสธ
                  </button>
                </div>
              </div>
            ))}
            {(pendingRequests?.length ?? 0) === 0 && <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">ไม่มีคำขอรออนุมัติ</p>}
          </div>
        </section>
      )}

      {canFulfill && (
        <section className="card space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Warehouse: คำขอที่อนุมัติแล้ว</h2>
            <p className="text-sm text-slate-500">ดึงจาก /stock/approved-requests และ POST /stock/fulfill</p>
          </div>
          <div className="space-y-4">
            {(approvedRequests ?? []).map((request) => (
              <div key={request.requestId} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{request.requestId}</p>
                    <p className="text-xs text-slate-500">Order: {request.orderId} • ลูกค้า {request.customerId}</p>
                  </div>
                  <button onClick={() => setSelectedRequestId(request.requestId)} className="text-xs text-primary-600">
                    ดูรายการ
                  </button>
                </div>
                {selectedRequestId === request.requestId && requestItems && (
                  <ul className="mt-3 space-y-3 text-sm text-slate-600">
                    {requestItems.map((item) => (
                      <li key={item.requestItemId} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                        <div>
                          <p className="font-medium text-slate-700">{item.productId}</p>
                          <p className="text-xs text-slate-500">คงเหลือ {item.remainingQty}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {Array.from(new Set([1, item.remainingQty])).map((qty, idx) => (
                            <button
                              key={`${item.requestItemId}-${idx}`}
                              onClick={() => handleFulfill(item.requestItemId, qty)}
                              className="rounded-lg bg-primary-600 px-3 py-1 text-xs font-semibold text-white"
                            >
                              เบิก {qty}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {(approvedRequests?.length ?? 0) === 0 && <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">ยังไม่มีคำขอที่อนุมัติ</p>}
          </div>
        </section>
      )}

      {canFulfill && (
        <section className="card space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">คำขอที่พร้อมปิด</h2>
            <p className="text-sm text-slate-500">ใช้ /requests/ready-to-close และ PUT /requests/{'{id}'}/close</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(readyToClose ?? []).map((request) => (
              <div key={request.requestId} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-800">{request.requestId}</p>
                <p className="mt-1 text-xs text-slate-500">Order: {request.orderId}</p>
                <button onClick={() => handleCloseRequest(request.requestId)} className="mt-3 w-full bg-primary-600 py-2 text-xs font-semibold text-white">
                  ปิดคำขอ
                </button>
              </div>
            ))}
            {(readyToClose?.length ?? 0) === 0 && <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">ยังไม่มีคำขอที่พร้อมปิด</p>}
          </div>
        </section>
      )}
    </div>
  );
}
