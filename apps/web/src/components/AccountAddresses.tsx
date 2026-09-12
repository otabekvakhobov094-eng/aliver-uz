'use client';

import { useEffect, useState } from 'react';
import { Button } from '@aliver/ui';
import { AccountAlert, AccountCard, accountField } from './AccountShell';
import { ShopError, shopApi, type DeliveryRegion, type SavedAddress } from '@/lib/shop-api';
import { AccountStateView } from './AccountState';
import { useAccountData } from './useAccountData';
import type { Locale } from '@/i18n/messages';

const EMPTY = {
  id: undefined as string | undefined,
  label: '',
  recipient: '',
  phone: '',
  regionId: '',
  districtId: '',
  street: '',
  landmark: '',
};

export function AccountAddresses({ locale }: { locale: Locale }) {
  const [list, setList] = useState<SavedAddress[] | null>(null);
  const [regions, setRegions] = useState<DeliveryRegion[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, state, reload } = useAccountData(async () => {
    const [a, r] = await Promise.all([shopApi.addresses(), shopApi.regions()]);
    return { addresses: a, regions: r };
  });

  useEffect(() => {
    if (!data) return;
    setList(data.addresses);
    setRegions(data.regions);
  }, [data]);

  const region = regions.find((r) => r.id === form.regionId);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await shopApi.saveAddress({
        ...(form.id ? { id: form.id } : {}),
        label: form.label.trim() || undefined,
        recipient: form.recipient.trim(),
        phone: form.phone.trim(),
        regionId: form.regionId,
        districtId: form.districtId || undefined,
        street: form.street.trim(),
        landmark: form.landmark.trim() || undefined,
      });
      setList(await shopApi.addresses());
      setForm({ ...EMPTY });
      setOpen(false);
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const edit = (a: SavedAddress) => {
    setForm({
      id: a.id,
      label: a.label ?? '',
      recipient: a.recipient,
      phone: a.phone,
      regionId: a.regionId,
      districtId: a.districtId ?? '',
      street: a.street,
      landmark: a.landmark ?? '',
    });
    setOpen(true);
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      setList(await shopApi.deleteAddress(id));
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (id: string) => {
    setBusy(true);
    try {
      setList(await shopApi.setDefaultAddress(id));
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const canSave =
    !busy &&
    form.recipient.trim().length >= 2 &&
    form.phone.replace(/\D/g, '').length >= 9 &&
    Boolean(form.regionId) &&
    form.street.trim().length >= 5;

  if (state.status !== 'ready' || !list) {
    return <AccountStateView state={state} locale={locale} onRetry={reload} />;
  }

  return (
    <>
      {error ? (
        <AccountCard>
          <AccountAlert tone="danger">{error}</AccountAlert>
        </AccountCard>
      ) : null}

      <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        {list.map((a) => (
          <div
            key={a.id}
            style={{
              background: 'var(--alv-surface)',
              borderRadius: 'var(--alv-radius-lg)',
              padding: 16,
              boxShadow: 'var(--alv-shadow-sm)',
              display: 'grid',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 15 }}>{a.label || a.recipient}</strong>
              {a.isDefault ? (
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: 'var(--alv-brand-soft)',
                    color: 'var(--alv-brand-deep)',
                  }}
                >
                  {locale === 'ru' ? 'По умолчанию' : 'Standart'}
                </span>
              ) : null}
            </div>

            <div style={{ fontSize: 13.5, color: 'var(--alv-ink-2)', lineHeight: 1.55 }}>
              {[
                locale === 'ru' ? a.regionNameRu : a.regionNameUz,
                locale === 'ru' ? a.districtNameRu : a.districtNameUz,
                a.street,
              ]
                .filter(Boolean)
                .join(', ')}
              {a.landmark ? ` · ${a.landmark}` : ''}
            </div>

            <div style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>
              {a.recipient} · {a.phone}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="ghost" size="sm" onClick={() => edit(a)}>
                {locale === 'ru' ? 'Изменить' : 'Tahrirlash'}
              </Button>
              {!a.isDefault ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void makeDefault(a.id)}
                >
                  {locale === 'ru' ? 'Сделать основным' : 'Standart qilish'}
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => void remove(a.id)}>
                {locale === 'ru' ? 'Удалить' : 'O‘chirish'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {open ? (
        <AccountCard
          title={
            form.id
              ? locale === 'ru'
                ? 'Изменить адрес'
                : 'Manzilni tahrirlash'
              : locale === 'ru'
                ? 'Новый адрес'
                : 'Yangi manzil'
          }
        >
          <Field
            label={locale === 'ru' ? 'Название (Дом, Работа)' : 'Nomi (Uy, Ish)'}
            value={form.label}
            onChange={(v) => setForm((f) => ({ ...f, label: v }))}
          />

          <div className="alv-field-row">
            <Field
              label={locale === 'ru' ? 'Получатель' : 'Qabul qiluvchi'}
              value={form.recipient}
              onChange={(v) => setForm((f) => ({ ...f, recipient: v }))}
              required
            />
            <Field
              label={locale === 'ru' ? 'Телефон' : 'Telefon'}
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              required
              type="tel"
            />
          </div>

          <div className="alv-field-row">
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
                {locale === 'ru' ? 'Область' : 'Viloyat'}
              </span>
              <select
                value={form.regionId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, regionId: e.target.value, districtId: '' }))
                }
                style={accountField}
              >
                <option value="">{locale === 'ru' ? 'Выберите' : 'Tanlang'}</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {locale === 'ru' ? r.nameRu : r.nameUz}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
                {locale === 'ru' ? 'Район' : 'Tuman'}
              </span>
              <select
                value={form.districtId}
                onChange={(e) => setForm((f) => ({ ...f, districtId: e.target.value }))}
                disabled={!region || region.districts.length === 0}
                style={{ ...accountField, opacity: region?.districts.length ? 1 : 0.6 }}
              >
                <option value="">{locale === 'ru' ? 'Выберите' : 'Tanlang'}</option>
                {(region?.districts ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {locale === 'ru' ? d.nameRu : d.nameUz}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Field
            label={locale === 'ru' ? 'Адрес' : 'Manzil'}
            value={form.street}
            onChange={(v) => setForm((f) => ({ ...f, street: v }))}
            required
          />
          <Field
            label={locale === 'ru' ? 'Ориентир' : 'Mo‘ljal'}
            value={form.landmark}
            onChange={(v) => setForm((f) => ({ ...f, landmark: v }))}
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="primary" disabled={!canSave} onClick={() => void save()}>
              {locale === 'ru' ? 'Сохранить' : 'Saqlash'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setForm({ ...EMPTY });
                setOpen(false);
              }}
            >
              {locale === 'ru' ? 'Отмена' : 'Bekor qilish'}
            </Button>
          </div>
        </AccountCard>
      ) : (
        <Button variant="primary" onClick={() => setOpen(true)}>
          {locale === 'ru' ? 'Добавить адрес' : 'Manzil qo‘shish'}
        </Button>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
        {label}
        {required ? <span style={{ color: 'var(--alv-brand)' }}> *</span> : null}
      </span>
      <input
        value={value}
        type={type}
        onChange={(e) => onChange(e.target.value)}
        style={accountField}
      />
    </label>
  );
}
