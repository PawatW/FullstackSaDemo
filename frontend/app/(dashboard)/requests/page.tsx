'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../../components/AuthContext';
import { apiFetch } from '../../../lib/api';
import { useAuthedSWR } from '../../../lib/swr';
import type { Customer, Order, OrderItem, Product, Request, RequestItem } from '../../../lib/types';
import { SearchableSelect, type SearchableOption } from '../../../components/SearchableSelect';

interface DraftRequestItem {
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

const formatDateTime = (value?: string | number | null, pattern = 'dd MMM yyyy HH:mm') => {
  const date = parseDateTime(value);
  return date ? format(date, pattern) : '-';
};

export default function RequestsPage() {
  const { role, token, staffId } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [warehouseExpandedRequestId, setWarehouseExpandedRequestId] = useState<string | null>(null);
  const [foremanExpandedRequestId, setForemanExpandedRequestId] = useState<string | null>(null);
  const [draftItems, setDraftItems] = useState<DraftRequestItem[]>([{ productId: '', quantity: 1 }]);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [fulfillQuantities, setFulfillQuantities] = useState<Record<string, number>>({});
  const [isWarehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [createOrderSearch, setCreateOrderSearch] = useState('');
  const [technicianExpandedRequestId, setTechnicianExpandedRequestId] = useState<string | null>(null);
  const [warehouseModalRequestId, setWarehouseModalRequestId] = useState<string | null>(null);
  // const [warehouseRequestSearch, setWarehouseRequestSearch] = useState('');
  const [isFulfillSubmitting, setFulfillSubmitting] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderPreviewId, setOrderPreviewId] = useState<string | null>(null);
  const [isOrderPreviewOpen, setOrderPreviewOpen] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');
  const [allRequestsSearch, setAllRequestsSearch] = useState('');
  const [inspectedAllRequestId, setInspectedAllRequestId] = useState<string | null>(null);
  const [isAllRequestModalOpen, setAllRequestModalOpen] = useState(false);
  const [existingRequestTotals, setExistingRequestTotals] = useState<Map<string, number>>(() => new Map());
  const [existingTotalsError, setExistingTotalsError] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Map<string, string>>(() => new Map());
  const [inspectedReadyRequestId, setInspectedReadyRequestId] = useState<string | null>(null);
  const [isReadyRequestModalOpen, setReadyRequestModalOpen] = useState(false);
  const [isLoadingExistingTotals, setLoadingExistingTotals] = useState(false);

  const { data: confirmedOrders } = useAuthedSWR<Order[]>(role === 'TECHNICIAN' ? '/orders/confirmed' : null, token);
  const { data: customers } = useAuthedSWR<Customer[]>('/customers', token);
  const { data: products, mutate: mutateProducts } = useAuthedSWR<Product[]>('/products', token);
  const {
    data: selectedOrderItems,
    error: selectedOrderItemsError,
    isLoading: isSelectedOrderItemsLoading
  } = useAuthedSWR<OrderItem[]>(selectedOrderId ? `/orders/${selectedOrderId}/items` : null, token);
  const hasOrderItemsError = Boolean(selectedOrderItemsError);
  const previewItemsKey = orderPreviewId && orderPreviewId !== selectedOrderId ? `/orders/${orderPreviewId}/items` : null;
  const { data: previewOrderItems } = useAuthedSWR<OrderItem[]>(previewItemsKey, token);
  const { data: pendingRequests, mutate: mutatePending } = useAuthedSWR<Request[]>(role === 'FOREMAN' ? '/requests/pending' : null, token, { refreshInterval: 15000 });
  const { data: approvedRequests, mutate: mutateApproved } = useAuthedSWR<Request[]>(role === 'WAREHOUSE' ? '/stock/approved-requests' : null, token, { refreshInterval: 15000 });
  const { data: allRequests } = useAuthedSWR<Request[]>('/requests', token, { refreshInterval: 30000 });
  const canClose = role === 'TECHNICIAN';
  const { data: readyToClose, mutate: mutateReady } = useAuthedSWR<Request[]>(canClose ? '/requests/ready-to-close' : null, token, {
    refreshInterval: 30000
  });
 
  // ดึงข้อมูลสำหรับ Warehouse Modal
  const { data: warehouseModalItems, isLoading: isWarehouseItemsLoading } = useAuthedSWR<RequestItem[]>(
    warehouseModalRequestId ? `/requests/${warehouseModalRequestId}/items` : null,
    token
  );
  const { data: readyRequestItems, isLoading: isReadyRequestItemsLoading } = useAuthedSWR<RequestItem[]>(
    inspectedReadyRequestId ? `/requests/${inspectedReadyRequestId}/items` : null,
    token,
    { revalidateOnFocus: false }
  );
  const { data: foremanRequestItems } = useAuthedSWR<RequestItem[]>(
    foremanExpandedRequestId ? `/requests/${foremanExpandedRequestId}/items` : null,
    token
  );
  const { data: warehouseRequestItems } = useAuthedSWR<RequestItem[]>(
    warehouseExpandedRequestId ? `/requests/${warehouseExpandedRequestId}/items` : null,
    token
  );
  const { data: technicianRequestItems } = useAuthedSWR<RequestItem[]>(
  technicianExpandedRequestId ? `/requests/${technicianExpandedRequestId}/items` : null,
  token
);
  const { data: allRequestItems } = useAuthedSWR<RequestItem[]>(
    inspectedAllRequestId ? `/requests/${inspectedAllRequestId}/items` : null,
    token,
    { revalidateOnFocus: false }
  );

  const canCreate = role === 'TECHNICIAN';
  const canApprove = role === 'FOREMAN';
  const canFulfill = role === 'WAREHOUSE';

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    (customers ?? []).forEach((customer) => {
      map.set(customer.customerId, customer);
    });
    return map;
  }, [customers]);

  const orderOptions = useMemo<SearchableOption[]>(() => {
    const data = confirmedOrders ?? [];
    return [...data]
      .sort((a, b) => getTimeValue(b.orderDate) - getTimeValue(a.orderDate))
      .map((order) => {
        const customerName = customerById.get(order.customerId)?.customerName;
        const customerLabel = customerName ? `${customerName} (${order.customerId})` : order.customerId;
        const formattedDate = formatDateTime(order.orderDate, 'dd MMM yyyy');
        const dateDetail = formattedDate === '-' ? null : `วันที่ ${formattedDate}`;
        const details = [
          dateDetail,
          order.status ? `สถานะ ${order.status}` : null,
          order.staffId ? `ผู้รับผิดชอบ ${order.staffId}` : null
        ]
          .filter(Boolean)
          .join(' • ');
        return {
          value: order.orderId,
          label: `${order.orderId} • ลูกค้า ${customerLabel}`,
          description: details || undefined,
          keywords: [order.orderId, order.customerId, customerName ?? '', order.status ?? '', order.staffId ?? '']
        } satisfies SearchableOption;
      });
  }, [confirmedOrders, customerById]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return null;
    }
    return (confirmedOrders ?? []).find((order) => order.orderId === selectedOrderId) ?? null;
  }, [confirmedOrders, selectedOrderId]);

  const selectedCustomerName = selectedOrder ? customerById.get(selectedOrder.customerId)?.customerName : undefined;

  const previewOrder = useMemo(() => {
    if (!orderPreviewId) {
      return null;
    }
    return (confirmedOrders ?? []).find((order) => order.orderId === orderPreviewId) ?? null;
  }, [confirmedOrders, orderPreviewId]);

  const previewCustomerName = previewOrder ? customerById.get(previewOrder.customerId)?.customerName : undefined;

  const orderItemsForSelectedOrder = useMemo(() => {
    if (!selectedOrderId || hasOrderItemsError) {
      return [] as OrderItem[];
    }
    const items = selectedOrderItems ?? [];
    if (items.length === 0) {
      return items;
    }
    if (items.some((item) => item.orderId && item.orderId !== selectedOrderId)) {
      return items.filter((item) => item.orderId === selectedOrderId);
    }
    return items;
  }, [selectedOrderId, selectedOrderItems, hasOrderItemsError]);

  const previewItems = useMemo(() => {
    if (!orderPreviewId) {
      return [] as OrderItem[];
    }
    if (orderPreviewId === selectedOrderId) {
      return orderItemsForSelectedOrder;
    }
    return previewOrderItems ?? [];
  }, [orderPreviewId, selectedOrderId, orderItemsForSelectedOrder, previewOrderItems]);

  const isPreviewLoading = useMemo(() => {
    if (!orderPreviewId) {
      return false;
    }
    if (orderPreviewId === selectedOrderId) {
      return Boolean(selectedOrderId) && isSelectedOrderItemsLoading;
    }
    return previewOrderItems === undefined;
  }, [orderPreviewId, selectedOrderId, isSelectedOrderItemsLoading, previewOrderItems]);

  const sortedPendingRequests = useMemo(() => {
    const data = pendingRequests ?? [];
    return [...data].sort((a, b) => getTimeValue(b.requestDate) - getTimeValue(a.requestDate));
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

  const sortedApprovedRequests = useMemo(() => {
    const data = approvedRequests ?? [];
    return [...data].sort((a, b) => getTimeValue(b.requestDate) - getTimeValue(a.requestDate));
  }, [approvedRequests]);

  // const filteredWarehouseRequests = useMemo(() => {
  //   const query = warehouseRequestSearch.trim().toLowerCase();
  //   if (!query) {
  //     return sortedApprovedRequests;
  //   }
  //   return sortedApprovedRequests.filter((request) => {
  //     const haystack = [
  //       request.requestId,
  //       request.orderId ?? '',
  //       request.customerId ?? '',
  //       request.staffId ?? '',
  //       request.status ?? '',
  //       request.description ?? ''
  //     ]
  //       .join(' ')
  //       .toLowerCase();
  //     return haystack.includes(query);
  //   });
  // }, [sortedApprovedRequests, warehouseRequestSearch]);

  const sortedAllRequests = useMemo(() => {
    const data = allRequests ?? [];
    return [...data].sort((a, b) => getTimeValue(b.requestDate) - getTimeValue(a.requestDate));
  }, [allRequests]);

  const filteredAllRequests = useMemo(() => {
    const query = allRequestsSearch.trim().toLowerCase();
    if (!query) {
      return sortedAllRequests;
    }
    return sortedAllRequests.filter((request) => {
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
  }, [sortedAllRequests, allRequestsSearch]);

  const warehouseRequestOptions = useMemo<SearchableOption[]>(() => {
    const data = sortedApprovedRequests ?? [];
    return data.map((request) => {
      const customerName = customerById.get(request.customerId ?? '')?.customerName;
      const customerLabel = customerName ? `${customerName} (${request.customerId})` : request.customerId;
      const formattedDate = formatDateTime(request.requestDate);
      const dateDetail = formattedDate === '-' ? null : `วันที่ ${formattedDate}`;
      const details = [
        dateDetail,
        `Order ${request.orderId ?? '-'}`,
        `ผู้ร้องขอ ${request.staffId ?? '-'}`
      ]
        .filter(Boolean)
        .join(' • ');

      return {
        value: request.requestId,
        label: `${request.requestId} • ลูกค้า ${customerLabel ?? '-'}`,
        description: details || undefined,
        keywords: [request.requestId, request.orderId ?? '', request.customerId ?? '', customerName ?? '', request.staffId ?? '', request.description ?? '']
      } satisfies SearchableOption;
    });
  }, [sortedApprovedRequests, customerById]);

  const inspectedAllRequest = useMemo(() => {
    if (!inspectedAllRequestId) {
      return null;
    }
    return sortedAllRequests.find((request) => request.requestId === inspectedAllRequestId) ?? null;
  }, [sortedAllRequests, inspectedAllRequestId]);
  const warehouseActiveRequest = useMemo(() => {
    if (!warehouseModalRequestId) {
      return null;
    }
    return (sortedApprovedRequests ?? []).find((request) => request.requestId === warehouseModalRequestId) ?? null;
  }, [sortedApprovedRequests, warehouseModalRequestId]);

  const inspectedReadyRequest = useMemo(() => {
    if (!inspectedReadyRequestId) {
      return null;
    }
    return (readyToClose ?? []).find((request) => request.requestId === inspectedReadyRequestId) ?? null;
  }, [readyToClose, inspectedReadyRequestId]);

  const totalQuantity = useMemo(() => draftItems.reduce((sum, item) => sum + (item.quantity || 0), 0), [draftItems]);


  const orderItemByProductId = useMemo(() => {
    const map = new Map<string, OrderItem>();
    orderItemsForSelectedOrder.forEach((item) => {
      if (!map.has(item.productId)) {
        map.set(item.productId, item);
      }
    });
    return map;
  }, [orderItemsForSelectedOrder]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    (products ?? []).forEach((product) => {
      map.set(product.productId, product);
    });
    return map;
  }, [products]);

  const warehouseActiveItems = warehouseModalItems ?? [];
  const canFulfillAny = useMemo(() => {
    if (warehouseActiveItems.length === 0) {
      return false;
    }
    return warehouseActiveItems.some((item) => {
      if (item.remainingQty <= 0) {
        return false;
      }
      const product = productById.get(item.productId);
      const stockAvailable = product?.quantity ?? 0;
      return stockAvailable > 0;
    });
  }, [warehouseActiveItems, productById]);

  useEffect(() => {
    if (statusOverrides.size === 0) {
      return;
    }
    setStatusOverrides((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      const next = new Map(prev);
      let changed = false;
      const findLatest = (requestId: string) =>
        (sortedApprovedRequests ?? []).find((request) => request.requestId === requestId) ??
        (readyToClose ?? []).find((request) => request.requestId === requestId) ??
        (sortedAllRequests ?? []).find((request) => request.requestId === requestId) ??
        null;
      prev.forEach((status, requestId) => {
        const latest = findLatest(requestId);
        if (latest && latest.status === status) {
          next.delete(requestId);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [statusOverrides, sortedApprovedRequests, readyToClose, sortedAllRequests]);

  useEffect(() => {
    if (
      inspectedReadyRequestId &&
      !(readyToClose ?? []).some((request) => request.requestId === inspectedReadyRequestId)
    ) {
      setInspectedReadyRequestId(null);
      setReadyRequestModalOpen(false);
    }
  }, [inspectedReadyRequestId, readyToClose]);

  const technicianRequests = useMemo(() => {
    const data = allRequests ?? [];
    if (role !== 'TECHNICIAN') return []; // Only calculate if relevant
    return data
      .filter((request) => request.staffId === staffId)
      .sort((a, b) => getTimeValue(b.requestDate) - getTimeValue(a.requestDate));
  }, [allRequests, staffId, role]);


  const loadExistingTotals = useCallback(
    async (orderId: string) => {
      if (!token) {
        return new Map<string, number>();
      }
      const relatedRequests = await apiFetch<Request[]>(`/requests?orderId=${encodeURIComponent(orderId)}`, { token });
      const relevantRequests = relatedRequests.filter((request) => {
        const normalizedStatus = (request.status ?? '').toLowerCase();
        return normalizedStatus !== 'rejected' && normalizedStatus !== 'cancelled';
      });
      if (relevantRequests.length === 0) {
        return new Map<string, number>();
      }
      const itemGroups = await Promise.all(
        relevantRequests.map((request) => apiFetch<RequestItem[]>(`/requests/${request.requestId}/items`, { token }))
      );
      const totals = new Map<string, number>();
      itemGroups.forEach((items) => {
        items.forEach((item) => {
          totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
        });
      });
      return totals;
    },
    [token]
  );

  

  const canOpenFulfillModal = sortedApprovedRequests.length > 0;

  useEffect(() => {
    setFulfillQuantities({});
  }, [warehouseExpandedRequestId]);

  useEffect(() => {
    if (foremanExpandedRequestId && !(pendingRequests ?? []).some((request) => request.requestId === foremanExpandedRequestId)) {
      setForemanExpandedRequestId(null);
    }
  }, [foremanExpandedRequestId, pendingRequests]);

  useEffect(() => {
    if (
      warehouseExpandedRequestId &&
      !(approvedRequests ?? []).some((request) => request.requestId === warehouseExpandedRequestId)
    ) {
      setWarehouseExpandedRequestId(null);
    }
  }, [warehouseExpandedRequestId, approvedRequests]);

  useEffect(() => {
    if (inspectedAllRequestId && !sortedAllRequests.some((request) => request.requestId === inspectedAllRequestId)) {
      setInspectedAllRequestId(null);
      setAllRequestModalOpen(false);
    }
  }, [inspectedAllRequestId, sortedAllRequests]);

  useEffect(() => {
    if (!selectedOrderId || !token) {
      setExistingRequestTotals(new Map());
      setExistingTotalsError(null);
      setLoadingExistingTotals(false);
      return;
    }
    let cancelled = false;
    setLoadingExistingTotals(true);
    loadExistingTotals(selectedOrderId)
      .then((totals) => {
        if (!cancelled) {
          console.log('--- TEST: 1. existingRequestTotals (Map) ---', totals);
          setExistingRequestTotals(totals);
          setExistingTotalsError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExistingRequestTotals(new Map());
          setExistingTotalsError('ไม่สามารถโหลดข้อมูลคำขอที่เกี่ยวข้องได้');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingExistingTotals(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedOrderId, token, loadExistingTotals]);

  const updateDraftItem = (index: number, patch: Partial<DraftRequestItem>) => {
    setDraftItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const addDraftRow = () => setDraftItems((prev) => [...prev, { productId: '', quantity: 1 }]);
  const removeDraftRow = (index: number) => setDraftItems((prev) => prev.filter((_, idx) => idx !== index));

  const resetCreateForm = () => {
    setSelectedOrderId('');
    setDraftItems([{ productId: '', quantity: 1 }]);
    setFormResetKey((prev) => prev + 1);
    setOrderPreviewId(null);
    setOrderPreviewOpen(false);
    setExistingRequestTotals(new Map());
    setExistingTotalsError(null);
    setLoadingExistingTotals(false);
  };

  const productOptions = useMemo(() => {
    if (!selectedOrderId || hasOrderItemsError) {
      return [];
    }
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    orderItemsForSelectedOrder.forEach((item) => {
      if (seen.has(item.productId)) {
        return;
      }
      seen.add(item.productId);
      const product = (products ?? []).find((candidate) => candidate.productId === item.productId);
      const totalOrdered = item.quantity ?? 0;
      const alreadyRequested = existingRequestTotals.get(item.productId) ?? 0;
      const remainingForRequest = Math.max(totalOrdered - alreadyRequested, 0);
      if (remainingForRequest <= 0) {
        return;
      }
      const baseLabel = product ? `${product.productName} (${product.productId})` : item.productId;
      const label = `${baseLabel} • จำนวน ${totalOrdered.toLocaleString('th-TH')} ชิ้น • เบิกแล้ว ${alreadyRequested.toLocaleString(
        'th-TH'
      )} ชิ้น • คงเหลือ ${remainingForRequest.toLocaleString('th-TH')} ชิ้น`;
      options.push({
        value: item.productId,
        label
      });
    });
    console.log('--- TEST: 2. productOptions (Array) ---', options);
    return options;
  }, [products, orderItemsForSelectedOrder, existingRequestTotals, selectedOrderId, hasOrderItemsError]);

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
        const alreadyRequested = existingRequestTotals.get(item.productId) ?? 0;
        const available = Math.max(orderItem.quantity - alreadyRequested, 0);
        const safeQuantity = available <= 0 ? 0 : Math.min(available, Math.max(1, item.quantity));
        if (safeQuantity !== item.quantity) {
          mutated = true;
          return { ...item, quantity: safeQuantity };
        }
        return item;
      });
      return mutated ? next : prev;
    });
  }, [orderItemByProductId, existingRequestTotals]);

  const handleOrderSelection = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDraftItems([{ productId: '', quantity: 1 }]);
    setFormResetKey((prev) => prev + 1);
    setExistingRequestTotals(new Map());
    setExistingTotalsError(null);
    setLoadingExistingTotals(Boolean(orderId));
    if (orderPreviewId !== orderId) {
      setOrderPreviewId(null);
    }
    setOrderPreviewOpen(false);
  };

  const handleAllRequestInspect = (requestId: string) => {
    if (inspectedAllRequestId === requestId) {
      setInspectedAllRequestId(null);
      setAllRequestModalOpen(false);
      return;
    }
    setInspectedAllRequestId(requestId);
    setAllRequestModalOpen(true);
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

    let latestTotals: Map<string, number>;
    try {
      setLoadingExistingTotals(true);
      latestTotals = await loadExistingTotals(orderId);
      setExistingRequestTotals(latestTotals);
      setExistingTotalsError(null);
    } catch (err) {
      setError('ไม่สามารถตรวจสอบคำขอที่เกี่ยวข้องได้ กรุณาลองใหม่อีกครั้ง');
      setExistingTotalsError('ไม่สามารถโหลดข้อมูลคำขอที่เกี่ยวข้องได้');
      setLoadingExistingTotals(false);
      return;
    }

    const requestedByProduct = new Map<string, number>();
    for (const item of preparedItems) {
      const orderItem = orderItemByProductId.get(item.productId);
      if (!orderItem) {
        setError('ไม่พบสินค้าใน Order ที่เลือก');
        setLoadingExistingTotals(false);
        return;
      }
      const productLabel = products?.find((product) => product.productId === item.productId)?.productName;
      const nameOrId = productLabel ? `${productLabel} (${item.productId})` : item.productId;
      const alreadyRequested = latestTotals.get(item.productId) ?? 0;
      const nextRequestedForThisRequest = (requestedByProduct.get(item.productId) ?? 0) + item.quantity;
      const totalRequested = alreadyRequested + nextRequestedForThisRequest;
      if (totalRequested > orderItem.quantity) {
        const availableForNewRequest = Math.max(orderItem.quantity - alreadyRequested, 0);
        setError(
          `จำนวนที่ขอเบิกรวม (${totalRequested}) เกินจำนวนใน Order (${orderItem.quantity}) สำหรับสินค้า ${nameOrId} (เคยขอแล้ว ${alreadyRequested} ชิ้น สามารถขอเพิ่มได้อีก ${availableForNewRequest} ชิ้น)`
        );
        setLoadingExistingTotals(false);
        return;
      }
      requestedByProduct.set(item.productId, nextRequestedForThisRequest);
    }

    setLoadingExistingTotals(false);

    const payload = {
      request: {
        orderId,
        customerId,
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

  const handleReadyRequestInspect = (requestId: string) => {
    if (inspectedReadyRequestId === requestId) {
      setInspectedReadyRequestId(null);
      setReadyRequestModalOpen(false);
      return;
    }
    setInspectedReadyRequestId(requestId);
    setReadyRequestModalOpen(true);
  };

  const handleFulfillAll = async () => {
    if (!token || !warehouseActiveRequest) {
      return;
    }
    if (isFulfillSubmitting) {
      return;
    }

    const prepared: { item: RequestItem; quantity: number }[] = [];
    const insufficientLabels: string[] = [];

    warehouseActiveItems.forEach((item) => {
      if (item.remainingQty <= 0) {
        return;
      }
      const product = productById.get(item.productId);
      if (!product) {
        insufficientLabels.push(item.productId);
        return;
      }
      const stockAvailable = product.quantity ?? 0;
      if (stockAvailable <= 0) {
        const label = product.productName ? `${product.productName} (${product.productId})` : item.productId;
        insufficientLabels.push(label);
        return;
      }
      const maxQty = Math.min(item.remainingQty, stockAvailable);
      if (maxQty <= 0) {
        return;
      }
      const storedQty = fulfillQuantities[item.requestItemId];
      const sanitized = storedQty !== undefined ? Math.trunc(storedQty) : maxQty;
      const quantity = Math.min(maxQty, Math.max(1, sanitized || maxQty));
      if (quantity <= 0) {
        return;
      }
      prepared.push({ item, quantity });
    });

    if (prepared.length === 0) {
      if (insufficientLabels.length > 0) {
        setError(`สินค้าไม่เพียงพอ: ${insufficientLabels.join(', ')}`);
      } else {
        setError('ไม่มีรายการที่สามารถเบิกได้');
      }
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setFulfillSubmitting(true);

    try {
      for (const { item, quantity } of prepared) {
        await apiFetch<void>('/stock/fulfill', {
          method: 'POST',
          body: JSON.stringify({ requestItemId: item.requestItemId, fulfillQty: quantity }),
          token
        });
      }

      mutateApproved();
      mutateReady();
      mutateProducts();

      const statusMessage =
        insufficientLabels.length > 0
          ? `บันทึกการเบิกเรียบร้อย สถานะคำขอ: Pending (สินค้าไม่พอ: ${insufficientLabels.join(', ')})`
          : 'บันทึกการเบิกเรียบร้อย สถานะคำขอ: Pending';
      setSuccessMessage(statusMessage);
      setStatusOverrides((prev) => {
        const next = new Map(prev);
        next.set(warehouseActiveRequest.requestId, 'Pending');
        return next;
      });
      setFulfillQuantities({});
      setWarehouseModalOpen(false);
      setWarehouseModalRequestId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถเบิกสินค้าได้');
    } finally {
      setFulfillSubmitting(false);
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
      if (inspectedReadyRequestId === requestId) {
        setReadyRequestModalOpen(false);
        setInspectedReadyRequestId(null);
      }
      setStatusOverrides((prev) => {
        if (!prev.has(requestId)) {
          return prev;
        }
        const next = new Map(prev);
        next.delete(requestId);
        return next;
      });
      setSuccessMessage('ปิดคำขอเรียบร้อย');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถปิดคำขอได้');
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Requests</h1>
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

      {canFulfill && (
        <section className="card space-y-4 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Warehouse: ดำเนินการเบิกสินค้า</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setSuccessMessage(null);
                setFulfillQuantities({});
                if (sortedApprovedRequests.length > 0) {
                  setWarehouseModalRequestId(sortedApprovedRequests[0].requestId);
                } else {
                  setWarehouseModalRequestId(null);
                }
                setWarehouseModalOpen(true);
              }}
              disabled={!canOpenFulfillModal}
              className="w-full rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 md:w-auto"
            >
              เบิกของ
            </button>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            {canOpenFulfillModal
              ? `มีคำขอรอเบิก ${sortedApprovedRequests.length.toLocaleString('th-TH')} รายการ`
              : 'ยังไม่มีคำขอที่พร้อมให้เบิก'}
          </div>
        </section>
      )}

      {canFulfill && isWarehouseModalOpen && (
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
                    ) : warehouseRequestOptions.length === 0 ? (
                    <p className="text-sm text-slate-500">ยังไม่มีคำขอที่ตรงกับคำค้นหา</p>
                  ) : (
                    <p className="text-sm text-slate-500">เลือกคำขอที่ต้องการจากเมนูด้านล่าง</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWarehouseModalOpen(false);
                    setWarehouseModalRequestId(null);
                    setFulfillQuantities({});
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  ปิด
                </button>
                </div>

                <div className="mt-6 space-y-6 text-sm text-slate-700">
                <div className="space-y-3">
                  <label className="text-xs font-medium text-slate-500">ค้นหาและเลือกคำขอที่ต้องการเบิก</label>
                  <SearchableSelect
                    name="warehouseRequestId"
                    value={warehouseModalRequestId ?? ''}
                    onChange={(value) => setWarehouseModalRequestId(value)}
                    options={[{ value: '', label: 'เลือกคำขอ' }, ...warehouseRequestOptions]}
                    placeholder="เลือกคำขอที่ต้องการเบิก"
                    searchPlaceholder="ค้นหาด้วยรหัสคำขอ, Order, ลูกค้า..."
                    emptyMessage="ไม่พบคำขอที่พร้อมให้เบิก"
                    disabled={warehouseRequestOptions.length === 0}
                  />
                  {warehouseRequestOptions.length === 0 && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-600">ยังไม่มีคำขอที่พร้อมให้เบิก</p>
                  )}
                </div>
                  {warehouseActiveRequest && (
                    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 md:grid-cols-2">
                      <div>
                        <p className="font-semibold text-slate-600">สถานะ</p>
                        <p className="mt-1 text-slate-800">
                          {statusOverrides.get(warehouseActiveRequest.requestId) ?? warehouseActiveRequest.status}
                        </p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-600">วันที่ร้องขอ</p>
                      <p className="mt-1 text-slate-800">{formatDateTime(warehouseActiveRequest.requestDate)}</p>
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
                          const product = productById.get(item.productId);
                          const stockAvailable = product?.quantity ?? 0;
                          const maxByRequest = item.remainingQty;
                          const maxByStock = stockAvailable;
                          const maxQty = Math.min(maxByRequest, maxByStock);
                          const storedQty = fulfillQuantities[item.requestItemId];
                          const defaultQty = maxQty > 0 ? maxQty : 0;
                          const plannedQty = storedQty !== undefined ? storedQty : defaultQty;
                          const quantityForInput = maxQty > 0 ? Math.min(plannedQty, maxQty) : 0;
                          const canFulfillItem = maxQty > 0;
                          const productLabel = product?.productName
                            ? `${product.productName} (${product.productId})`
                            : item.productId;

                          return (
                            <li
                              key={item.requestItemId}
                              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                            >
                              <div className="space-y-1">
                                <p className="font-medium text-slate-800">{productLabel}</p>
                                <p className="text-xs text-slate-500">
                                  ขอ {item.quantity} • เบิกแล้ว {item.fulfilledQty} • คงเหลือ {item.remainingQty} • สต็อก {stockAvailable}
                                </p>
                                {maxByStock < item.remainingQty && maxByStock > 0 && (
                                  <p className="text-xs text-amber-600">สต็อกมี {stockAvailable} ชิ้น สามารถเบิกได้บางส่วน</p>
                                )}
                                {maxByStock <= 0 && (
                                  <p className="text-xs text-rose-500">สต็อกสินค้าในคลังหมด ไม่สามารถเบิกได้</p>
                                )}
                              </div>
                              <div className="flex flex-col gap-2 text-xs md:w-40">
                                <span className="text-xs font-medium text-slate-500">จำนวนที่จะเบิก</span>
                                <input
                                  type="number"
                                  min={canFulfillItem ? 1 : 0}
                                  max={canFulfillItem ? maxQty : undefined}
                                  value={canFulfillItem ? quantityForInput : 0}
                                  onChange={(event) => {
                                    if (!canFulfillItem) {
                                      return;
                                    }
                                    const nextValue = Number(event.target.value);
                                    const sanitized = Number.isFinite(nextValue) ? Math.trunc(nextValue) : quantityForInput;
                                    const safeValue = Math.min(maxQty, Math.max(1, sanitized));
                                    setFulfillQuantities((prev) => ({ ...prev, [item.requestItemId]: safeValue }));
                                  }}
                                  disabled={!canFulfillItem || isFulfillSubmitting}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm text-slate-700"
                                />
                                {canFulfillItem && maxQty < item.remainingQty && (
                                  <p className="text-[11px] text-amber-600">สามารถเบิกได้สูงสุด {maxQty} ชิ้นตามสต็อกปัจจุบัน</p>
                                )}
                                {!canFulfillItem && (
                                  <p className="text-[11px] text-slate-400">รอเติมสต็อกเพื่อดำเนินการเบิก</p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                  ) : (
                    <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">ยังไม่มีรายการสินค้า</p>
                  )}
                  {warehouseActiveRequest && warehouseActiveItems.length > 0 && (
                    <div className="mt-4 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleFulfillAll}
                        disabled={!canFulfillAny || isFulfillSubmitting}
                        className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {isFulfillSubmitting ? 'กำลังบันทึก...' : 'ยืนยันบันทึกการเบิก'}
                      </button>
                    </div>
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
                    <div className="space-y-3 md:col-span-2">
                      <label className="text-xs font-medium text-slate-500">อ้างอิง Order ที่ยืนยัน</label>
                      <SearchableSelect
                        key={`order-${formResetKey}`}
                        name="orderId"
                        value={selectedOrderId}
                        onChange={handleOrderSelection}
                        options={[{ value: '', label: 'เลือก Order' }, ...orderOptions]}
                        placeholder="เลือก Order"
                        searchPlaceholder="ค้นหา Order..."
                        emptyMessage="ไม่พบ Order ที่ตรงกับคำค้นหา"
                        disabled={orderOptions.length === 0}
                        onInspectOption={(option) => {
                          if (!option.value) {
                            return;
                          }
                          setOrderPreviewId(option.value);
                          setOrderPreviewOpen(true);
                        }}
                        inspectLabel="ดูรายละเอียด"
                      />
                      {orderOptions.length === 0 && (
                        <p className="text-xs text-slate-500">ยังไม่มี Order ที่ได้รับการยืนยัน</p>
                      )}
                      {selectedOrder && (
                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{selectedOrder.orderId}</p>
                              <p className="text-slate-500">
                                วันที่ {formatDateTime(selectedOrder.orderDate, 'dd MMM yyyy')} • สถานะ {selectedOrder.status}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setOrderPreviewId(selectedOrder.orderId);
                                setOrderPreviewOpen(true);
                              }}
                              className="self-start rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                            >
                              ดูรายละเอียด Order
                            </button>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="font-semibold text-slate-600">ลูกค้า</p>
                              <p className="mt-1 text-slate-800">{selectedCustomerName ?? selectedOrder.customerId}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-600">ผู้รับผิดชอบ</p>
                              <p className="mt-1 text-slate-800">{selectedOrder.staffId ?? '-'}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-600">ยอดรวม</p>
                              <p className="mt-1 text-slate-800">฿{selectedOrder.totalAmount?.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                          {isSelectedOrderItemsLoading && (
                            <p className="text-xs text-slate-500">กำลังโหลดรายการสินค้าของ Order นี้...</p>
                          )}
                          {hasOrderItemsError && (
                            <p className="text-xs text-rose-500">ไม่สามารถโหลดรายการสินค้าของ Order นี้ได้ กรุณาลองใหม่อีกครั้ง</p>
                          )}
                          {existingTotalsError && (
                            <p className="text-xs text-amber-600">{existingTotalsError}</p>
                          )}
                          {isLoadingExistingTotals && (
                            <p className="text-xs text-slate-500">กำลังตรวจสอบคำขอที่เกี่ยวข้องกับ Order นี้...</p>
                          )}
                          {!isLoadingExistingTotals &&
                            !isSelectedOrderItemsLoading &&
                            !hasOrderItemsError &&
                            productOptions.length === 0 && (
                              <p className="text-xs text-amber-600">สินค้าใน Order นี้ถูกขอครบแล้ว ไม่สามารถขอเพิ่มได้</p>
                            )}
                        </div>
                      )}
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
                        disabled={
                          !selectedOrderId ||
                          isSelectedOrderItemsLoading ||
                          hasOrderItemsError ||
                          productOptions.length === 0 ||
                          isLoadingExistingTotals
                        }
                        className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        เพิ่มสินค้า
                      </button>
                    </div>
                    <div className="space-y-3">
                      {draftItems.map((item, index) => {
                        const orderItem = item.productId ? orderItemByProductId.get(item.productId) : undefined;
                        const totalInOrder = orderItem?.quantity ?? 0;
                        const alreadyRequested = item.productId ? existingRequestTotals.get(item.productId) ?? 0 : 0;
                        const remainingFromOrder = Math.max(totalInOrder - alreadyRequested, 0);
                        const isOutOfStock = item.productId ? remainingFromOrder <= 0 : false;
                        const quantityValue = isOutOfStock ? 0 : item.quantity;
                        const plannedTotal = item.productId
                          ? draftItems.reduce((sum, draft, draftIndex) => {
                              if (draft.productId !== item.productId) {
                                return sum;
                              }
                              return sum + (draftIndex === index ? item.quantity : draft.quantity || 0);
                            }, 0)
                          : 0;
                        const exceedsAvailable = item.productId ? plannedTotal > remainingFromOrder : false;

                        return (
                          <div key={`${formResetKey}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-4">
                            <div className="md:col-span-2">
                              <select
                                value={item.productId}
                                onChange={(event) => {
                                  const nextProductId = event.target.value;
                                  if (!nextProductId) {
                                    updateDraftItem(index, { productId: '', quantity: 1 });
                                    return;
                                  }
                                  const nextOrderItem = orderItemByProductId.get(nextProductId);
                                  const nextTotal = nextOrderItem?.quantity ?? 0;
                                  const nextAlreadyRequested = existingRequestTotals.get(nextProductId) ?? 0;
                                  const remainingForProduct = Math.max(nextTotal - nextAlreadyRequested, 0);
                                  const initialQuantity = remainingForProduct > 0 ? 1 : 0;
                                  updateDraftItem(index, { productId: nextProductId, quantity: initialQuantity });
                                }}
                                disabled={
                                  !selectedOrderId ||
                                  isSelectedOrderItemsLoading ||
                                  hasOrderItemsError ||
                                  productOptions.length === 0 ||
                                  isLoadingExistingTotals
                                }
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
                                max={isOutOfStock ? undefined : remainingFromOrder}
                                value={quantityValue}
                                onChange={(event) => {
                                  const rawValue = Number(event.target.value);
                                  const sanitized = Number.isFinite(rawValue) ? Math.max(1, Math.trunc(rawValue)) : 1;
                                  const clamped = remainingFromOrder > 0 ? Math.min(remainingFromOrder, sanitized) : sanitized;
                                  updateDraftItem(index, { quantity: clamped });
                                }}
                                disabled={isOutOfStock || isLoadingExistingTotals}
                                className="w-full"
                              />
                            </div>
                            {draftItems.length > 1 && (
                              <button type="button" onClick={() => removeDraftRow(index)} className="text-xs text-rose-500">
                                ลบ
                              </button>
                            )}
                            <div className="md:col-span-4 space-y-1 text-xs">
                              {item.productId && (
                                <p className="text-slate-500">
                                  ขอไปแล้ว {alreadyRequested.toLocaleString('th-TH')} / {totalInOrder.toLocaleString('th-TH')} ชิ้น • คงเหลือสำหรับคำขอใหม่ {remainingFromOrder.toLocaleString('th-TH')} ชิ้น
                                </p>
                              )}
                              {exceedsAvailable && (
                                <p className="text-rose-500">
                                  จำนวนที่กำลังขอทั้งหมด ({plannedTotal.toLocaleString('th-TH')}) เกินคงเหลือที่สามารถขอได้ ({remainingFromOrder.toLocaleString('th-TH')})
                                </p>
                              )}
                              {isOutOfStock && <p className="text-amber-600">สินค้าใน Order ถูกขอครบแล้ว ไม่สามารถขอเพิ่มได้</p>}
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

      {isOrderPreviewOpen && orderPreviewId && previewOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
              <div className="max-h-[85vh] overflow-y-auto p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">รายละเอียด Order</h2>
                    <p className="text-sm text-slate-500">
                      {previewOrder.orderId} • ลูกค้า {previewCustomerName ?? previewOrder.customerId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderPreviewOpen(false);
                      setOrderPreviewId(null);
                    }}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                  >
                    ปิด
                  </button>
                </div>
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-slate-600">สถานะ</p>
                    <p className="mt-1 text-slate-800">{previewOrder.status}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">วันที่ Order</p>
                    <p className="mt-1 text-slate-800">{formatDateTime(previewOrder.orderDate)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">ลูกค้า</p>
                    <p className="mt-1 text-slate-800">{previewCustomerName ?? previewOrder.customerId}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">ผู้รับผิดชอบ</p>
                    <p className="mt-1 text-slate-800">{previewOrder.staffId ?? '-'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">ยอดรวม</p>
                    <p className="mt-1 text-slate-800">฿{previewOrder.totalAmount?.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-800">รายการสินค้า</h3>
                  {isPreviewLoading ? (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">กำลังโหลดรายการสินค้า...</p>
                  ) : previewItems.length > 0 ? (
                    <ul className="space-y-2 text-xs text-slate-600">
                      {previewItems.map((item) => {
                        const previewProduct = productById.get(item.productId);
                        const productLabel = previewProduct
                          ? `${previewProduct.productName} (${previewProduct.productId})`
                          : item.productId;
                        return (
                          <li
                            key={item.orderItemId}
                            className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 md:flex-row md:items-center md:justify-between"
                          >
                            <span className="font-medium text-slate-800">{productLabel}</span>
                            <span>
                              จำนวน {item.quantity.toLocaleString('th-TH')} ชิ้น • เบิกแล้ว {item.fulfilledQty.toLocaleString('th-TH')} • คงเหลือ {item.remainingQty.toLocaleString('th-TH')} ชิ้น
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">ยังไม่มีรายการสินค้า</p>
                  )}
                </div>
                <div className="flex items-center justify-end gap-3">
                  {selectedOrderId !== previewOrder.orderId && (
                    <button
                      type="button"
                      onClick={() => {
                        handleOrderSelection(previewOrder.orderId);
                        setOrderPreviewOpen(false);
                        setOrderPreviewId(null);
                      }}
                      className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      เลือก Order นี้
                    </button>
                  )}
                </div>
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
                    <span className="text-xs text-slate-400">{formatDateTime(request.requestDate)}</span>
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
                                    {productById.get(item.productId)?.productName ?? item.productId} • {item.quantity} ชิ้น
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
          <p className="text-sm text-slate-500">แสดงรายการคำขอทั้งหมดที่สร้างโดยคุณ ({staffId})</p>
        </div>
        <div className="space-y-3">
          {technicianRequests.map((request) => {
            const isExpanded = technicianExpandedRequestId === request.requestId;
            const itemsForRequest = (technicianRequestItems ?? []).filter(
              (item) => item.requestId === request.requestId
            );
            const isLoadingItems = isExpanded && !technicianRequestItems;
            return (
              <div key={request.requestId} className="rounded-2xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setTechnicianExpandedRequestId(isExpanded ? null : request.requestId)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                    isExpanded ? 'border-b border-slate-200 bg-slate-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-800">{request.requestId}</p>
                    <p className="text-xs text-slate-500">
                      Order: {request.orderId || '-'} • สถานะ: {request.status}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDateTime(request.requestDate)}</span>
                </button>
                {isExpanded && (
                  <div className="space-y-4 px-4 pb-4 pt-3 text-sm text-slate-600">
                    {request.description && <p className="text-slate-600">{request.description}</p>}
                    <div>
                      <p className="text-xs font-semibold text-slate-500">รายการสินค้า</p>
                      {isLoadingItems ? (
                        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                          กำลังโหลดรายการสินค้า...
                        </p>
                      ) : itemsForRequest.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {itemsForRequest.map((item) => (
                            <li
                              key={item.requestItemId}
                              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                            >
                              <span>
                                {productById.get(item.productId)?.productName ?? item.productId} • ขอ {item.quantity} ชิ้น
                              </span>
                              <span className="text-xs text-slate-500">เบิกแล้ว {item.fulfilledQty}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                          ยังไม่มีรายการสินค้า
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {technicianRequests.length === 0 && (
            <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
              {allRequests ? 'คุณยังไม่มีคำขอ' : 'กำลังโหลด...'}
            </p>
          )}
        </div>
      </section>
    )}

      {canClose && (
        <section className="card space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">คำขอที่พร้อมปิด</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(readyToClose ?? []).map((request) => {
              const isInspected = inspectedReadyRequestId === request.requestId;
              const displayStatus = statusOverrides.get(request.requestId) ?? request.status;
              return (
                <div key={request.requestId} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-800">{request.requestId}</p>
                  <p className="mt-1 text-xs text-slate-500">Order: {request.orderId ?? '-'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    วันที่ขอ: {formatDateTime(request.requestDate)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">สถานะ: {displayStatus}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleReadyRequestInspect(request.requestId)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-primary-600 transition hover:border-primary-200 hover:bg-primary-50"
                    >
                      {isInspected ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCloseRequest(request.requestId)}
                      className="w-full rounded-lg bg-primary-600 py-2 text-xs font-semibold text-white"
                    >
                      ปิดคำขอ
                    </button>
                  </div>
                </div>
              );
            })}
            {(readyToClose?.length ?? 0) === 0 && <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">ยังไม่มีคำขอที่พร้อมปิด</p>}
          </div>
        </section>
      )}

      {isReadyRequestModalOpen && inspectedReadyRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="max-h-[85vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">รายละเอียดคำขอที่พร้อมปิด</h2>
                  <p className="text-sm text-slate-500">
                    {inspectedReadyRequest.requestId} • วันที่ {formatDateTime(inspectedReadyRequest.requestDate)} • สถานะ{' '}
                    {statusOverrides.get(inspectedReadyRequest.requestId) ?? inspectedReadyRequest.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReadyRequestModalOpen(false);
                    setInspectedReadyRequestId(null);
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  ปิด
                </button>
              </div>
              <div className="mt-6 space-y-4 text-sm text-slate-600">
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-slate-600">Order</p>
                    <p className="mt-1 text-slate-800">{inspectedReadyRequest.orderId ?? '-'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">ลูกค้า</p>
                    <p className="mt-1 text-slate-800">{inspectedReadyRequest.customerId ?? '-'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">ผู้ร้องขอ</p>
                    <p className="mt-1 text-slate-800">{inspectedReadyRequest.staffId ?? '-'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">ผู้อนุมัติ</p>
                    <p className="mt-1 text-slate-800">{inspectedReadyRequest.approvedBy ?? '-'}</p>
                  </div>
                </div>
                {inspectedReadyRequest.description && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold text-slate-500">รายละเอียดเพิ่มเติม</p>
                    <p className="mt-2 text-sm text-slate-700">{inspectedReadyRequest.description}</p>
                  </div>
                )}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">รายการสินค้า</p>
                  {isReadyRequestItemsLoading ? (
                    <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">กำลังโหลดรายการสินค้า...</p>
                  ) : readyRequestItems && readyRequestItems.length > 0 ? (
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {readyRequestItems.map((item) => (
                        <li key={item.requestItemId} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                          <span>{productById.get(item.productId)?.productName ?? item.productId}</span>
                          <span className="text-xs text-slate-500">คงเหลือ {item.remainingQty}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">ยังไม่มีรายการสินค้าในคำขอนี้</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="card space-y-4 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">รายการคำขอทั้งหมด</h2>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
            <input
              type="search"
              value={allRequestsSearch}
              onChange={(event) => setAllRequestsSearch(event.target.value)}
              placeholder="ค้นหาด้วย Request ID Order ลูกค้า หรือคำอธิบาย"
              className="w-full md:w-80"
            />
            <p className="text-xs text-slate-400">
              แสดง {filteredAllRequests.length} จาก {sortedAllRequests.length} รายการ
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">วันที่</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">ลูกค้า</th>
                <th className="px-4 py-3">ผู้ร้องขอ</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {allRequests === undefined ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredAllRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    {sortedAllRequests.length === 0 ? 'ยังไม่มีคำขอ' : 'ไม่พบคำขอตามคำค้นหา'}
                  </td>
                </tr>
              ) : (
                filteredAllRequests.map((request) => {
                  const isSelected = inspectedAllRequestId === request.requestId;
                  return (
                    <tr
                      key={request.requestId}
                      className={`hover:bg-slate-50/60 ${isSelected ? 'bg-primary-50/60' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{request.requestId}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDateTime(request.requestDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{request.orderId ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{request.customerId ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{request.staffId ?? '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700">{request.status}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleAllRequestInspect(request.requestId)}
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
      </section>

      {isAllRequestModalOpen && inspectedAllRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="max-h-[85vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">รายละเอียดคำขอ</h2>
                  <p className="text-sm text-slate-500">
                    {inspectedAllRequest.requestId} • วันที่ {formatDateTime(inspectedAllRequest.requestDate)} • สถานะ {inspectedAllRequest.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAllRequestModalOpen(false);
                    setInspectedAllRequestId(null);
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  ปิด
                </button>
              </div>
              <div className="mt-6 space-y-4 text-sm text-slate-600">
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-slate-600">Order</p>
                    <p className="mt-1 text-slate-800">{inspectedAllRequest.orderId ?? '-'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">ลูกค้า</p>
                    <p className="mt-1 text-slate-800">{inspectedAllRequest.customerId ?? '-'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">ผู้ร้องขอ</p>
                    <p className="mt-1 text-slate-800">{inspectedAllRequest.staffId ?? '-'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">ผู้อนุมัติ</p>
                    <p className="mt-1 text-slate-800">{inspectedAllRequest.approvedBy ?? '-'}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">รายละเอียดเพิ่มเติม</p>
                  <p className="mt-2 text-sm text-slate-700">{inspectedAllRequest.description ?? 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">รายการสินค้า</p>
                  {allRequestItems ? (
                    allRequestItems.length > 0 ? (
                      <ul className="mt-2 space-y-2 text-sm text-slate-600">
                        {allRequestItems.map((item) => (
                          <li key={item.requestItemId} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                            <span>
                              {productById.get(item.productId)?.productName ?? item.productId} • {item.quantity} ชิ้น
                            </span>
                            <span className="text-xs text-slate-500">คงเหลือ {item.remainingQty}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">ยังไม่มีรายการสินค้าในคำขอนี้</p>
                    )
                  ) : (
                    <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">กำลังโหลดรายการสินค้า...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}