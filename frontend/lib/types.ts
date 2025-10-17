export interface Product {
  productId: string;
  productName: string;
  description?: string;
  unit?: string;
  pricePerUnit?: number;
  supplierId?: string;
  quantity: number;
  imageUrl?: string;
}

export interface Supplier {
  supplierId: string;
  supplierName: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface Customer {
  customerId: string;
  customerName: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface Staff {
  staffId: string;
  staffName: string;
  role: string;
  email?: string;
  phone?: string;
  active?: boolean;
}

export interface OrderItem {
  orderItemId: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  fulfilledQty: number;
  remainingQty: number;
}

export interface Order {
  orderId: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  customerId: string;
  staffId: string;
  items?: OrderItem[];
}

export interface RequestItem {
  requestItemId: string;
  requestId: string;
  productId: string;
  quantity: number;
  fulfilledQty: number;
  remainingQty: number;
}

export interface Request {
  requestId: string;
  requestDate: string;
  status: string;
  orderId?: string;
  customerId?: string;
  staffId: string;
  description?: string;
  approvedBy?: string;
  approvedDate?: string;
  items?: RequestItem[];
}

export interface StockTransaction {
  transactionId: string;
  transactionDate: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  productId: string;
  quantity: number;
  staffId: string;
  description?: string;
}
