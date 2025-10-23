'use client';

import { useState } from 'react';
import { useAuth } from '../../../../components/AuthContext';
import { AddStaffForm } from '../../../../components/staff/AddStaffForm';
import { useAuthedSWR } from '../../../../lib/swr';
import type { Staff } from '../../../../lib/types';

export default function StaffAdminPage() {
  const { role, token } = useAuth();
  const { data: staff, mutate } = useAuthedSWR<Staff[]>(role === 'ADMIN' ? '/staff' : null, token);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (role !== 'ADMIN') {
    return <p className="text-sm text-slate-500">ต้องเป็นผู้ดูแลระบบเท่านั้น</p>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Staff Management</h1>
      </header>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {successMessage && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{successMessage}</div>
      )}

      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-semibold text-slate-900">พนักงานทั้งหมด</h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Staff ID</th>
                <th className="px-4 py-3">ชื่อ</th>
                <th className="px-4 py-3">อีเมล</th>
                <th className="px-4 py-3">บทบาท</th>
                <th className="px-4 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(staff ?? []).map((member) => (
                <tr key={member.staffId}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{member.staffId}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{member.staffName}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{member.email}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">{member.role}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{member.active ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AddStaffForm
        onStart={() => {
          setError(null);
          setSuccessMessage(null);
        }}
        onSuccess={() => {
          mutate();
          setSuccessMessage('สร้างพนักงานเรียบร้อย');
        }}
        onError={(message) => {
          setError(message);
          setSuccessMessage(null);
        }}
      />
    </div>
  );
}
