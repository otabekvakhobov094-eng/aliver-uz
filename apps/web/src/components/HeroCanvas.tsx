'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Bosh sahifadagi 3D hero foni — oqayotgan ipak effekti.
 *
 * NEGA KUTUBXONASIZ. Three.js kabi kutubxona bu effekt uchun 150–600 KB
 * qo'shardi. Bu yerda esa butun sahna bitta fragment shader — ~2 KB kod.
 * Render'ning bepul tarifida va sekin mobil internetda bu farq sezilarli.
 *
 * NEGA BUNCHA TEKSHIRUV. Animatsiya chiroyli bo'lishi yetarli emas —
 * u ZARAR KELTIRMASLIGI kerak:
 *
 *   * `prefers-reduced-motion` — harakat ba'zi odamlarda bosh aylanishi
 *     va ko'ngil aynishini keltirib chiqaradi;
 *   * `saveData` va sekin ulanish — trafikni tejayotgan odamga
 *     bezak uchun GPU ishlatish hurmatsizlik;
 *   * WebGL yo'q — eski qurilmalarda va ba'zi korporativ brauzerlarda;
 *   * ekrandan chiqqanda va boshqa ilovaga o'tganda — TO'XTAYDI, aks
 *     holda telefon foni behuda qiziydi va batareya yeyiladi.
 *
 * Har bir holatda CSS zaxira foni ko'rinadi (`alv-hero-fallback`) —
 * u ham chiroyli, shuning uchun "buzilgan" ko'rinmaydi.
 */
export function HeroCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* ------------------------- Ishlatmaslik sabablari ------------------------- */

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType && /^(slow-)?2g$/.test(connection.effectiveType)) return;

    // Yadro soni bo'yicha TAXMIN QILMAYMIZ: u qurilma kuchini yomon
    // o'lchaydi (maxfiylik uchun soxtalashtiriladi, GPU haqida esa hech
    // narsa aytmaydi). Buning o'rniga pastda HAQIQIY kadr vaqti
    // o'lchanadi va sekin bo'lsa animatsiya o'zi to'xtaydi.
    if ((navigator.hardwareConcurrency ?? 8) < 2) return;

    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      // Fon uchun eng tejamkor rejim: mustaqil grafik kartani uyg'otmaydi.
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    });
    if (!gl) return;

    /* --------------------------------- Shader --------------------------------- */

    const vertexSource = `
      attribute vec2 aPosition;
      void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
    `;

    // Domen buzish (domain warping): koordinata bir necha marta o'ziga
    // qaytariladi va natijada silliq, "suyuq" oqim hosil bo'ladi.
    const fragmentSource = `
      precision mediump float;
      uniform vec2 uResolution;
      uniform float uTime;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amplitude * noise(p);
          p *= 2.02;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        vec2 p = uv * 2.2;
        p.x *= uResolution.x / uResolution.y;

        float t = uTime * 0.045;

        vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
        vec2 r = vec2(
          fbm(p + 3.0 * q + vec2(1.7, 9.2) + 0.3 * t),
          fbm(p + 3.0 * q + vec2(8.3, 2.8) - 0.2 * t)
        );
        float f = fbm(p + 3.5 * r);

        // Brend palitrasi: sut oq -> pushti -> shaftoli -> chuqur atirgul.
        vec3 cream = vec3(1.000, 0.980, 0.969);
        vec3 blush = vec3(0.976, 0.847, 0.878);
        vec3 peach = vec3(1.000, 0.906, 0.835);
        vec3 rose  = vec3(0.894, 0.588, 0.667);

        vec3 color = mix(cream, blush, clamp(f * 1.6, 0.0, 1.0));
        color = mix(color, peach, clamp(r.x * 0.9, 0.0, 1.0));
        color = mix(color, rose, clamp(pow(q.y, 1.8) * 0.75, 0.0, 1.0));

        // Yuqori o'ng burchakda yumshoq yorug'lik — hajm hissi.
        float glow = smoothstep(1.1, 0.15, distance(uv, vec2(0.78, 0.28)));
        color += vec3(0.09, 0.045, 0.06) * glow;

        // Yengil vinyetka: markaz yorqinroq qoladi, matn o'qilishi yaxshilanadi.
        color *= 1.0 - 0.10 * smoothstep(0.35, 1.0, distance(uv, vec2(0.5)));

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function compile(type: number, source: string): WebGLShader | null {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        gl!.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    // Butun ekranni qoplaydigan ikkita uchburchak.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const positionLocation = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, 'uResolution');
    const timeLocation = gl.getUniformLocation(program, 'uTime');

    /* --------------------------------- O'lcham --------------------------------- */

    function resize(): void {
      // Fon uchun to'liq piksel zichligi shart emas — 1.5 da farq
      // ko'rinmaydi, lekin GPU yuki sezilarli kamayadi.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.floor(canvas!.clientWidth * dpr);
      const height = Math.floor(canvas!.clientHeight * dpr);
      if (canvas!.width === width && canvas!.height === height) return;
      canvas!.width = width;
      canvas!.height = height;
      gl!.viewport(0, 0, width, height);
      gl!.uniform2f(resolutionLocation, width, height);
    }

    /* --------------------------------- Aylanish --------------------------------- */

    let frame = 0;
    let running = false;
    let visible = true;
    let onScreen = true;

    /*
     * Unumdorlik nazorati.
     *
     * Dastlabki kadrlar o'lchanadi. Agar qurilma bu shaderni silliq
     * chiza olmasa (o'rtacha kadr ~24 ms dan sekin, ya'ni 40 FPS dan
     * past), animatsiya BUTUNLAY to'xtaydi va chiroyli CSS zaxira foni
     * qoladi. Sekin animatsiya animatsiya yo'qligidan yomonroq: sahifa
     * "buzuq" his qildiradi va skroll ham qoqiladi.
     */
    const SAMPLE_FRAMES = 24;
    const SLOW_FRAME_MS = 24;
    let sampled = 0;
    let sampleTotal = 0;
    let giveUp = false;
    // Vaqt to'xtatilgan paytda o'smasligi kerak, aks holda qaytganda
    // rasm keskin "sakraydi".
    let elapsed = 0;
    let last = 0;

    function draw(now: number): void {
      if (!running) return;
      const delta = Math.min(now - last, 50); // Uzun pauzadan keyin sakramasin.
      elapsed += delta;
      last = now;
      resize();
      gl!.uniform1f(timeLocation, elapsed / 1000);
      gl!.drawArrays(gl!.TRIANGLES, 0, 6);

      // Birinchi kadrlar o'lchanadi; ular orasida sahifa hali
      // yuklanayotgani uchun eng birinchisi hisobga olinmaydi.
      if (!giveUp && sampled < SAMPLE_FRAMES) {
        if (sampled > 0) sampleTotal += delta;
        sampled += 1;
        if (sampled === SAMPLE_FRAMES && sampleTotal / (SAMPLE_FRAMES - 1) > SLOW_FRAME_MS) {
          giveUp = true;
          stop();
          setActive(false);
          return;
        }
      }

      frame = requestAnimationFrame(draw);
    }

    function start(): void {
      if (running || !visible || !onScreen || giveUp) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(draw);
    }

    function stop(): void {
      running = false;
      cancelAnimationFrame(frame);
    }

    const onVisibility = (): void => {
      visible = document.visibilityState === 'visible';
      visible ? start() : stop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            ([entry]) => {
              onScreen = entry?.isIntersecting ?? true;
              onScreen ? start() : stop();
            },
            { threshold: 0 },
          )
        : null;
    observer?.observe(canvas);

    const onResize = (): void => resize();
    window.addEventListener('resize', onResize, { passive: true });

    // Kontekst yo'qolishi mumkin (qurilma xotirani bo'shatadi) —
    // bunda zaxira foniga qaytamiz, qora to'rtburchak qoldirmaymiz.
    const onContextLost = (event: Event): void => {
      event.preventDefault();
      stop();
      setActive(false);
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    resize();
    setActive(true);
    start();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      observer?.disconnect();
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteBuffer(buffer);
      // GPU resursini darhol qaytaramiz: sahifalar orasida yurganda
      // brauzer WebGL kontekstlari sonini cheklaydi.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        // Shader tayyor bo'lgunicha zaxira fon ko'rinadi; keyin
        // canvas yumshoq ochiladi va almashish sezilmaydi.
        opacity: active ? 1 : 0,
        transition: 'opacity 900ms cubic-bezier(0.22, 1, 0.36, 1)',
        pointerEvents: 'none',
      }}
    />
  );
}
