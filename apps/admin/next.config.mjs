/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  transpilePackages: ['@aliver/ui', '@aliver/types'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  /**
   * Same-origin API proxy.
   *
   * Brauzer `/api/...` ga so'rov yuboradi, Next.js uni serverda API ga
   * uzatadi. Shu sababli API qaytargan cookie BRAUZER UCHUN shu domenniki
   * bo'ladi — ya'ni birinchi tomon cookie si, uni Safari ham, uchinchi
   * tomon cookie'lari o'chirilgan Chrome ham bloklamaydi.
   *
   * `API_ORIGIN` — SERVER o'zgaruvchisi (`NEXT_PUBLIC_` emas): u brauzer
   * paketiga tushmasligi kerak, aks holda kimdir so'rovlarni yana tashqi
   * domenga yo'naltirib, cookie muammosini qaytarib keltirardi.
   */
  async rewrites() {
    /*
     * Zaxira: `NEXT_PUBLIC_API_URL` allaqachon sozlangan bo'lsa, undan
     * origin ajratib olinadi (`.../api` qismi kesiladi).
     *
     * Bu ATAYLAB: Render'da bu o'zgaruvchi allaqachon bor, ya'ni kodni
     * deploy qilish uchun panelda hech narsa o'zgartirish shart emas.
     * `API_ORIGIN` berilsa — u ustun turadi.
     */
    const origin = (
      process.env.API_ORIGIN ??
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ??
      'http://localhost:4000'
    ).replace(/\/+$/, '');
    return [{ source: '/api/:path*', destination: `${origin}/api/:path*` }];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};
export default nextConfig;
