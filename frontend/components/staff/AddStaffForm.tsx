'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../../lib/api';
import type { Staff } from '../../lib/types';

interface AddStaffFormProps {
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

const toOptional = (value: FormDataEntryValue | null): string | null => {
  const raw = typeof value === 'string' ? value : value ? String(value) : '';
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
};

export function AddStaffForm({ onStart, onSuccess, onError }: AddStaffFormProps) {
  const { token } = useAuth();
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || isSubmitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const staffName = String(formData.get('staffName') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const role = String(formData.get('role') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!staffName || !email || !role || !password) {
      onError?.('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    onStart?.();
    setSubmitting(true);

    const payload = {
      staffName,
      email,
      phone: toOptional(formData.get('phone')),
      role,
      password,
      active: true
    };

    try {
      await apiFetch<Staff>('/staff', {
        method: 'POST',
        body: JSON.stringify(payload),
        token
      });
      form.reset();
      onSuccess?.();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'ไม่สามารถสร้าง Staff ได้');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
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
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 md:w-auto"
      >
        {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกพนักงาน'}
      </button>
    </form>
  );
}

export default AddStaffForm;
