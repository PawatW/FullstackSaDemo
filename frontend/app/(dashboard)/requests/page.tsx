'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../../components/AuthContext';
import { apiFetch } from '../../../lib/api';
import { useAuthedSWR } from '../../../lib/swr';
import type { Order, OrderItem, Product, Request, RequestItem } from '../../../lib/types';

interface DraftRequestItem {
  productId: string;
  quantity: number;
}

export default function RequestsPage() {
  const { role, token, staffId } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [warehouseModalRequestId, setWarehouseModalRequestId] = useState<string | null>(null);
  const [inspectedRequestId, setInspectedRequestId] = useState<string | null>(null);
  const [isTechnicianModalOpen, setTechnicianModalOpen] = useState(false);
  const [foremanExpandedRequestId, setForemanExpandedRequestId] = useState<string | null>(null);
  const [draftItems, setDraftItems] = useState<DraftRequestItem[]>([{ productId: '', quantity: 1 }]);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [fulfillQuantities, setFulfillQuantities] = useState<Record<string, number>>({});
  const [fulfilling, setFulfilling] = useState<Record<string, boolean>>({});
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');

  const { data: confirmedOrders } = useAuthedSWR<Order[]>(role === 'TECHNICIAN' || role === 'ADMIN' ? '/orders/confirmed' : null, token);
  const { data: products } = useAuthedSWR<Product[]>('/products', token);
  const { data: selectedOrderItems } = useAuthedSWR<OrderItem[]>(
    selectedOrderId ? `/orders/${selectedOrderId}/items` : null,
    token
  );
  const { data: pendingRequests, mutate: mutatePending } = useAuthedSWR<Request[]>(role === 'FOREMAN' || role === 'ADMIN' ? '/requests/pending' : null, token, { refreshInterval: 15000 });
  const { data: approvedRequests, mutate: mutateApproved } = useAuthedSWR<Request[]>(role === 'WAREHOUSE' || role === 'ADMIN' ? '/stock/approved-requests' : null, token, { refreshInterval: 15000 });
  const { data: allRequests } = useAuthedSWR<Request[]>('/requests', token, { refreshInterval: 30000 });
  const canClose = role === 'TECHNICIAN' || role === 'ADMIN';
  const { data: readyToClose, mutate: mutateReady } = useAuthedSWR<Request[]>(canClose ? '/requests/ready-to-close' : null, token, {
    refreshInterval: 30000
  });
  const { data: foremanRequestItems } = useAuthedSWR<RequestItem[]>(
    foremanExpandedRequestId ? `/requests/${foremanExpandedRequestId}/items` : null,
    token
  );
  const { data: warehouseRequestItems } = useAuthedSWR<RequestItem[]>(
    warehouseModalRequestId ? `/requests/${warehouseModalRequestId}/items` : null,
    token
  );
  const { data: technicianRequestItems } = useAuthedSWR<RequestItem[]>(
    inspectedRequestId ? `/requests/${inspectedRequestId}/items` : null,
    token,
    {
      revalidateOnFocus: false
    }
  );

  const canCreate = role === 'TECHNICIAN' || role === 'ADMIN';
  const canApprove = role === 'FOREMAN' || role === 'ADMIN';
  const canFulfill = role === 'WAREHOUSE' || role === 'ADMIN';

  const isWarehouseModalOpen = warehouseModalRequestId !== null;

  const sortedPendingRequests = useMemo(() => {
    const data = pendingRequests ?? [];
    return [...data].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [pendingRequests]);

  const filteredPendingRequests = useMemo(() => {
    const query = pendingSearch.trim().toLowerCase();
    if (!query) {
      return sortedPendingRequests;
    }
    return sortedPendingRequests.filter((request) => {
      const haystack = [
        request.requestId,
        request.orderId ?? '',
        request.customerId ?? '',
        request.staffId ?? '',
        request.status ?? '',
        request.description ?? ''
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [sortedPendingRequests, pendingSearch]);

  const sortedAllRequests = useMemo(() => {
    const data = allRequests ?? [];
    return [...data].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [allRequests]);

  const technicianRequests = useMemo(() => {
    if (role !== 'TECHNICIAN') {
      return [] as Request[];
    }
    if (!staffId) {
      return sortedAllRequests;
    }
    return sortedAllRequests.filter((request) => request.staffId === staffId);
  }, [role, staffId, sortedAllRequests]);

  const inspectedRequest = useMemo(() => {
    if (!inspectedRequestId) {
      return null;
    }
    return sortedAllRequests.find((request) => request.requestId === inspectedRequestId) ?? null;
  }, [sortedAllRequests, inspectedRequestId]);

  const warehouseActiveRequest = useMemo(() => {
    if (!warehouseModalRequestId) {
      return null;
    }
    return (approvedRequests ?? []).find((request) => request.requestId === warehouseModalRequestId) ?? null;
  }, [approvedRequests, warehouseModalRequestId]);

  const warehouseActiveItems = useMemo(() => {
    if (!warehouseModalRequestId) {
      return [];
    }
    return (warehouseRequestItems ?? []).filter((item) => item.requestId === warehouseModalRequestId);
  }, [warehouseModalRequestId, warehouseRequestItems]);

  const isWarehouseItemsLoading = isWarehouseModalOpen && warehouseModalRequestId !== null && !warehouseRequestItems;

  const totalQuantity = useMemo(() => draftItems.reduce((sum, item) => sum + (item.quantity || 0), 0), [draftItems]);

  const orderItemByProductId = useMemo(() => {
    const map = new Map<string, OrderItem>();
    (selectedOrderItems ?? []).forEach((item) => {
      if (!map.has(item.productId)) {
        map.set(item.productId, item);
      }
    });
    return map;
  }, [selectedOrderItems]);

  useEffect(() => {
    setFulfillQuantities({});
    setFulfilling({});
  }, [warehouseModalRequestId]);

  useEffect(() => {
    if (foremanExpandedRequestId && !(pendingRequests ?? []).some((request) => request.requestId === foremanExpandedRequestId)) {
      setForemanExpandedRequestId(null);
    }
  }, [foremanExpandedRequestId, pendingRequests]);

  useEffect(() => {
    if (
      warehouseModalRequestId &&
      !(approvedRequests ?? []).some((request) => request.requestId === warehouseModalRequestId)
    ) {
      setWarehouseModalRequestId(null);
    }
  }, [warehouseModalRequestId, approvedRequests]);

  useEffect(() => {
    if (inspectedRequestId && !(sortedAllRequests ?? []).some((request) => request.requestId === inspectedRequestId)) {
      setTechnicianModalOpen(false);
      setInspectedRequestId(null);
    }
  }, [inspectedRequestId, sortedAllRequests]);

  const updateDraftItem = (index: number, patch: Partial<DraftRequestItem>) => {
    setDraftItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const addDraftRow = () => setDraftItems((prev) => [...prev, { productId: '', quantity: 1 }]);
  const removeDraftRow = (index: number) => setDraftItems((prev) => prev.filter((_, idx) => idx !== index));

  const resetCreateForm = () => {
    setSelectedOrderId('');
    setDraftItems([{ productId: '', quantity: 1 }]);
    setFormResetKey((prev) => prev + 1);
  };

  const productOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    (selectedOrderItems ?? []).forEach((item) => {
      if (seen.has(item.productId)) {
        return;
      }
      seen.add(item.productId);
      const product = (products ?? []).find((candidate) => candidate.productId === item.productId);
      options.push({
        value: item.productId,
        label: product ? `${product.productName} (${product.productId})` : item.productId
      });
    });
    return options;
  }, [products, selectedOrderItems]);

  const allowedProductIds = useMemo(() => new Set(productOptions.map((option) => option.value)), [productOptions]);

  useEffect(() => {
    setDraftItems((prev) => {
      let mutated = false;
      const next = prev.map((item) => {
        if (item.productId && !allowedProductIds.has(item.productId)) {
          mutated = true;
          return { ...item, productId: '' };
        }
        return item;
      });
      return mutated ? next : prev;
    });
  }, [allowedProductIds]);

  useEffect(() => {
    setDraftItems((prev) => {
      let mutated = false;
      const next = prev.map((item) => {
        if (!item.productId) {
          return item;
        }
        const orderItem = orderItemByProductId.get(item.productId);
        if (!orderItem) {
          if (item.quantity !== 0) {
            mutated = true;
            return { ...item, quantity: 0 };
          }
          return item;
        }
        const available = orderItem.remainingQty;
        const safeQuantity = available <= 0 ? 0 : Math.min(available, Math.max(1, item.quantity));
        if (safeQuantity !== item.quantity) {
          mutated = true;
          return { ...item, quantity: safeQuantity };
        }
        return item;
      });
      return mutated ? next : prev;
    });
  }, [orderItemByProductId]);

  const handleOrderSelection = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDraftItems([{ productId: '', quantity: 1 }]);
    setFormResetKey((prev) => prev + 1);
  };

  const handleCreateRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(form);
    const orderId = selectedOrderId || String(formData.get('orderId'));
    if (!orderId) {
      setError('กรุณาเลือก Order ที่ยืนยัน');
      return;
    }
    const requestDate = String(formData.get('requestDate'));
    const description = String(formData.get('description') || '');

    const selectedOrder = confirmedOrders?.find((order) => order.orderId === orderId);
    const customerId = selectedOrder?.customerId;

    const preparedItems = draftItems
      .filter((item) => item.productId && item.quantity > 0 && allowedProductIds.has(item.productId))
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        fulfilledQty: 0,
        remainingQty: item.quantity
      }));

    if (preparedItems.length === 0) {
      setError('กรุณาเลือกรายการสินค้าที่เกี่ยวข้องกับ Order');
      return;
    }

    const requestedByProduct = new Map<string, number>();
    for (const item of preparedItems) {
      const orderItem = orderItemByProductId.get(item.productId);
      const available = orderItem?.remainingQty ?? 0;
      const nextRequested = (requestedByProduct.get(item.productId) ?? 0) + item.quantity;
      if (nextRequested > available) {
        const productLabel = products?.find((product) => product.productId === item.productId)?.productName;
        const nameOrId = productLabel ? `${productLabel} (${item.productId})` : item.productId;
        setError(`จำนวนที่ขอเบิก (${nextRequested}) เกินจำนวนคงเหลือ (${available}) สำหรับสินค้า ${nameOrId}`);
        return;
      }
      requestedByProduct.set(item.productId, nextRequested);
    }

    const payload = {
      request: {
        orderId,
        customerId,
        requestDate,
        status: 'Awaiting Approval',
        description
      },
      items: preparedItems
    };

    try {
      await apiFetch<string>('/requests', {
        method: 'POST',
        body: JSON.stringify(payload),
        token
      });
      form.reset();
      resetCreateForm();
      setCreateModalOpen(false);
      mutatePending();
      mutateApproved();
      setSuccessMessage('สร้างคำขอเบิกสำเร็จ');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถสร้างคำขอเบิกได้');
    }
  };

  const handleApprove = async (requestId: string, action: 'approve' | 'reject') => {
    if (!token) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await apiFetch<void>(`/requests/${requestId}/${action}`, {
        method: 'PUT',
        token
      });
      mutatePending();
      mutateApproved();
      setForemanExpandedRequestId((current) => (current === requestId ? null : current));
      setSuccessMessage(action === 'approve' ? 'อนุมัติคำขอเรียบร้อย' : 'ปฏิเสธคำขอเรียบร้อย');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const handleFulfill = async (requestItemId: string, fulfillQty: number) => {
    if (!token) return;
    if (fulfillQty <= 0) {
      setError('จำนวนที่เบิกต้องมากกว่า 0');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setFulfilling((prev) => ({ ...prev, [requestItemId]: true }));
    try {
      await apiFetch<void>('/stock/fulfill', {
        method: 'POST',
        body: JSON.stringify({ requestItemId, fulfillQty }),
        token
      });
      mutateApproved();
      mutateReady();
      setFulfillQuantities((prev) => {
        const next = { ...prev };
        delete next[requestItemId];
        return next;
      });
      setSuccessMessage('บันทึกการเบิกเรียบร้อย');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถเบิกสินค้าได้');
    } finally {
      setFulfilling((prev) => ({ ...prev, [requestItemId]: false }));
    }
  };

  const handleCloseRequest = async (requestId: string) => {
    if (!token) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await apiFetch<void>(`/requests/${requestId}/close`, {
        method: 'PUT',
        token
      });
      mutateReady();
      setSuccessMessage('ปิดคำขอเรียบร้อย');
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
      {successMessage && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{successMessage}</div>
      )}

      {canCreate && (
        <section className="card space-y-4 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Technician: สร้างคำขอเบิก</h2>
              <p className="text-sm text-slate-500">POST /requests พร้อมรายการสินค้า</p>
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
              เปิดฟอร์มสร้างคำขอ
            </button>
          </div>
        </section>
      )}

      {canFulfill && isWarehouseModalOpen && warehouseModalRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl">
            <div className="max-h-[85vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">รายการคำขอสำหรับเบิก</h2>
                  {warehouseActiveRequest ? (
                    <p className="text-sm text-slate-500">
                      {warehouseActiveRequest.requestId} • Order {warehouseActiveRequest.orderId ?? '-'} • ลูกค้า {warehouseActiveRequest.customerId ?? '-'}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">กำลังโหลดข้อมูลคำขอ...</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWarehouseModalRequestId(null);
                    setFulfillQuantities({});
                    setFulfilling({});
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  ปิด
                </button>
              </div>

              <div className="mt-6 space-y-6 text-sm text-slate-700">
                {warehouseActiveRequest && (
                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 md:grid-cols-2">
                    <div>
                      <p className="font-semibold text-slate-600">สถานะ</p>
                      <p className="mt-1 text-slate-800">{warehouseActiveRequest.status}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-600">วันที่ร้องขอ</p>
                      <p className="mt-1 text-slate-800">{format(new Date(warehouseActiveRequest.requestDate), 'dd MMM yyyy HH:mm')}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-600">ผู้ร้องขอ</p>
                      <p className="mt-1 text-slate-800">{warehouseActiveRequest.staffId}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-600">ผู้อนุมัติ</p>
                      <p className="mt-1 text-slate-800">{warehouseActiveRequest.approvedBy ?? '-'}</p>
                    </div>
                    {warehouseActiveRequest.description && (
                      <div className="md:col-span-2">
                        <p className="font-semibold text-slate-600">รายละเอียด</p>
                        <p className="mt-1 text-slate-700">{warehouseActiveRequest.description}</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-slate-800">รายการสินค้า</h3>
                  {isWarehouseItemsLoading ? (
                    <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">กำลังโหลดรายการสินค้า...</p>
                  ) : warehouseActiveItems.length > 0 ? (
                    <ul className="mt-3 space-y-3">
                      {warehouseActiveItems.map((item) => {
                        const maxQty = item.remainingQty;
                        const storedQty = fulfillQuantities[item.requestItemId];
                        const plannedQty = storedQty !== undefined ? storedQty : maxQty > 0 ? 1 : 0;
                        const quantityForInput = maxQty > 0 ? Math.min(plannedQty, maxQty) : 0;
                        const isProcessing = fulfilling[item.requestItemId];
                        const disableActions = maxQty <= 0 || isProcessing;
                        const buttonLabel = maxQty <= 0 ? 'เบิกครบแล้ว' : isProcessing ? 'กำลังบันทึก...' : 'บันทึกการเบิก';

                        return (
                          <li
                            key={item.requestItemId}
                            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <p className="font-medium text-slate-800">{item.productId}</p>
                              <p className="text-xs text-slate-500">จำนวนที่ร้องขอ {item.quantity} • คงเหลือ {item.remainingQty}</p>
                            </div>
                            <div className="flex flex-col items-stretch gap-2 text-xs md:flex-row md:items-center md:gap-3">
                              <input
                                type="number"
                                min={maxQty > 0 ? 1 : 0}
                                max={maxQty > 0 ? maxQty : undefined}
                                value={maxQty > 0 ? quantityForInput : 0}
                                onChange={(event) => {
                                  if (maxQty <= 0) {
                                    return;
                                  }
                                  const nextValue = Number(event.target.value);
                                  const sanitized = Number.isFinite(nextValue)
                                    ? Math.min(maxQty, Math.max(1, Math.trunc(nextValue)))
                                    : 1;
                                  setFulfillQuantities((prev) => ({ ...prev, [item.requestItemId]: sanitized }));
                                }}
                                disabled={maxQty <= 0 || isProcessing}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm text-slate-700 md:w-32"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const quantityToFulfill = maxQty > 0 ? Math.max(1, Math.min(quantityForInput, maxQty)) : 0;
                                  handleFulfill(item.requestItemId, quantityToFulfill);
                                }}
                                disabled={disableActions}
                                className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {buttonLabel}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">ยังไม่มีรายการสินค้า</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {canCreate && isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl">
              <div className="max-h-[85vh] overflow-y-auto p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">สร้างคำขอเบิกวัสดุ</h2>
                    <p className="text-sm text-slate-500">กรอกข้อมูลคำขอและรายการสินค้าให้ครบถ้วนก่อนยืนยัน</p>
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
                <form key={formResetKey} onSubmit={handleCreateRequest} className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-medium text-slate-500">อ้างอิง Order ที่ยืนยัน</label>
                  <select
                    name="orderId"
                    required
                    value={selectedOrderId}
                    onChange={(event) => handleOrderSelection(event.target.value)}
                  >
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">รายการสินค้า</p>
                  <button
                    type="button"
                    onClick={addDraftRow}
                    disabled={!selectedOrderId || productOptions.length === 0}
                    className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    เพิ่มสินค้า
                  </button>
                </div>
                <div className="space-y-3">
                  {draftItems.map((item, index) => {
                    const orderItem = item.productId ? orderItemByProductId.get(item.productId) : undefined;
                    const available = orderItem?.remainingQty ?? 0;
                    const isOutOfStock = item.productId ? available <= 0 : false;
                    const quantityValue = isOutOfStock ? 0 : item.quantity;

                    return (
                      <div key={`${formResetKey}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-4">
                        <div className="md:col-span-2">
                          <select
                            value={item.productId}
                            onChange={(event) => {
                              const nextProductId = event.target.value;
                              const nextOrderItem = orderItemByProductId.get(nextProductId);
                              const initialQuantity = nextOrderItem && nextOrderItem.remainingQty > 0 ? 1 : 0;
                              updateDraftItem(index, { productId: nextProductId, quantity: initialQuantity });
                            }}
                            disabled={!selectedOrderId || productOptions.length === 0}
                            className="w-full"
                          >
                            <option value="">เลือกสินค้า</option>
                            {productOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            type="number"
                            min={isOutOfStock ? 0 : 1}
                            max={isOutOfStock ? undefined : available}
                            value={quantityValue}
                            onChange={(event) => {
                              const rawValue = Number(event.target.value);
                              const sanitized = Number.isFinite(rawValue) ? Math.max(1, Math.trunc(rawValue)) : 1;
                              const clamped = available > 0 ? Math.min(available, sanitized) : sanitized;
                              updateDraftItem(index, { quantity: clamped });
                            }}
                            disabled={isOutOfStock}
                            className="w-full"
                          />
                        </div>
                        {draftItems.length > 1 && (
                          <button type="button" onClick={() => removeDraftRow(index)} className="text-xs text-rose-500">
                            ลบ
                          </button>
                        )}
                        <div className="md:col-span-4 space-y-1 text-xs">
                          {item.productId && <p className="text-slate-500">คงเหลือใน Order {available} ชิ้น</p>}
                          {item.productId && item.quantity > available && available >= 0 && (
                            <p className="text-rose-500">จำนวนที่ขอเบิกเกินจำนวนใน Order</p>
                          )}
                          {isOutOfStock && <p className="text-amber-600">สินค้าใน Order หมดแล้ว ไม่สามารถเบิกได้</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                  <span>จำนวนสินค้ารวม</span>
                  <span className="font-semibold text-slate-800">{totalQuantity} ชิ้น</span>
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
                <button type="submit" className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white">
                  บันทึกคำขอเบิก
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )}

      {canApprove && (
        <section className="card space-y-4 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Foreman: รออนุมัติ</h2>
              <p className="text-sm text-slate-500">แสดงรายการจาก /requests/pending และกดเพื่อดูรายละเอียดก่อนอนุมัติ</p>
            </div>
            <input
              type="search"
              value={pendingSearch}
              onChange={(event) => setPendingSearch(event.target.value)}
              placeholder="ค้นหา Request..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 md:w-64"
            />
          </div>
          <div className="space-y-3">
            {filteredPendingRequests.map((request) => {
              const isExpanded = foremanExpandedRequestId === request.requestId;
              const itemsForRequest = (foremanRequestItems ?? []).filter(
                (item) => item.requestId === request.requestId
              );
              const isLoadingItems = isExpanded && !foremanRequestItems;
              return (
                <div key={request.requestId} className="rounded-2xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setForemanExpandedRequestId(isExpanded ? null : request.requestId)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                      isExpanded ? 'border-b border-slate-200 bg-slate-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{request.requestId}</p>
                      <p className="text-xs text-slate-500">Order: {request.orderId || '-'} • ขอโดย {request.staffId}</p>
                    </div>
                    <span className="text-xs text-slate-400">{format(new Date(request.requestDate), 'dd MMM yyyy')}</span>
                  </button>
                  {isExpanded && (
                    <div className="space-y-4 px-4 pb-4 pt-3 text-sm text-slate-600">
                      {request.description && <p className="text-slate-600">{request.description}</p>}
                      <div>
                        <p className="text-xs font-semibold text-slate-500">รายการสินค้า</p>
                        {isLoadingItems ? (
                          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">กำลังโหลดรายการสินค้า...</p>
                        ) : itemsForRequest.length > 0 ? (
                            <ul className="mt-2 space-y-2">
                              {itemsForRequest.map((item) => (
                                <li key={item.requestItemId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                  <span>
                                    {item.productId} • {item.quantity} ชิ้น
                                  </span>
                                  <span className="text-xs text-slate-500">คงเหลือ {item.remainingQty}</span>
                                </li>
                              ))}
                            </ul>
                        ) : (
                          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">ยังไม่มีรายการสินค้า</p>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => handleApprove(request.requestId, 'approve')}
                          className="flex-1 rounded-xl bg-emerald-500 py-2 font-semibold text-white hover:bg-emerald-600"
                        >
                          อนุมัติ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(request.requestId, 'reject')}
                          className="flex-1 rounded-xl bg-rose-500 py-2 font-semibold text-white hover:bg-rose-600"
                        >
                          ปฏิเสธ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredPendingRequests.length === 0 && (
              <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                {pendingRequests && pendingRequests.length > 0 ? 'ไม่พบคำขอตามคำค้นหา' : 'ไม่มีคำขอรออนุมัติ'}
              </p>
            )}
          </div>
        </section>
      )}

      {role === 'TECHNICIAN' && (
        <section className="card space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Technician: คำขอของฉัน</h2>
            <p className="text-sm text-slate-500">ดึงจาก /requests และสามารถเปิดดูรายละเอียดได้</p>
          </div>
          <div className="space-y-3">
            {allRequests === undefined ? (
              <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">กำลังโหลดคำขอ...</p>
            ) : technicianRequests.length > 0 ? (
              technicianRequests.map((request) => (
                <button
                  key={request.requestId}
                  type="button"
                  onClick={() => {
                    setInspectedRequestId(request.requestId);
                    setTechnicianModalOpen(true);
                  }}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    inspectedRequestId === request.requestId
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-slate-200 hover:border-primary-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-slate-800">{request.requestId}</p>
                      <p className="text-xs text-slate-500">
                        Order: {request.orderId ?? '-'} • สถานะ: {request.status}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {format(new Date(request.requestDate), 'dd MMM yyyy')}
                    </span>
                  </div>
                  {request.description && (
                    <p className="mt-2 text-xs text-slate-500">{request.description}</p>
                  )}
                </button>
              ))
            ) : (
              <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">ยังไม่มีคำขอที่คุณสร้าง</p>
            )}
          </div>
        </section>
      )}

      {role === 'TECHNICIAN' && isTechnicianModalOpen && inspectedRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="max-h-[85vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">รายละเอียดคำขอเบิก</h2>
                  {inspectedRequest ? (
                    <div className="space-y-1 text-sm text-slate-500">
                      <p>
                        {inspectedRequest.requestId} • Order {inspectedRequest.orderId ?? '-'} • ลูกค้า {inspectedRequest.customerId ?? '-'}
                      </p>
                      <p>
                        วันที่ {format(new Date(inspectedRequest.requestDate), 'dd MMM yyyy HH:mm')} • สถานะ {inspectedRequest.status}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">กำลังโหลดข้อมูลคำขอ...</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTechnicianModalOpen(false);
                    setInspectedRequestId(null);
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  ปิด
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {inspectedRequest?.description && (
                  <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{inspectedRequest.description}</p>
                )}

                {technicianRequestItems ? (
                  technicianRequestItems.length > 0 ? (
                    <div className="space-y-3">
                      {technicianRequestItems.map((item) => (
                        <div
                          key={item.requestItemId}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
                        >
                          <div>
                            <p className="font-medium text-slate-800">{item.productId}</p>
                            <p className="text-xs text-slate-500">
                              จำนวน {item.quantity} • คงเหลือ {item.remainingQty}
                            </p>
                          </div>
                          <span className="text-xs text-slate-500">เบิกแล้ว {item.fulfilledQty}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">ยังไม่มีรายการสินค้าในคำขอนี้</p>
                  )
                ) : (
                  <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">กำลังโหลดรายการสินค้า...</p>
                )}

                {inspectedRequest && (
                  <div className="grid gap-3 rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-600 md:grid-cols-2">
                    <div>
                      <p className="font-semibold text-slate-700">ผู้ร้องขอ</p>
                      <p className="mt-1 text-slate-800">{inspectedRequest.staffId}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">อนุมัติโดย</p>
                      <p className="mt-1 text-slate-800">{inspectedRequest.approvedBy ?? '-'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">วันที่อนุมัติ</p>
                      <p className="mt-1 text-slate-800">
                        {inspectedRequest.approvedDate
                          ? format(new Date(inspectedRequest.approvedDate), 'dd MMM yyyy HH:mm')
                          : '-'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {canFulfill && (
        <section className="card space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Warehouse: คำขอที่อนุมัติแล้ว</h2>
            <p className="text-sm text-slate-500">ดึงจาก /stock/approved-requests และ POST /stock/fulfill</p>
          </div>
          <div className="space-y-4">
            {(approvedRequests ?? []).map((request) => {
              const isActive = isWarehouseModalOpen && warehouseModalRequestId === request.requestId;
              return (
                <div
                  key={request.requestId}
                  className={`rounded-2xl border bg-white p-4 transition ${
                    isActive ? 'border-primary-200 bg-primary-50/40' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col gap-3 text-sm md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{request.requestId}</p>
                      <p className="text-xs text-slate-500">Order: {request.orderId} • ลูกค้า {request.customerId}</p>
                      {request.description && (
                        <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{request.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs md:flex-col md:items-end md:gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">{request.status}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setWarehouseModalRequestId(request.requestId);
                        }}
                        className="rounded-xl bg-primary-600 px-4 py-2 font-semibold text-white"
                      >
                        ดูรายละเอียด
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {(approvedRequests?.length ?? 0) === 0 && <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">ยังไม่มีคำขอที่อนุมัติ</p>}
          </div>
        </section>
      )}

      {canClose && (
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

      <section className="card space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">รายการคำขอทั้งหมด</h2>
          <p className="text-sm text-slate-500">ดึงจาก /requests และเรียงตามวันที่ล่าสุดก่อน</p>
        </div>
        <div className="space-y-3">
          {sortedAllRequests.map((request) => (
            <div key={request.requestId} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-2 text-sm md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{request.requestId}</p>
                  <p className="text-xs text-slate-500">
                    วันที่ {format(new Date(request.requestDate), 'dd MMM yyyy')} • Order: {request.orderId ?? '-'}
                  </p>
                </div>
                <div className="text-xs">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">{request.status}</span>
                </div>
              </div>
              {request.description && <p className="mt-3 text-sm text-slate-600">{request.description}</p>}
            </div>
          ))}
          {sortedAllRequests.length === 0 && (
            <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">ยังไม่มีคำขอ</p>
          )}
        </div>
      </section>
    </div>
  );
}
