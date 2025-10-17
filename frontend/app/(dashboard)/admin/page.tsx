'use client';

import Link from 'next/link';

export default function AdminIndexPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Admin tools</h1>
      <p className="text-sm text-slate-500">เลือกเมนูย่อยจากแถบซ้ายเพื่อจัดการพนักงาน หรือดูรายงานอื่นๆ</p>
      <Link href="/admin/staff" className="inline-flex items-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white">
        จัดการ Staff →
      </Link>
    </div>
  );
}
