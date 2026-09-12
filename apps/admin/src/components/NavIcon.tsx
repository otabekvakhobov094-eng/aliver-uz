import type { IconName } from '@/lib/nav';

/**
 * Sidebar ikonkalari.
 *
 * Ular ATAYLAB shu yerda, alohida kutubxonasiz: yigirmatacha oddiy
 * shakl uchun ikonka paketini olib kelish ortiqcha yuk bo'lardi, va
 * paketning uslubi bizniki bilan mos kelmasligi ham mumkin.
 *
 * Hammasi bir xil qoidada chizilgan: 20×20 maydon, faqat chiziq
 * (`stroke`), qalinlik 1.5. Bir xil qoida — bu ikonkalar yonma-yon
 * turganda bir to'plamdek ko'rinishining yagona sababi; qalinligi
 * har xil ikonkalar to'plami tasodifiy yig'ilgandek ko'rinadi.
 *
 * Ikonka MA'NO tashimaydi — yonida har doim matn turadi. Shuning uchun
 * u `aria-hidden`: ekran o'quvchisi bandni ikki marta o'qib bermasin.
 */
const PATHS: Record<IconName, string> = {
  home: 'M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1z',
  orders: 'M4 6h12l-1 10.5a1 1 0 0 1-1 .9H6a1 1 0 0 1-1-.9zM7.5 6V4.5a2.5 2.5 0 0 1 5 0V6',
  card: 'M3 6.5h14v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 9h14M6 13h3',
  scale: 'M10 4v13M4 7h12M6.5 7 4 12.5h5zM13.5 7 11 12.5h5z',
  receipt: 'M5 3.5h10v14l-2-1.3-1.7 1.3-1.8-1.3-1.7 1.3L6 16.2 5 17zM8 7.5h4M8 10.5h4',
  return: 'M4 9.5h8.5a3.5 3.5 0 0 1 0 7H8M4 9.5 7 6.5M4 9.5l3 3',
  box: 'M10 3.5 17 7v6l-7 3.5L3 13V7zM3 7l7 3.5M17 7l-7 3.5v6',
  tag: 'M4 4h5.5l6.5 6.5-5.5 5.5L4 9.5zM7 7h.01',
  grid: 'M3.5 3.5h5.5v5.5H3.5zM11 3.5h5.5v5.5H11zM3.5 11h5.5v5.5H3.5zM11 11h5.5v5.5H11z',
  layers: 'M10 3.5 17 7l-7 3.5L3 7zM3 11l7 3.5L17 11M3 14.5 10 18l7-3.5',
  warehouse: 'M3 8.5 10 4l7 4.5V17H3zM7 17v-5h6v5',
  upload: 'M10 13.5V4M10 4 6.5 7.5M10 4l3.5 3.5M3.5 13v3a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3',
  store: 'M3.5 4h13l1 4a2.5 2.5 0 0 1-4.8 1 2.5 2.5 0 0 1-4.4 0 2.5 2.5 0 0 1-4.8-1zM4.5 9.5V17h11V9.5',
  users: 'M7.5 9.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5zM2.5 17c0-2.6 2.2-4.5 5-4.5s5 1.9 5 4.5M13 5.2a2.5 2.5 0 0 1 0 4.8M14.5 12.8c1.8.6 3 2.1 3 4.2',
  star: 'm10 3.8 2 4.2 4.5.6-3.3 3.2.8 4.6-4-2.2-4 2.2.8-4.6L3.5 8.6l4.5-.6z',
  gift: 'M3.5 9h13v7.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM3 6h14v3H3zM10 6v11.5M10 6C10 4.6 8.9 3.5 7.5 3.5S5 4.6 5 6M10 6c0-1.4 1.1-2.5 2.5-2.5S15 4.6 15 6',
  percent: 'M5 15 15 5M6.5 8a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5zM13.5 15.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5z',
  briefcase: 'M3 7h14v8.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM7 7V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7M3 11h14',
  menu: 'M3.5 5.5h13M3.5 10h13M3.5 14.5h13',
  page: 'M5 3.5h6l4 4V17H5zM11 3.5V8h4M7.5 11h5M7.5 13.5h5',
  image: 'M3.5 4.5h13v11h-13zM3.5 13l3.5-3.5 2.5 2.5 3-3 4 4M12.5 7.8h.01',
  pen: 'M13.5 3.8 16.2 6.5 7 15.7l-3.4.7.7-3.4zM11.8 5.5l2.7 2.7',
  chart: 'M3.5 16.5h13M6 14V9M10 14V5M14 14v-3.5',
  history: 'M10 5.5V10l3 1.8M3.6 8.5A6.75 6.75 0 1 1 3.5 11M3.6 8.5H7M3.6 8.5V5',
  truck: 'M2.5 6h9v8h-9zM11.5 9h3l2.5 2.5V14h-5.5zM6 16.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM14 16.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  bell: 'M10 3.5a4.5 4.5 0 0 1 4.5 4.5c0 3.2 1 4 1 4h-11s1-.8 1-4A4.5 4.5 0 0 1 10 3.5zM8.5 15a1.6 1.6 0 0 0 3 0',
  shield: 'M10 3.5 16 5.5v4.8c0 3.3-2.4 5.5-6 6.7-3.6-1.2-6-3.4-6-6.7V5.5z',
  gear: 'M10 12.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2zM10 2.8l1 1.9 2.1-.4 1.1 1.8-1.3 1.7.9 2 2 .6v2.1l-2 .6-.9 2 1.3 1.7-1.1 1.8-2.1-.4-1 1.9h-.1l-1-1.9-2.1.4-1.1-1.8 1.3-1.7-.9-2-2-.6V9.4l2-.6.9-2-1.3-1.7 1.1-1.8 2.1.4 1-1.9z',
  coin: 'M10 16.5c3.6 0 6.5-1.3 6.5-3s-2.9-3-6.5-3-6.5 1.3-6.5 3 2.9 3 6.5 3zM3.5 13.5v-7M16.5 13.5v-7M10 9.5c3.6 0 6.5-1.3 6.5-3s-2.9-3-6.5-3-6.5 1.3-6.5 3 2.9 3 6.5 3z',
};

export function NavIcon({ name }: { name: IconName }) {
  return (
    <svg
      className="alv-nav__icon"
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
