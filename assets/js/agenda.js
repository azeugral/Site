/* Calendário de horários livres ligado ao serviço lrgz-agenda (Cloudflare + Google Agenda).
   Se o serviço não responder, o bloco fica escondido e a ficha segue pelo WhatsApp como antes. */
(() => {
  'use strict';
  const raiz = document.getElementById('agenda');
  if (!raiz) return;
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const api = (local && new URLSearchParams(location.search).get('api')) || raiz.dataset.api;
  const chaveTurnstile = raiz.dataset.turnstile;
  const planoB = document.getElementById('agenda-plano-b');
  const ficha = raiz.closest('form');
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const PET_SITTER = 'Pet sitter';

  const estado = { ativa: false, dias: {}, mes: null, dia: null, hora: null, pedido: 0, token: '', widget: null };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const servicos = () => [...ficha.querySelectorAll('[name="servico"]:checked')].map(i => i.value);
  const soPetSitter = () => { const s = servicos(); return s.length > 0 && s.every(x => x === PET_SITTER); };
  const horaBonita = h => h.replace(':00', 'h').replace(':', 'h');
  const dataBonita = d => { const [a, m, dia] = d.split('-').map(Number); const x = new Date(Date.UTC(a, m - 1, dia)); return `${SEMANA[x.getUTCDay()].toLowerCase()}, ${dia} de ${MESES[m - 1]}`; };

  function mostrar(sim) {
    raiz.hidden = !sim;
    planoB.hidden = sim;
    estado.ativa = sim;
    ficha.dispatchEvent(new CustomEvent('agenda:modo', { detail: { ativa: sim } }));
  }

  function desenhar() {
    raiz.replaceChildren();
    const datas = Object.keys(estado.dias).sort();
    if (!datas.length) {
      raiz.append(el('p', 'agenda-vazia', 'Sem horários livres nas próximas semanas. Envie a ficha pelo WhatsApp que eu encaixo você.'));
      return;
    }
    if (!estado.mes || !datas.some(d => d.startsWith(estado.mes))) estado.mes = datas[0].slice(0, 7);
    const meses = [...new Set(datas.map(d => d.slice(0, 7)))];
    const i = meses.indexOf(estado.mes);
    const [ano, mes] = estado.mes.split('-').map(Number);

    const topo = el('div', 'agenda-topo');
    const seta = (rot, alvo, txt) => {
      const b = el('button', 'agenda-seta', txt); b.type = 'button'; b.setAttribute('aria-label', rot);
      b.disabled = !alvo; b.addEventListener('click', () => { estado.mes = alvo; desenhar(); });
      return b;
    };
    topo.append(seta('Mês anterior', meses[i - 1], '‹'), el('strong', '', `${MESES[mes - 1]} ${ano}`), seta('Próximo mês', meses[i + 1], '›'));

    const grade = el('div', 'agenda-grade');
    SEMANA.forEach(s => grade.append(el('span', 'agenda-sem', s)));
    const primeiro = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
    for (let n = 0; n < primeiro; n++) grade.append(el('span'));
    const total = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    for (let d = 1; d <= total; d++) {
      const data = `${estado.mes}-${String(d).padStart(2, '0')}`;
      const b = el('button', 'agenda-dia', d); b.type = 'button';
      if (estado.dias[data]) {
        b.setAttribute('aria-label', dataBonita(data));
        b.setAttribute('aria-pressed', String(data === estado.dia));
        b.addEventListener('click', () => { estado.dia = data; estado.hora = null; desenhar(); limparErro(); raiz.querySelector('.agenda-horas').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
      } else b.disabled = true;
      grade.append(b);
    }
    const cal = el('div', 'agenda-cal');
    cal.append(topo, grade);
    raiz.append(cal);

    const horas = el('div', 'agenda-horas');
    raiz.append(horas);
    if (estado.dia && estado.dias[estado.dia]) {
      horas.append(el('p', 'agenda-rotulo', dataBonita(estado.dia)));
      const lista = el('div', 'agenda-lista');
      estado.dias[estado.dia].forEach(h => {
        const b = el('button', 'agenda-hora', horaBonita(h)); b.type = 'button';
        b.setAttribute('aria-pressed', String(h === estado.hora));
        b.addEventListener('click', () => { estado.hora = h; desenhar(); limparErro(); });
        lista.append(b);
      });
      horas.append(lista);
    } else horas.append(el('p', 'agenda-dica', 'Escolha um dia para ver os horários.'));
  }

  const limparErro = () => { raiz.closest('.campo')?.classList.remove('erro'); ficha.querySelector('.ficha-aviso').hidden = true; };

  async function buscar() {
    if (!api) return mostrar(false);
    if (soPetSitter()) return mostrar(false);
    const pedido = ++estado.pedido;
    const q = new URLSearchParams();
    servicos().filter(s => s !== PET_SITTER).forEach(s => q.append('servico', s));
    try {
      const r = await fetch(`${api}/horarios?${q}`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      if (pedido !== estado.pedido) return;
      estado.dias = j.dias || {};
      if (estado.dia && !(estado.dias[estado.dia] || []).includes(estado.hora)) estado.hora = null;
      if (estado.dia && !estado.dias[estado.dia]) estado.dia = null;
      mostrar(true);
      desenhar();
    } catch {
      if (pedido === estado.pedido) mostrar(false);
    }
  }

  function carregarTurnstile() {
    if (!chaveTurnstile || estado.widget !== null || document.getElementById('cf-turnstile-js')) return;
    window.agendaTurnstile = () => {
      estado.widget = window.turnstile.render('#agenda-verificacao', {
        sitekey: chaveTurnstile, appearance: 'interaction-only', theme: 'light', language: 'pt-br',
        callback: t => { estado.token = t; },
        'expired-callback': () => { estado.token = ''; },
        'error-callback': () => { estado.token = ''; }
      });
    };
    const s = document.createElement('script');
    s.id = 'cf-turnstile-js';
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=agendaTurnstile&render=explicit';
    s.async = true;
    document.head.append(s);
  }

  async function esperarToken() {
    if (!chaveTurnstile) return '';
    for (let n = 0; n < 40 && !estado.token; n++) await new Promise(r => setTimeout(r, 200));
    return estado.token;
  }

  /* devolve 'ok', 'ocupado' ou 'falhou' */
  async function reservar(dados) {
    try {
      const turnstile = await esperarToken();
      const r = await fetch(`${api}/agendar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...dados, data: estado.dia, hora: estado.hora, turnstile }),
        signal: AbortSignal.timeout(15000)
      });
      if (window.turnstile && estado.widget !== null) { estado.token = ''; window.turnstile.reset(estado.widget); }
      if (r.status === 201) return 'ok';
      if (r.status === 409) { estado.hora = null; await buscar(); return 'ocupado'; }
      return 'falhou';
    } catch { return 'falhou'; }
  }

  window.agendaFicha = {
    get ativa() { return estado.ativa; },
    get escolha() { return estado.dia && estado.hora ? { data: estado.dia, hora: estado.hora, texto: `${dataBonita(estado.dia)}, às ${horaBonita(estado.hora)}` } : null; },
    reservar,
    preparar: carregarTurnstile
  };

  let espera;
  ficha.addEventListener('change', e => {
    if (e.target.name !== 'servico') return;
    clearTimeout(espera);
    espera = setTimeout(buscar, 250);
  });
  buscar();
})();
