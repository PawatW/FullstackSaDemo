'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '../components/AuthContext';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  };

  return (
    <div className="flex min-h-screen items-stretch bg-gradient-to-br from-primary-900 via-slate-900 to-slate-800">
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden lg:flex">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center opacity-25" />
        <div className="relative z-10 max-w-lg space-y-6 rounded-3xl bg-black/40 p-12 text-white backdrop-blur">
          <div className="inline-flex rounded-2xl bg-primary-500/20 px-4 py-2 text-xs uppercase tracking-[0.3em]">Service Accelerator</div>
          <h1 className="text-4xl font-semibold leading-tight">Inventory orchestration for every role in your service team</h1>
          <p className="text-base text-slate-200">
            เข้าถึงคำสั่งซื้อ การเบิกสินค้า และการจัดการสต็อกผ่านพอร์ทัลเดียว พร้อมเวิร์กโฟลว์ตามบทบาทตามที่กำหนดไว้ใน
            Service Accelerator use case.
          </p>
        </div>
      </div>
      <div className="flex w-full items-center justify-center bg-white px-6 py-12 sm:px-12 lg:w-[480px]">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-semibold text-slate-900">เข้าสู่ระบบ</h2>
            <p className="text-sm text-slate-500">ใช้บัญชี Staff ที่สร้างจากระบบหลังบ้าน</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-600">
                อีเมล
              </label>
              <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="name@company.com" />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-600">
                รหัสผ่าน
              </label>
              <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="••••••••" />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-500">
              {loading ? 'กำลังโหลด...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
          <div className="space-y-1 text-center text-xs text-slate-400">
            <p>Smart Inventory Portal • Powered by Next.js</p>
            <p>อ้างอิงโค้ดจาก Spring Boot backend เพื่อเชื่อมต่อ API</p>
          </div>
        </div>
      </div>
    </div>
  );
}
