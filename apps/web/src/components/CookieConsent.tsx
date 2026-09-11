'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

type Consent = 'accepted' | 'rejected' | null;
const KEY = 'aliver_cookie_consent_v1';

export function CookieConsent({ locale }: { locale: 'uz' | 'ru' }) {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConsent(localStorage.getItem(KEY) as Consent);
    setReady(true);
  }, []);

  function decide(value: Exclude<Consent, null>) {
    localStorage.setItem(KEY, value);
    setConsent(value);
  }

  const gaId = process.env.NEXT_PUBLIC_GA4_ID;
  const metaId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const tiktokId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

  return (
    <>
      {consent === 'accepted' && gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4-consented" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments)}
            gtag('js', new Date()); gtag('config', '${gaId}', { anonymize_ip: true });
          `}</Script>
        </>
      ) : null}
      {consent === 'accepted' && metaId ? (
        <Script id="meta-consented" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
          (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${metaId}');fbq('track','PageView');
        `}</Script>
      ) : null}
      {consent === 'accepted' && gtmId ? (
        <Script id="gtm-consented" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}</Script>
      ) : null}
      {consent === 'accepted' && tiktokId ? (
        <Script id="tiktok-consented" strategy="afterInteractive">{`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var i='https://analytics.tiktok.com/i18n/pixel/events.js',n=d.createElement('script');n.type='text/javascript';n.async=!0;n.src=i+'?sdkid='+e+'&lib='+t;var a=d.getElementsByTagName('script')[0];a.parentNode.insertBefore(n,a)};ttq.load('${tiktokId}');ttq.page()}(window,document,'ttq');`}</Script>
      ) : null}
      {ready && consent === null ? (
        <section aria-label={locale === 'ru' ? 'Настройки cookie' : 'Cookie sozlamalari'} style={{ position: 'fixed', zIndex: 1000, left: 16, right: 16, bottom: 16, maxWidth: 760, margin: '0 auto', padding: 18, borderRadius: 16, background: '#fff', boxShadow: '0 12px 44px rgba(17,24,39,.2)', border: '1px solid #e5e7eb' }}>
          <strong>{locale === 'ru' ? 'Конфиденциальность' : 'Maxfiylik'}</strong>
          <p style={{ margin: '8px 0 14px', lineHeight: 1.5, color: '#4b5563', fontSize: 14 }}>
            {locale === 'ru' ? 'Аналитические и рекламные скрипты загружаются только после вашего согласия.' : 'Analitika va reklama skriptlari faqat roziligingizdan keyin yuklanadi.'}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="alv-btn alv-btn--primary" onClick={() => decide('accepted')}>{locale === 'ru' ? 'Разрешить' : 'Ruxsat berish'}</button>
            <button className="alv-btn alv-btn--outline" onClick={() => decide('rejected')}>{locale === 'ru' ? 'Отказаться' : 'Rad etish'}</button>
          </div>
        </section>
      ) : null}
    </>
  );
}
