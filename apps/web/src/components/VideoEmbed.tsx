'use client';

import { useState } from 'react';
import type { Locale } from '@/i18n/messages';
import styles from './VideoEmbed.module.css';

/**
 * YouTube videosi — «fasad» usulida.
 *
 * NEGA ODDIY `<iframe>` EMAS.
 *
 * YouTube ning oddiy embed kodi sahifa ochilishi bilanoq bir megabaytga
 * yaqin skript yuklaydi VA kuzatuv cookie'larini qo'yadi — foydalanuvchi
 * videoni bosmagan bo'lsa ham. Bizning cookie oynasi esa aniq va'da
 * beradi: «Analitika va reklama skriptlari faqat roziligingizdan keyin
 * yuklanadi». Odatiy embed shu va'dani buzardi.
 *
 * Shuning uchun bu yerda avval faqat SURAT va tugma turadi. Haqiqiy
 * player foydalanuvchi bosgandan keyingina yaratiladi va u
 * `youtube-nocookie.com` domenidan keladi.
 *
 * Yon foydasi: sahifa yengil ochiladi. Videoni ko'radiganlar ozchilik,
 * lekin og'irlikni hamma ko'tarardi.
 *
 * Surat `i.ytimg.com` dan olinadi — bu cookie qo'ymaydigan statik CDN.
 * Surat yuklanmasa (tarmoq yoki bloklovchi kengaytma), ostidagi gradient
 * fon ko'rinadi va tugma baribir ishlaydi.
 */

export function VideoEmbed({
  youtubeId,
  /** Videoning qaysi soniyadan boshlanishi. */
  start = 0,
  title,
  locale,
}: {
  youtubeId: string;
  start?: number;
  title: string;
  locale: Locale;
}) {
  const [playing, setPlaying] = useState(false);
  const ru = locale === 'ru';

  if (playing) {
    return (
      <div className={styles.frame}>
        <iframe
          className={styles.player}
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?start=${start}&autoplay=1&rel=0&modestbranding=1&hl=${locale}`}
          title={title}
          /* `allow` ro'yxati qisqa: kerak bo'lmagan ruxsat berilmaydi. */
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button type="button" className={styles.frame} onClick={() => setPlaying(true)}>
      <img
        className={styles.poster}
        src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
      />
      <span className={styles.shade} aria-hidden />
      <span className={styles.play} aria-hidden>
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
      <span className={styles.label}>
        {title}
        <span>{ru ? 'Смотреть на YouTube' : 'YouTube’da ko‘rish'}</span>
      </span>
      {/* Ekran o'quvchi uchun tugmaning maqsadi. */}
      <span className="alv-visually-hidden">
        {ru ? 'Воспроизвести видео' : 'Videoni ijro etish'}
      </span>
    </button>
  );
}
