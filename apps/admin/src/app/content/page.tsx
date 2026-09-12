'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Input } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type CmsRecord } from '@/lib/api';

type Section = 'pages' | 'blog' | 'banners' | 'faq' | 'redirects';
type FormData = Record<string, string | number | boolean>;
type Field = { key: string; label: string; type?: 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'select'; required?: boolean; options?: string[] };

const labels: Record<Section, string> = { pages: 'Sahifalar', blog: 'Blog', banners: 'Bannerlar', faq: 'FAQ', redirects: 'Redirectlar' };
const fields: Record<Section, Field[]> = {
  pages: [
    { key: 'slug', label: 'Slug', required: true }, { key: 'titleUz', label: 'Sarlavha UZ', required: true }, { key: 'titleRu', label: 'Заголовок RU', required: true },
    { key: 'bodyUz', label: 'Matn UZ', type: 'textarea' }, { key: 'bodyRu', label: 'Текст RU', type: 'textarea' },
    { key: 'seoTitleUz', label: 'SEO title UZ' }, { key: 'seoTitleRu', label: 'SEO title RU' }, { key: 'seoDescUz', label: 'SEO description UZ', type: 'textarea' }, { key: 'seoDescRu', label: 'SEO description RU', type: 'textarea' },
    { key: 'version', label: 'Hujjat versiyasi' }, { key: 'isPublished', label: 'Nashr qilingan', type: 'checkbox' },
  ],
  blog: [
    { key: 'slug', label: 'Slug', required: true }, { key: 'titleUz', label: 'Sarlavha UZ', required: true }, { key: 'titleRu', label: 'Заголовок RU', required: true },
    { key: 'excerptUz', label: 'Qisqa matn UZ', type: 'textarea' }, { key: 'excerptRu', label: 'Краткий текст RU', type: 'textarea' },
    { key: 'bodyUz', label: 'Maqola UZ', type: 'textarea' }, { key: 'bodyRu', label: 'Статья RU', type: 'textarea' },
    { key: 'coverUrl', label: 'Muqova URL' }, { key: 'author', label: 'Muallif' }, { key: 'publishedAt', label: 'Nashr sanasi', type: 'date' }, { key: 'isPublished', label: 'Nashr qilingan', type: 'checkbox' },
  ],
  banners: [
    { key: 'placement', label: 'Joylashuv', type: 'select', options: ['HERO', 'CATEGORY', 'PROMO', 'POPUP', 'MOBILE'], required: true },
    { key: 'titleUz', label: 'Sarlavha UZ' }, { key: 'titleRu', label: 'Заголовок RU' }, { key: 'subtitleUz', label: 'Izoh UZ', type: 'textarea' }, { key: 'subtitleRu', label: 'Описание RU', type: 'textarea' },
    { key: 'imageUrl', label: 'Desktop rasm URL' }, { key: 'imageMobileUrl', label: 'Mobil rasm URL' }, { key: 'videoUrl', label: 'Video URL' },
    { key: 'ctaLabelUz', label: 'Tugma UZ' }, { key: 'ctaLabelRu', label: 'Кнопка RU' }, { key: 'ctaUrl', label: 'Tugma havolasi' },
    { key: 'sortOrder', label: 'Tartib', type: 'number' }, { key: 'startsAt', label: 'Boshlanish', type: 'date' }, { key: 'endsAt', label: 'Tugash', type: 'date' }, { key: 'isActive', label: 'Faol', type: 'checkbox' },
  ],
  faq: [
    { key: 'category', label: 'Bo‘lim' }, { key: 'questionUz', label: 'Savol UZ', required: true }, { key: 'questionRu', label: 'Вопрос RU', required: true },
    { key: 'answerUz', label: 'Javob UZ', type: 'textarea', required: true }, { key: 'answerRu', label: 'Ответ RU', type: 'textarea', required: true },
    { key: 'sortOrder', label: 'Tartib', type: 'number' }, { key: 'isActive', label: 'Faol', type: 'checkbox' },
  ],
  redirects: [
    { key: 'fromPath', label: 'Eski yo‘l', required: true }, { key: 'toPath', label: 'Yangi yo‘l', required: true },
    { key: 'code', label: 'HTTP kodi', type: 'select', options: ['301', '302', '307', '308'] }, { key: 'isActive', label: 'Faol', type: 'checkbox' },
  ],
};

const loaders: Record<Section, () => Promise<CmsRecord[]>> = { pages: adminApi.contentPages, blog: adminApi.blogPosts, banners: adminApi.banners, faq: adminApi.faqs, redirects: adminApi.redirects };

function emptyForm(section: Section): FormData {
  const result: FormData = {};
  for (const field of fields[section]) result[field.key] = field.type === 'checkbox' ? field.key !== 'isPublished' : field.type === 'number' ? 0 : field.key === 'code' ? '301' : field.key === 'placement' ? 'HERO' : '';
  return result;
}

/**
 * Menyudagi «Bannerlar» va «Blog» yozuvlari `/content#banners` va
 * `/content#blog` ga olib boradi. Sahifa hash ni o'qimasa, ikkala
 * havola ham «Sahifalar» bo'limini ochadi va foydalanuvchi menyu
 * ishlamayapti deb o'ylaydi — aynan shunday bo'lgan edi.
 */
function sectionFromHash(): Section {
  if (typeof window === 'undefined') return 'pages';
  const h = window.location.hash.replace('#', '');
  return (Object.keys(labels) as Section[]).includes(h as Section) ? (h as Section) : 'pages';
}

export default function ContentPage() {
  // Server va mijoz birinchi chizishda bir xil bo'lishi shart, shuning
  // uchun hash useEffect da o'qiladi — initial state da emas.
  const [active, setActive] = useState<Section>('pages');
  const [items, setItems] = useState<CmsRecord[]>([]);
  const [editing, setEditing] = useState<CmsRecord | null | undefined>(undefined);
  const [form, setForm] = useState<FormData>(() => emptyForm('pages'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (section: Section) => {
    setLoading(true); setError('');
    try { setItems(await loaders[section]()); } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(active); }, [active, load]);

  // Menyudan `#banners` bilan kelinganda va sahifada turib boshqa
  // hash ga o'tilganda ham bo'lim almashadi.
  useEffect(() => {
    const apply = () => setActive(sectionFromHash());
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  const title = useMemo(() => editing?.id ? 'Yozuvni tahrirlash' : 'Yangi yozuv', [editing]);
  /** Tab bosilganda hash ham yangilanadi — havola ulashsa bo'ladi. */
  function selectSection(section: Section) {
    setActive(section);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', section === 'pages' ? '#' : `#${section}`);
    }
  }

  function openCreate() { setEditing(null); setForm(emptyForm(active)); setError(''); }
  function openEdit(item: CmsRecord) {
    const value = emptyForm(active);
    for (const field of fields[active]) {
      const raw = (item as unknown as Record<string, unknown>)[field.key];
      if (raw !== null && raw !== undefined) value[field.key] = field.type === 'date' ? String(raw).slice(0, 16) : raw as string | number | boolean;
    }
    setEditing(item); setForm(value); setError('');
  }
  function update(key: string, value: string | boolean) { setForm((current) => ({ ...current, [key]: value })); }
  async function save() {
    setSaving(true); setError('');
    try {
      const payload: Record<string, unknown> = {};
      for (const field of fields[active]) {
        let value = form[field.key];
        if (field.type === 'number' || field.key === 'code') value = Number(value);
        payload[field.key] = value === '' ? undefined : value;
      }
      if (editing?.id) await adminApi.updateCms(active, editing.id, payload); else await adminApi.createCms(active, payload);
      setEditing(undefined); await load(active);
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  async function remove(item: CmsRecord) {
    if (!window.confirm('Yozuv o‘chirilsinmi?')) return;
    try { await adminApi.deleteCms(active, item.id); await load(active); } catch (e) { setError((e as Error).message); }
  }

  return <AdminShell title="Kontent va SEO">
    <p style={{ color: 'var(--alv-muted)', marginTop: -10, lineHeight: 1.6 }}>Ikki tildagi CMS kontenti, banner muddatlari va SEO redirectlari bitta markazda boshqariladi.</p>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '22px 0' }}>
      {(Object.keys(labels) as Section[]).map((key) => <button key={key} onClick={() => { selectSection(key); setEditing(undefined); }} className={`alv-btn ${active === key ? 'alv-btn--primary' : 'alv-btn--outline'}`}>{labels[key]}</button>)}
      <span style={{ marginLeft: 'auto' }}><Button onClick={openCreate}>Yangi qo‘shish</Button></span>
    </div>
    {error ? <p role="alert" style={{ color: '#b42318' }}>{error}</p> : null}
    {editing !== undefined ? <section className="alv-card" style={{ padding: 22, marginBottom: 22 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
        {fields[active].map((field) => <label key={field.key} style={{ display: 'grid', gap: 7, gridColumn: field.type === 'textarea' ? '1 / -1' : undefined, fontWeight: 600, fontSize: 13 }}>{field.label}
          {field.type === 'textarea' ? <textarea required={field.required} value={String(form[field.key] ?? '')} onChange={(e) => update(field.key, e.target.value)} rows={field.key.startsWith('body') ? 10 : 4} style={{ border: '1px solid var(--alv-line)', borderRadius: 10, padding: 12, resize: 'vertical', font: 'inherit' }} />
          : field.type === 'checkbox' ? <input type="checkbox" checked={Boolean(form[field.key])} onChange={(e) => update(field.key, e.target.checked)} style={{ width: 20, height: 20 }} />
          : field.type === 'select' ? <select value={String(form[field.key] ?? '')} onChange={(e) => update(field.key, e.target.value)} style={{ border: '1px solid var(--alv-line)', borderRadius: 10, padding: 11 }}>{field.options?.map((option) => <option key={option}>{option}</option>)}</select>
          : <Input required={field.required} type={field.type === 'date' ? 'datetime-local' : field.type ?? 'text'} value={String(form[field.key] ?? '')} onChange={(e) => update(field.key, e.target.value)} />}
        </label>)}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}><Button disabled={saving} onClick={() => void save()}>{saving ? 'Saqlanmoqda…' : 'Saqlash'}</Button><Button variant="outline" onClick={() => setEditing(undefined)}>Bekor qilish</Button></div>
    </section> : null}
    {loading ? <p>Yuklanmoqda…</p> : <div className="alv-card" style={{ overflow: 'hidden' }}>
      {items.length === 0 ? <p style={{ padding: 22, color: 'var(--alv-muted)' }}>Hozircha yozuv yo‘q.</p> : items.map((item, index) => <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderTop: index ? '1px solid var(--alv-line)' : undefined }}><div><strong>{item.titleUz ?? item.questionUz ?? item.fromPath ?? item.placement ?? item.slug}</strong><div style={{ fontSize: 12, color: 'var(--alv-muted)', marginTop: 3 }}>{item.slug ? `/${item.slug}` : item.toPath ?? item.placement}</div></div><span style={{ marginLeft: 'auto' }}><Badge tone={(item.isPublished ?? item.isActive) ? 'mint' : 'neutral'}>{(item.isPublished ?? item.isActive) ? 'Faol' : 'Qoralama'}</Badge></span><Button size="sm" variant="outline" onClick={() => openEdit(item)}>Tahrirlash</Button><Button size="sm" variant="outline" onClick={() => void remove(item)}>O‘chirish</Button></div>)}
    </div>}
  </AdminShell>;
}
