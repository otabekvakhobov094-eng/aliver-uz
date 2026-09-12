import { AliverLogo } from '@aliver/ui';

/**
 * Ochilish animatsiyasi — logotip avval, so'ng sayt.
 *
 * Bu yerda uchta xavf bor va uchalasi ham ataylab yopilgan:
 *
 *   1. TARKIB YASHIRILMAYDI. Qoplama sahifaning USTIDA turadi, sayt
 *      esa ostida odatdagidek chiziladi. Qidiruv tizimi ham, ekran
 *      o'quvchi ham hamma narsani birinchi HTML da ko'radi. Tarkibni
 *      animatsiya tugagunicha yashirish SEO ni buzardi.
 *
 *   2. JAVASCRIPT'SIZ HAM YO'QOLADI. Qoplama sof CSS animatsiyasi
 *      bilan ketadi (`forwards` va `pointer-events: none`). Skript
 *      yiqilsa yoki sekin yuklansa ham foydalanuvchi oq ekran ostida
 *      qolib ketmaydi — bu shunday animatsiyalardagi eng jiddiy xato.
 *
 *   3. BIR SEANSDA BIR MARTA. Har sahifada takrorlanadigan kirish
 *      animatsiyasi uchinchi martadayoq bezor qiladi. Kichik inline
 *      skript `sessionStorage` ni o'qiydi va `<html>` ga belgi qo'yadi
 *      — u chizishdan OLDIN ishlaydi, ya'ni miltillash bo'lmaydi.
 *
 * Umumiy davomiylik 2.6 soniya. Ilgari 1.15 edi va bu juda tez edi:
 * logotip ko'zga tashlanmasdan turib yo'qolardi, ya'ni animatsiya bor
 * edi-yu, brend ko'rinmasdi. Vaqt `motion.css` dagi bitta
 * `--alv-intro-dur` qiymatidan boshqariladi.
 *
 * Chuqurlik («4D») ota elementdagi `perspective` va bolalarining
 * `translateZ`/`rotateX` i orqali beriladi — logotip uzoqdan kelib
 * fokusga tushadi, so'ng kuzatuvchiga tomon o'tib eriydi va sayt
 * uning ichidan ochiladi. Harakat faqat `transform`/`opacity`/`filter`
 * bo'yicha, ya'ni kompozitor qatlamida.
 */
export function BrandIntro() {
  return (
    <>
      {/*
        Skript `beforeInteractive` emas, ODDIY inline: u `<body>` ning
        boshida turadi va qoplama chizilishidan oldin bajariladi.
        `dangerouslySetInnerHTML` — Next.js inline skriptni shundan
        boshqa yo'l bilan bermaydi.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{
            if(sessionStorage.getItem('alv.intro')==='1'){
              document.documentElement.classList.add('alv-intro-seen');
            } else {
              sessionStorage.setItem('alv.intro','1');
            }
          }catch(e){/* maxfiy oynada sessionStorage xato tashlaydi — animatsiya shunchaki ko'rinadi */}})();`,
        }}
      />
      <div className="alv-intro" aria-hidden>
        <div className="alv-intro__veil" />
        <div className="alv-intro__glow" />
        <div className="alv-intro__stage">
          <div className="alv-intro__mark">
            <AliverLogo height={78} decorative />
            <span className="alv-intro__sheen" />
          </div>
          <div className="alv-intro__line" />
          <div className="alv-intro__tag">Laboratories of Nature</div>
        </div>
      </div>
    </>
  );
}
