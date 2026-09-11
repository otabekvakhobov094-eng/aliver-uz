'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminRole, type PermissionMatrix } from '@/lib/api';

/**
 * Rollar va huquqlar matritsasi — TZ 73, 74.
 *
 * Matritsa modul × harakat ko'rinishida: xodim "operator narxni
 * o'zgartira olmaydi" degan qoidani bitta katakchadan ko'radi, ro'yxatni
 * o'qib chiqmaydi.
 */

export default function RolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [r, m] = await Promise.all([adminApi.roles(), adminApi.permissionMatrix()]);
      setRoles(r);
      setMatrix(m);
      setSelectedId((prev) => prev || r[0]?.id || '');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(() => roles.find((r) => r.id === selectedId) ?? null, [roles, selectedId]);

  useEffect(() => {
    setDraft(new Set(selected?.permissions ?? []));
  }, [selected]);

  const isSuper = selected?.code === 'SUPER_ADMIN';

  const dirty = useMemo(() => {
    if (!selected) return false;
    const current = new Set(selected.permissions);
    if (current.size !== draft.size) return true;
    for (const p of draft) if (!current.has(p)) return true;
    return false;
  }, [selected, draft]);

  function toggle(code: string) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
        // `view` olib tashlansa, shu modulning qolgan huquqlari ma'nosiz
        // qoladi: xodim ro'yxatni ocholmaydi, lekin "tahrirlash" huquqi
        // bor deb ko'rinadi. Shuning uchun ular ham olib tashlanadi.
        const module = code.split('.')[0];
        if (code.endsWith('.view')) {
          for (const c of [...next]) if (c.startsWith(`${module}.`)) next.delete(c);
        }
      } else {
        next.add(code);
        // Aksincha: istalgan huquq berilsa, ko'rish huquqi ham beriladi.
        const module = code.split('.')[0];
        next.add(`${module}.view`);
      }
      return next;
    });
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await adminApi.updateRole(selected.id, { permissions: [...draft] });
      setNotice('Huquqlar saqlandi');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const cell: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid var(--alv-line)',
    textAlign: 'center',
  };

  return (
    <AdminShell title="Rollar">
      {error ? (
        <div
          role="alert"
          className="alv-card"
          style={{ padding: 14, marginBottom: 16, borderLeft: '3px solid var(--alv-danger,#C0392B)' }}
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          className="alv-card"
          style={{ padding: 14, marginBottom: 16, borderLeft: '3px solid var(--alv-mint,#1F7A5C)' }}
        >
          {notice}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {roles.map((r) => {
          const active = r.id === selectedId;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              aria-pressed={active}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                border: '1px solid var(--alv-line)',
                background: active ? 'var(--alv-ink)' : 'var(--alv-surface)',
                color: active ? '#fff' : 'var(--alv-ink)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {r.name}
              <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: 8, fontSize: 12.5 }}>
                {r.adminCount}
              </span>
            </button>
          );
        })}
      </div>

      {selected && matrix ? (
        <>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>
              {selected.name}
              {selected.isSystem ? (
                <span
                  className="alv-badge alv-badge--neutral"
                  style={{ marginLeft: 10, fontSize: 10, height: 18 }}
                >
                  tizim roli
                </span>
              ) : null}
            </h2>
            <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 13.5 }}>
              <code>{selected.code}</code> · {selected.adminCount} ta admin ·{' '}
              {isSuper ? 'barcha huquqlar' : `${draft.size} ta huquq`}
            </p>
          </div>

          {isSuper ? (
            <div className="alv-card" style={{ padding: 18, marginBottom: 18 }}>
              Super Admin har doim to‘liq huquqqa ega — bu rol tahrirlanmaydi. Aks holda oxirgi
              to‘liq huquqli hisobni tasodifan cheklab qo‘yish mumkin edi.
            </div>
          ) : null}

          <div className="alv-card" style={{ overflowX: 'auto' }}>
            <table
              style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: 13.5 }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--alv-line)',
                      fontSize: 11,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      color: 'var(--alv-muted)',
                      position: 'sticky',
                      left: 0,
                      background: 'var(--alv-surface)',
                    }}
                  >
                    Modul
                  </th>
                  {matrix.actions.map((a) => (
                    <th
                      key={a.key}
                      style={{
                        padding: '12px 12px',
                        borderBottom: '1px solid var(--alv-line)',
                        fontSize: 11,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                        color: 'var(--alv-muted)',
                      }}
                    >
                      {a.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.modules.map((m) => (
                  <tr key={m.key}>
                    <td
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--alv-line)',
                        fontWeight: 600,
                        position: 'sticky',
                        left: 0,
                        background: 'var(--alv-surface)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.label}
                    </td>
                    {matrix.actions.map((a) => {
                      const code = `${m.key}.${a.key}`;
                      const exists = matrix.permissions.includes(code);
                      return (
                        <td key={a.key} style={cell}>
                          {exists ? (
                            <input
                              type="checkbox"
                              aria-label={`${m.label} — ${a.label}`}
                              checked={isSuper || draft.has(code)}
                              disabled={isSuper}
                              onChange={() => toggle(code)}
                              style={{
                                width: 17,
                                height: 17,
                                accentColor: 'var(--alv-brand,#D6336C)',
                                cursor: isSuper ? 'not-allowed' : 'pointer',
                              }}
                            />
                          ) : (
                            <span style={{ color: 'var(--alv-line)' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dirty && !isSuper ? (
            <div
              style={{
                position: 'sticky',
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
                marginTop: 10,
                background: 'var(--alv-ink)',
                color: '#fff',
                borderRadius: 12,
              }}
            >
              <strong style={{ fontSize: 14 }}>Huquqlar o‘zgartirildi</strong>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => setDraft(new Set(selected.permissions))}
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.35)',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                style={{
                  padding: '9px 22px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--alv-brand,#D6336C)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: busy ? 'wait' : 'pointer',
                }}
              >
                {busy ? 'Saqlanmoqda…' : 'Saqlash'}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <section style={{ marginTop: 34 }}>
        <h2 style={{ fontSize: 17, margin: '0 0 10px' }}>Yangi rol</h2>
        <form
          className="alv-card"
          style={{ padding: 18, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              const created = await adminApi.createRole({ name: newName, permissions: [] });
              setNewName('');
              await load();
              setSelectedId(created.id);
              setNotice('Rol yaratildi — endi huquqlarni belgilang');
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Rol nomi, masalan «Kuryer koordinatori»"
            style={{
              flex: '1 1 260px',
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid var(--alv-line)',
              fontSize: 14,
              background: 'var(--alv-surface)',
              color: 'var(--alv-ink)',
            }}
          />
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--alv-ink)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Qo‘shish
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
