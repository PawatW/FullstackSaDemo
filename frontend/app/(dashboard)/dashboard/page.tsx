'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useAuth } from '../../../components/AuthContext';
import { useAuthedSWR } from '../../../lib/swr';
import type { Product, Order, Request, StockTransaction } from '../../../lib/types';

export default function DashboardPage() {
  const { role, token } = useAuth();
  const isRole = (...roles: string[]) => !!role && (roles.includes(role) || role === 'ADMIN');

  const { data: products } = useAuthedSWR<Product[]>('/products', token, { revalidateOnFocus: false });
  const { data: confirmedOrders } = useAuthedSWR<Order[]>(isRole('TECHNICIAN', 'ADMIN', 'SALES') ? '/orders/confirmed' : null, token, {
    revalidateOnFocus: false
  });
  const { data: pendingRequests } = useAuthedSWR<Request[]>(isRole('FOREMAN', 'ADMIN') ? '/requests/pending' : null, token, {
    refreshInterval: 20000
  });
  const { data: approvedRequests } = useAuthedSWR<Request[]>(isRole('WAREHOUSE', 'ADMIN') ? '/stock/approved-requests' : null, token, {
    refreshInterval: 20000
  });
  const { data: stockTransactions } = useAuthedSWR<StockTransaction[]>(isRole('ADMIN') ? '/stock/transactions' : null, token, {
    revalidateOnFocus: false
  });

  const tasks = [
    {
      title: 'บันทึกสินค้าเข้า',
      description: 'บันทึก Stock-In พร้อม Supplier reference และโน้ตตาม Use Case',
      href: '/stock',
      roles: ['WAREHOUSE']
    },
    {
      title: 'สร้างคำขอเบิก',
      description: 'Technician สร้าง Request พร้อมรายการสินค้าตาม Order ที่ได้รับการยืนยัน',
      href: '/requests',
      roles: ['TECHNICIAN']
    },
    {
      title: 'อนุมัติคำขอเบิก',
      description: 'Foreman ตรวจสอบและอนุมัติหรือปฏิเสธคำขอที่รออยู่',
      href: '/requests',
      roles: ['FOREMAN']
    },
    {
      title: 'ปิดคำสั่งซื้อ',
      description: 'Sales ตรวจสอบ Order ที่พร้อมปิดและอัปเดตสถานะ',
      href: '/orders',
      roles: ['SALES']
    },
    {
      title: 'จัดการพนักงาน',
      description: 'Admin เพิ่มพนักงานใหม่และกำหนดบทบาทในระบบ',
      href: '/admin/staff',
      roles: ['ADMIN']
    }
  ].filter((task) => isRole(...task.roles));

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6">
          <p className="text-sm font-medium text-slate-500">สินค้าทั้งหมด</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{products?.length ?? 0}</p>
          <p className="mt-2 text-xs text-slate-400">ข้อมูลมาจาก endpoint /products</p>
        </div>
        {isRole('TECHNICIAN', 'ADMIN', 'SALES') && (
          <div className="card p-6">
            <p className="text-sm font-medium text-slate-500">Order ที่ยืนยันแล้ว</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{confirmedOrders?.length ?? 0}</p>
            <p className="mt-2 text-xs text-slate-400">ข้อมูลจาก /orders/confirmed</p>
          </div>
        )}
        {isRole('FOREMAN', 'ADMIN') && (
          <div className="card p-6">
            <p className="text-sm font-medium text-slate-500">คำขอรออนุมัติ</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{pendingRequests?.length ?? 0}</p>
            <p className="mt-2 text-xs text-slate-400">ข้อมูลจาก /requests/pending</p>
          </div>
        )}
        {isRole('WAREHOUSE', 'ADMIN') && (
          <div className="card p-6">
            <p className="text-sm font-medium text-slate-500">คำขอรอจัดสินค้า</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{approvedRequests?.length ?? 0}</p>
            <p className="mt-2 text-xs text-slate-400">ข้อมูลจาก /stock/approved-requests</p>
          </div>
        )}
        {isRole('ADMIN') && (
          <div className="card p-6">
            <p className="text-sm font-medium text-slate-500">ธุรกรรมสต็อก</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{stockTransactions?.length ?? 0}</p>
            <p className="mt-2 text-xs text-slate-400">ข้อมูลจาก /stock/transactions</p>
          </div>
        )}
      </section>

      {tasks.length > 0 && (
        <section className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">เวิร์กโฟลว์ตาม Use Case</h2>
              <p className="text-sm text-slate-500">เลือกรายการเพื่อไปยังหน้าที่เกี่ยวข้องกับบทบาทของคุณ</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {tasks.map((task) => (
              <Link key={task.href} href={task.href} className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-5 transition hover:border-primary-200 hover:bg-white">
                <div>
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-primary-600">{task.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{task.description}</p>
                </div>
                <span className="mt-4 text-xs font-medium text-primary-600">ไปยังหน้าดำเนินการ →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {isRole('ADMIN') && stockTransactions && stockTransactions.length > 0 && (
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900">ความเคลื่อนไหวสต็อกล่าสุด</h2>
          <div className="mt-4 space-y-3">
            {stockTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.transactionId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{transaction.type === 'IN' ? 'สินค้าเข้า' : 'สินค้าออก'}</p>
                  <p className="text-xs text-slate-500">{transaction.description}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>Product: {transaction.productId}</p>
                  <p>{format(new Date(transaction.transactionDate), 'dd MMM yyyy HH:mm')}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
