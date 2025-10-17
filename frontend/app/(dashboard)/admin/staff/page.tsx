'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '../../../../components/AuthContext';
import { apiFetch } from '../../../../lib/api';
import { useAuthedSWR } from '../../../../lib/swr';
import type { Staff } from '../../../../lib/types';

export default function StaffAdminPage() {
  const { role, token } = useAuth();
  const { data: staff, mutate } = useAuthedSWR<Staff[]>(role === 'ADMIN' ? '/staff' : null, token);
  const [error, setError] = useState<string | null>(null);

  if (role !== 'ADMIN') {
    return <p className="text-sm text-slate-500">ต้องเป็นผู้ดูแลระบบเท่านั้น</p>;
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      staffName: formData.get('staffName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      role: formData.get('role'),
      password: formData.get('password'),
      active: true
    };

    try {
      await apiFetch<Staff>('/staff', {
        method: 'POST',
        body: JSON.stringify(payload),
        token
      });
      event.currentTarget.reset();
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถสร้าง Staff ได้');
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Staff Management</h1>
        <p className="text-sm text-slate-500">Admin เท่านั้น: GET/POST /staff</p>
      </header>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

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

      <form onSubmit={handleCreate} className="card space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">สร้างพนักงานใหม่</h2>
          <p className="text-sm text-slate-500">POST /staff (เฉพาะ Admin)</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">ชื่อ-สกุล</label>
            <input name="staffName" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">อีเมล</label>
            <input name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">เบอร์โทร</label>
            <input name="phone" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">บทบาท</label>
            <select name="role" required defaultValue="TECHNICIAN">
              <option value="TECHNICIAN">Technician</option>
              <option value="FOREMAN">Foreman</option>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="SALES">Sales</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-medium text-slate-500">รหัสผ่านเริ่มต้น</label>
            <input name="password" type="password" required minLength={6} />
          </div>
        </div>
        <button type="submit" className="w-full md:w-auto">
          บันทึกพนักงาน
        </button>
      </form>
    </div>
  );
}
