'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminRole, type AdminUser } from '@/lib/api';

/** Adminlar — TZ 72. */

const EMPTY = { fullName: '', email: '', phone: '', roleId: '', password: '' };

function dateText(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [u, r] = await Promise.all([adminApi.users({ q: q || undefined }), adminApi.roles()]);
      setUsers(u);
      setRoles(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(ok);
      await load();
      return true;
    } catch (e) {
      // Server qaytargan sababni o'zgartirmasdan ko'rsatamiz — u
      // "yagona faol Super Admin" kabi aniq tushuntirish beradi.
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = {
    padding: '9px 12px',
    borderRadius: 10,
    border: '1px solid var(--alv-line)',
    fontSize: 14,
    background: 'var(--alv-surface)',
    color: 'var(--alv-ink)',
    minWidth: 0,
  };

  return (
    <AdminShell title="Adminlar">
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ism, e-pochta yoki telefon"
          aria-label="Adminlarni qidirish"
          style={{ ...input, flex: '1 1 260px' }}
        />
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--alv-ink)',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {creating ? 'Yopish' : 'Yangi admin'}
        </button>
      </div>

      {creating ? (
        <form
          className="alv-card"
          style={{ padding: 20, marginBottom: 22, display: 'grid', gap: 12 }}
          onSubmit={async (e) => {
            e.preventDefault();
            const done = await run(
              () =>
                adminApi.createUser({
                  fullName: form.fullName,
                  email: form.email,
                  phone: form.phone || undefined,
                  roleId: form.roleId,
                  password: form.password,
                }),
              'Admin yaratildi',
            );
            if (done) {
              setForm(EMPTY);
              setCreating(false);
            }
          }}
        >
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}
          >
            <input
              required
              placeholder="To‘liq ism"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              style={input}
            />
            <input
              required
              type="email"
              placeholder="E-pochta"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={input}
            />
            <input
              placeholder="Telefon"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              style={input}
            />
            <select
              required
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              style={input}
              aria-label="Rol"
            >
              <option value="">Rolni tanlang</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <input
              required
              type="password"
              placeholder="Boshlang‘ich parol"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={input}
            />
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
            Parol kamida 10 ta belgidan iborat bo‘lsin va faqat raqamlardan tuzilmasin. Xodim
            birinchi kirgach uni o‘zgartirsin.
          </p>
          <button
            type="submit"
            disabled={busy}
            style={{
              justifySelf: 'start',
              padding: '10px 22px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--alv-brand,#D6336C)',
              color: '#fff',
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            Yaratish
          </button>
        </form>
      ) : null}

      <div className="alv-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              {['Ism', 'Rol', 'Holat', 'Oxirgi kirish', '2FA', ''].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--alv-line)',
                    fontSize: 11,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: 'var(--alv-muted)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--alv-line)' }}>
                  <strong>{u.fullName}</strong>
                  <div style={{ color: 'var(--alv-muted)', fontSize: 13 }}>
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ''}
                  </div>
                </td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--alv-line)' }}>
                  <select
                    value={u.role.id}
                    aria-label={`${u.fullName} roli`}
                    onChange={(e) =>
                      void run(() => adminApi.updateUser(u.id, { roleId: e.target.value }), 'Rol o‘zgartirildi')
                    }
                    style={{ ...input, padding: '6px 10px' }}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--alv-line)' }}>
                  <span
                    className="alv-badge"
                    style={{
                      background: u.status === 'ACTIVE' ? 'var(--alv-mint,#1F7A5C)' : 'var(--alv-muted)',
                      color: '#fff',
                      fontSize: 11,
                    }}
                  >
                    {u.status === 'ACTIVE' ? 'Faol' : 'Bloklangan'}
                  </span>
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--alv-line)',
                    color: 'var(--alv-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dateText(u.lastLoginAt)}
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--alv-line)',
                    color: u.twoFaEnabled ? 'var(--alv-mint,#1F7A5C)' : 'var(--alv-amber,#9A5A12)',
                  }}
                >
                  {u.twoFaEnabled ? 'Yoqilgan' : 'Yo‘q'}
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--alv-line)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setResetFor(u);
                      setNewPassword('');
                    }}
                    style={{
                      marginRight: 8,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--alv-line)',
                      background: 'transparent',
                      color: 'var(--alv-ink)',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Parol
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void run(
                        () =>
                          adminApi.updateUser(u.id, {
                            status: u.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE',
                          }),
                        u.status === 'ACTIVE' ? 'Bloklandi' : 'Faollashtirildi',
                      )
                    }
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--alv-line)',
                      background: 'transparent',
                      color: 'var(--alv-ink)',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    {u.status === 'ACTIVE' ? 'Bloklash' : 'Faollashtirish'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--alv-muted)' }}>
                  {q ? 'Bu so‘rovga mos admin topilmadi' : 'Hali admin yo‘q'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {resetFor ? (
        <div
          className="alv-card"
          style={{ padding: 20, marginTop: 20, display: 'grid', gap: 12, maxWidth: 460 }}
        >
          <strong>{resetFor.fullName} uchun yangi parol</strong>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
            Saqlangach bu xodimning barcha ochiq sessiyalari yopiladi.
          </p>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Yangi parol"
            style={input}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              disabled={busy || newPassword.length < 10}
              onClick={async () => {
                const done = await run(
                  () => adminApi.resetUserPassword(resetFor.id, newPassword),
                  'Parol almashtirildi, sessiyalar yopildi',
                );
                if (done) setResetFor(null);
              }}
              style={{
                padding: '9px 20px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--alv-brand,#D6336C)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: newPassword.length < 10 ? 0.5 : 1,
              }}
            >
              Saqlash
            </button>
            <button
              type="button"
              onClick={() => setResetFor(null)}
              style={{
                padding: '9px 20px',
                borderRadius: 10,
                border: '1px solid var(--alv-line)',
                background: 'transparent',
                color: 'var(--alv-ink)',
                cursor: 'pointer',
              }}
            >
              Bekor qilish
            </button>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
