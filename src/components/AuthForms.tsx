"use client";
import { useState } from 'react';
import { signIn } from 'next-auth/react';

export function AuthForms() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (mode === 'register') {
        const r = await fetch('/api/register', { method: 'POST', body: JSON.stringify({ email, password }), headers: { 'Content-Type': 'application/json' } });
        if (!r.ok) {
          const j = await r.json();
            throw new Error(j.error || 'Greška');
        }
        // auto switch to login
        setMode('login');
      } else {
        const res = await signIn('credentials', { email, password, redirect: false });
        if (res?.error) throw new Error(res.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 border p-3 rounded">
      <div className="flex gap-2 text-xs">
        <button className={mode==='login'? 'font-bold underline':''} onClick={() => setMode('login')}>Prijava</button>
        <button className={mode==='register'? 'font-bold underline':''} onClick={() => setMode('register')}>Registracija</button>
      </div>
      <form onSubmit={submit} className='space-y-2 text-sm'>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder='Email' type='email' className='w-full border px-2 py-1 rounded'/>
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder='Lozinka' type='password' className='w-full border px-2 py-1 rounded'/>
        {error && <div className='text-xs text-red-500'>{error}</div>}
        <button disabled={loading} className='w-full bg-primary text-white rounded py-1 text-sm disabled:opacity-40'>{loading? '...':'OK'}</button>
      </form>
    </div>
  );
}
