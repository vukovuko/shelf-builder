"use client";
import { useEffect, useState } from 'react';
import { getWardrobeSnapshot, applyWardrobeSnapshot } from '@/lib/serializeWardrobe';
import { useSession, signOut } from '@/lib/auth-client';

export function SaveLoadBar() {
  const { data: session, isPending } = useSession();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!session) return;
    setLoading(true);
    const r = await fetch('/api/wardrobes');
    const json = await r.json();
    setList(json);
    setLoading(false);
  }

  async function save() {
    try {
      if (!session) {
        alert('Prijavite se da biste sačuvali orman');
        return;
      }
      const name = prompt('Naziv ormana:', 'Orman');
      if (!name) return;
      const snapshot = getWardrobeSnapshot();
      if (!snapshot || typeof snapshot !== 'object') {
        console.error('[SaveLoadBar] invalid snapshot, aborting save', snapshot);
        return;
      }
      const res = await fetch('/api/wardrobes', {
        method: 'POST',
        body: JSON.stringify({ name, data: snapshot }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        console.error('[SaveLoadBar] save failed', res.status);
        return;
      }
      refresh();
    } catch (e) {
      console.error('[SaveLoadBar] save exception', e);
    }
  }

  async function load(id: string) {
    try {
      const r = await fetch('/api/wardrobes/' + id);
      if (!r.ok) {
        console.error('[SaveLoadBar] load failed', r.status);
        return;
      }
      const json = await r.json();
      let data: any = json?.data;
      if (!data || typeof data !== 'object') {
        console.warn('[SaveLoadBar] wardrobe data malformed, using fallback empty object', data);
        data = {};
      }
      applyWardrobeSnapshot(data);
    } catch (e) {
      console.error('[SaveLoadBar] load exception', e);
    }
  }

  useEffect(() => { refresh(); }, [session]);

  return (
    <div className="flex flex-col gap-2 mt-4 border-t pt-3">
      <div className="flex justify-between items-center text-sm">
        {session ? (
          <>
            <span className="truncate">{session.user?.email}</span>
            <button onClick={() => signOut()} className="text-xs underline">Odjava</button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Nije prijavljen</span>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={save} className="px-3 py-1 bg-primary text-white rounded text-sm">Sačuvaj</button>
        <button onClick={refresh} disabled={!session} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Osveži</button>
      </div>
      {isPending && <div className='text-xs'>...</div>}
      {session && (
        <div className="max-h-40 overflow-auto text-sm space-y-1">
          {loading && <div>Učitavanje...</div>}
          {list.map(w => (
            <div key={w.id} className="flex justify-between items-center border px-2 py-1 rounded">
              <span className="truncate">{w.name}</span>
              <button onClick={() => load(w.id)} className="text-xs px-2 py-0.5 bg-neutral-200 rounded">Učitaj</button>
            </div>
          ))}
          {!loading && list.length === 0 && <div className="text-xs text-muted-foreground">Nema sačuvanih.</div>}
        </div>
      )}
    </div>
  );
}
