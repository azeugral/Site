/* Amora Maria — a Shih Tzu da Dra. Juliana, em pixel, passeando no fim da seção de dúvidas.
   Quadros: o caminho em data-pet (assets/img/amora-walk.png), folha horizontal de quadros quadrados de 32 px
   olhando para a direita: 0–3 andando (0 também é a pose parada) e 4 piscando.
   Versão kawaii desenhada à mão em PROJETOS LRGZ/Juliana Cubas/amora-sprite/kawaii.py.
   Enquanto a folha não existir, a trilha fica escondida. Anda, para, deixa pegadinhas;
   com clique/toque dá um pulinho e solta um coração. Só roda com a trilha visível.
   Com movimento reduzido fica parada (mas ainda responde ao clique). */
(() => {
  const track = document.querySelector('[data-pet]');
  if (!track) return;
  const SRC = track.dataset.pet;          // vazio = sprite ainda não existe
  if (!SRC) { track.remove(); return; }
  const NAME = 'Amora';
  const FPS = 8;
  const WALK = 4;     // quadros de caminhada; o seguinte é a piscadinha
  const BLINK = 4;
  const FOOT = 3;    // linhas vazias abaixo das patinhas no desenho
  const SCALE = 2;   // cada pixel do desenho vira 2 px na tela
  const SPEED = 18;  // px/s
  const PX = 2;     // pixel dos efeitos
  const FX_PAL = { K: '#6A4450', H: '#E0788F' };
  const HEART = ['.KK.KK.', 'KHHKHHK', 'KHHHHHK', '.KHHHK.', '..KHK..', '...K...'];

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);

  const sheet = new Image();
  sheet.addEventListener('error', () => track.remove());
  sheet.addEventListener('load', init);
  sheet.src = SRC;

  function init() {
    const SH = sheet.naturalHeight, SW = SH;         // quadros quadrados na folha
    const FRAMES = Math.max(1, Math.round(sheet.naturalWidth / SW));
    const canBlink = FRAMES > BLINK;
    const FW = SW * SCALE, FH = SH * SCALE;          // tamanho na tela

    track.hidden = false;
    const dog = document.createElement('button');
    dog.type = 'button';
    dog.className = 'pet__dog';
    dog.setAttribute('aria-label', `${NAME} Maria, a cachorrinha da Dra. Juliana. Clique para fazer carinho.`);
    dog.title = `${NAME} Maria`;
    const view = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    view.width = FW * dpr; view.height = FH * dpr;
    view.style.width = FW + 'px'; view.style.height = FH + 'px';
    dog.style.bottom = (6 - FOOT * SCALE) + 'px';    // patinhas encostam no fio
    dog.appendChild(view);
    track.appendChild(dog);
    const vctx = view.getContext('2d');
    vctx.imageSmoothingEnabled = false;

    let x = 0, dir = -1, state = 'idle', until = 0, fi = 0, frameT = 0, t = 0;
    let hop = 0, running = false, raf = 0, last = 0, petCount = 0, printX = 0, printSide = 0;
    let blinkAt = 0, blinkUntil = 0;

    const maxX = () => Math.max(0, track.clientWidth - FW);

    function setState(s, now) {
      state = s;
      if (s === 'walk') { until = now + rand(4000, 9000); if (Math.random() < 0.35) dir *= -1; }
      else until = now + rand(2000, 4500);
    }

    function draw() {
      const now = performance.now();
      if (canBlink && !reduce && now > blinkAt) { blinkUntil = now + 150; blinkAt = now + rand(2200, 5000); }
      const f = state === 'walk' ? fi % Math.min(WALK, FRAMES) : (canBlink && now < blinkUntil ? BLINK : 0);
      vctx.setTransform(1, 0, 0, 1, 0, 0);
      vctx.clearRect(0, 0, view.width, view.height);
      if (dir < 0) vctx.setTransform(-1, 0, 0, 1, view.width, 0); // o desenho olha para a direita
      vctx.drawImage(sheet, f * SW, 0, SW, SH, 0, 0, view.width, view.height);
      const lift = hop ? Math.sin(hop * Math.PI) * 12 : 0;
      const breathe = state === 'idle' && !hop && !reduce ? (Math.sin(t * 3) > 0.6 ? 1 : 0) : 0;
      dog.style.transform = `translate3d(${Math.round(x)}px, ${-Math.round(lift) + breathe}px, 0)`;
    }

    function paintFx(rows) {
      const c = document.createElement('canvas');
      c.width = rows[0].length * PX; c.height = rows.length * PX;
      const g = c.getContext('2d');
      rows.forEach((row, y) => [...row].forEach((ch, xx) => {
        if (ch === '.') return;
        g.fillStyle = FX_PAL[ch]; g.fillRect(xx * PX, y * PX, PX, PX);
      }));
      return c;
    }

    // pegadinha que some aos poucos atrás dela
    function print() {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('class', 'pet__print');
      svg.setAttribute('aria-hidden', 'true');
      const use = document.createElementNS(ns, 'use');
      use.setAttribute('href', '#paw');
      svg.appendChild(use);
      printSide ^= 1;
      svg.style.left = Math.round(x + FW / 2 - dir * FW * 0.3) + 'px';
      svg.style.transform = `translateY(${printSide ? -3 : 0}px) rotate(${dir > 0 ? 90 : -90}deg)`;
      track.appendChild(svg);
      svg.addEventListener('animationend', () => svg.remove(), { once: true });
    }

    function heart() {
      const c = paintFx(HEART);
      c.className = 'pet__fx';
      c.style.left = Math.round(x + (dir > 0 ? FW - 22 : 8)) + 'px';
      c.style.bottom = (FH + 4) + 'px';
      track.appendChild(c);
      c.addEventListener('animationend', () => c.remove(), { once: true });
    }

    function tick(now) {
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now; t += dt;
      if (!until) setState('idle', now);

      if (state === 'walk') {
        x += dir * SPEED * dt;
        if (x <= 0) { x = 0; dir = 1; }
        if (x >= maxX()) { x = maxX(); dir = -1; }
        if (now - frameT > 1000 / FPS) { fi++; frameT = now; }
        if (Math.abs(x - printX) > 22) { printX = x; print(); }
      }
      if (hop) { hop += dt / 0.4; if (hop >= 1) hop = 0; }
      if (now > until && !hop) setState(state === 'walk' ? 'idle' : 'walk', now);

      draw();
      raf = requestAnimationFrame(tick);
    }

    function start() { if (!running && !reduce) { running = true; last = 0; raf = requestAnimationFrame(tick); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    dog.addEventListener('click', () => {
      const now = performance.now();
      petCount++;
      setState('idle', now);
      until = now + 2400;
      if (!reduce) hop = 0.001;
      heart();
      if (petCount === 1 || petCount % 7 === 0) {
        const tag = document.createElement('span');
        tag.className = 'pet__tag';
        tag.textContent = petCount === 1 ? `${NAME} Maria` : `${NAME} ♥`;
        tag.style.left = Math.round(x + FW / 2) + 'px';
        tag.style.bottom = (FH + 12) + 'px';
        track.appendChild(tag);
        tag.addEventListener('animationend', () => tag.remove(), { once: true });
      }
      draw();
    });

    track.style.height = (FH + 14) + 'px';
    x = printX = Math.round(maxX() * 0.72);
    draw();

    let inView = false;
    const setView = (v) => { inView = v; v ? start() : stop(); };
    const checkView = () => {
      const r = track.getBoundingClientRect();
      const v = r.bottom > -100 && r.top < window.innerHeight + 100;
      if (v !== inView) setView(v);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => setView(e.isIntersecting), { rootMargin: '100px 0px' }).observe(track);
    }
    window.addEventListener('scroll', checkView, { passive: true });
    checkView();
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : inView && start()));
    window.addEventListener('resize', () => { x = Math.min(x, maxX()); draw(); });
  }
})();
