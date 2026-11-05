/* Dra. Juliana Cubas · topo, menu, entradas ao rolar, frase que acende, dúvidas e patinhas */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* todo botão de WhatsApp abre com a ficha de atendimento pronta para preencher */
  const MSG = [
    'Olá, Dra. Juliana! Vim pelo site e quero agendar um atendimento.',
    '',
    '*Tutor(a):* ',
    '*Cidade e bairro:* ',
    '',
    '*Nome do pet:* ',
    '*Cão ou gato:* ',
    '*Raça:* ',
    '*Idade:* ',
    '*Porte ou peso aproximado:* ',
    '',
    '*Serviço:* (consulta, vacina, exames, medicação, curativo, acompanhamento ou pet sitter)',
    '*O que está acontecendo:* ',
    '*Melhor dia e horário:* '
  ].join('\n');
  $$('[data-wpp]').forEach(a => { a.href = 'https://wa.me/5515996893103?text=' + encodeURIComponent(MSG); });

  /* ficha de atendimento: confere os obrigatórios, monta a mensagem organizada e abre o WhatsApp */
  const ficha = $('#ficha');
  if (ficha) {
    const f = ficha.elements;
    const aviso = $('.ficha-aviso', ficha);
    const sitter = $('#campo-sitter');
    const val = n => { const e = f[n]; return (e && 'value' in e ? e.value : '').trim(); };
    const marcados = n => $$(`[name="${n}"]:checked`, ficha).map(i => i.value);
    const campoDe = n => $(`[name="${n}"]`, ficha).closest('.campo');
    const servAtualiza = () => { sitter.hidden = !marcados('servico').includes('Pet sitter'); };
    ficha.addEventListener('change', e => {
      if (e.target.name === 'servico') servAtualiza();
      const c = e.target.closest('.campo'); if (c) c.classList.remove('erro');
    });
    ficha.addEventListener('input', e => { const c = e.target.closest('.campo'); if (c) c.classList.remove('erro'); });
    servAtualiza();

    /* com a agenda ligada o botão reserva o horário; sem ela, segue direto para o WhatsApp */
    const rotuloAgenda = $('[data-rotulo-agenda]');
    const textoEnviar = $('#ficha-enviar');
    const agenda = () => window.agendaFicha && window.agendaFicha.ativa ? window.agendaFicha : null;
    ficha.addEventListener('agenda:modo', e => {
      rotuloAgenda.hidden = !e.detail.ativa;
      textoEnviar.textContent = e.detail.ativa ? 'Reservar horário' : 'Enviar pelo WhatsApp';
    });

    /* ficha em 3 etapas: atendimento, horário e dados */
    const etapas = $$('[data-etapa]', ficha);
    const atalhos = $$('[data-ir]', ficha);
    const voltar = $('#ficha-voltar');
    const seguir = $('#ficha-seguir');
    const reservar = $('#ficha-botao');
    const resumo = $('#ficha-resumo');
    let atual = 1, alcancada = 1;

    const faltamEm = n => {
      const faltam = [];
      if (n === 1 && !marcados('servico').length) faltam.push(['servico', 'o serviço']);
      if (n === 2) { const ag = agenda(); if (ag && !ag.escolha) faltam.push(['__agenda', 'o dia e o horário']); }
      if (n === 3) {
        [['tutor', 'seu nome'], ['telefone', 'o WhatsApp'], ['cidade', 'a cidade'], ['pet', 'o nome do pet']].forEach(([c, t]) => { if (!val(c)) faltam.push([c, t]); });
        if (val('telefone') && !/^\d{10,11}$/.test(val('telefone').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''))) faltam.push(['telefone', 'o WhatsApp com DDD']);
        if (!marcados('especie').length) faltam.push(['especie', 'se é cão ou gato']);
      }
      return faltam;
    };

    const conferir = n => {
      const faltam = faltamEm(n);
      $$('.campo.erro', ficha).forEach(c => c.classList.remove('erro'));
      if (!faltam.length) { aviso.hidden = true; return true; }
      const alvo = c => c === '__agenda' ? $('#agenda') : $(`[name="${c}"]`, ficha);
      faltam.forEach(([c]) => alvo(c).closest('.campo').classList.add('erro'));
      aviso.textContent = 'Falta preencher ' + faltam.map(x => x[1]).join(', ').replace(/, ([^,]*)$/, ' e $1') + '.';
      aviso.hidden = false;
      alvo(faltam[0][0]).focus({ preventScroll: true });
      return false;
    };

    const ir = (n, rolar = true) => {
      atual = n; alcancada = Math.max(alcancada, n);
      etapas.forEach(b => { b.hidden = Number(b.dataset.etapa) !== n; });
      atalhos.forEach(b => {
        const i = Number(b.dataset.ir);
        b.disabled = i > alcancada;
        b.classList.toggle('feita', i < n);
        if (i === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      voltar.hidden = n === 1;
      seguir.hidden = n === 3;
      reservar.hidden = n !== 3;
      aviso.hidden = true;
      const ag = agenda();
      const partes = n > 1 ? [marcados('servico').join(', ')] : [];
      if (n === 3 && ag && ag.escolha) partes.push(ag.escolha.texto);
      if (n === 3 && ag) ag.preparar();
      resumo.textContent = partes.filter(Boolean).join(' · ');
      resumo.hidden = !resumo.textContent;
      if (rolar) ficha.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' });
    };

    ficha.classList.add('em-etapas');
    $('#etapas').hidden = false;
    atalhos.forEach(b => b.addEventListener('click', () => ir(Number(b.dataset.ir))));
    voltar.addEventListener('click', () => ir(atual - 1));
    seguir.addEventListener('click', () => { if (conferir(atual)) ir(atual + 1); });
    ir(1, false);

    ficha.addEventListener('submit', async e => {
      e.preventDefault();
      if (ficha.dataset.enviando) return;
      /* Enter antes da última etapa só avança */
      if (atual < 3) { if (conferir(atual)) ir(atual + 1); return; }
      const incompleta = [1, 2, 3].find(n => faltamEm(n).length);
      if (incompleta) { if (incompleta !== atual) ir(incompleta); conferir(incompleta); return; }
      aviso.hidden = true;
      const ag = agenda();
      const linha = (rot, v) => v ? `*${rot}:* ${v}` : null;
      const peso = val('peso') ? val('peso').replace(/\s*kg$/i, '') + ' kg' : '';
      const cidade = [val('cidade'), val('bairro')].filter(Boolean).join(' · ');
      if (f.site.value) return;
      const sitterTxt = sitter.hidden ? '' : `Pet sitter${val('sitter') ? ': ' + val('sitter') : ''}`;
      let horario = null, reservado = false;
      if (ag) {
        const botao = $('button[type=submit]', ficha);
        ficha.dataset.enviando = '1'; botao.disabled = true; textoEnviar.textContent = 'Reservando...';
        horario = ag.escolha;
        const r = await ag.reservar({
          servicos: marcados('servico'), tutor: val('tutor'), telefone: val('telefone'), cidade: val('cidade'), bairro: val('bairro'),
          pet: val('pet'), especie: marcados('especie')[0], raca: val('raca'), idade: val('idade'),
          porte: marcados('porte')[0] || '', peso, vacinas: marcados('vacinas')[0] || '',
          relato: [val('relato'), sitterTxt].filter(Boolean).join('\n')
        });
        delete ficha.dataset.enviando; botao.disabled = false; textoEnviar.textContent = 'Reservar horário';
        if (r === 'ocupado') {
          ir(2);
          aviso.textContent = 'Esse horário acabou de ser reservado. Escolha outro, por favor.';
          aviso.hidden = false;
          return;
        }
        reservado = r === 'ok';
      }
      const partes = [
        'Olá, Dra. Juliana! Vim pelo site e quero agendar um atendimento.',
        '', '*TUTOR*', linha('Nome', val('tutor')), linha('WhatsApp', val('telefone')), linha('Cidade', cidade),
        '', '*PET*', linha('Nome', val('pet')), linha('Espécie', marcados('especie')[0]), linha('Raça', val('raca')),
        linha('Idade', val('idade')), linha('Porte', marcados('porte')[0]), linha('Peso', peso), linha('Vacinas em dia', marcados('vacinas')[0]),
        '', '*ATENDIMENTO*', linha('Serviço', marcados('servico').join(', ')),
        sitter.hidden ? null : linha('Datas do pet sitter', val('sitter')),
        linha('O que está acontecendo', val('relato')), 
        horario ? linha(reservado ? 'Horário pré-reservado' : 'Horário desejado', horario.texto) : linha('Melhor período', marcados('periodo')[0]),
        horario ? null : linha('Dia de preferência', val('dia'))
      ].filter(x => x !== null);
      const url = 'https://wa.me/5515996893103?text=' + encodeURIComponent(partes.join('\n'));
      if (ag) {
        /* depois de esperar a rede o navegador barra pop-up: o toque final fica num botão de verdade */
        const feita = $('#ficha-feita');
        $('.chapeu', feita).textContent = reservado ? 'Horário pré-reservado' : 'Não consegui reservar agora';
        $('#feita-horario').textContent = horario.texto;
        $('.feita-texto', feita).textContent = reservado
          ? 'Falta só um passo: envie a ficha no WhatsApp para eu confirmar a visita.'
          : 'Envie a ficha pelo WhatsApp com esse horário e eu vejo a disponibilidade com você.';
        $('#feita-wpp').href = url;
        ficha.hidden = true; feita.hidden = false;
        feita.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'center' });
        feita.focus({ preventScroll: true });
        return;
      }
      const w = window.open(url, '_blank');   // com 'noopener' o retorno é sempre null
      if (w) w.opener = null; else location.href = url;
    });
  }

  /* entrada do topo: espera a foto para não piscar */
  const hero = $('.hero');
  const foto = $('.hero-foto img');
  const entra = () => setTimeout(() => hero.classList.add('entrou'), 30);
  if (foto && !foto.complete) { foto.addEventListener('load', entra, { once: true }); foto.addEventListener('error', entra, { once: true }); setTimeout(entra, 1600); }
  else entra();

  /* cabeçalho: fundo ao rolar, some ao descer e volta ao subir; barra de agendar no celular */
  const topo = $('#topo');
  const barra = $('#barraCta');
  const gaveta = $('#gaveta');
  let ultY = scrollY;
  const aoRolar = () => {
    const y = scrollY;
    topo.classList.toggle('solido', y > 30);
    const aberta = gaveta && !gaveta.hidden;
    if (!aberta && y > innerHeight * .8 && y > ultY + 4) topo.classList.add('some');
    else if (y < ultY - 4 || y < 80) topo.classList.remove('some');
    if (barra) {
      const fim = $('#agendar').getBoundingClientRect().top < innerHeight * .9;
      barra.classList.toggle('mostra', y > innerHeight * .7 && !fim && !aberta);
    }
    ultY = y;
  };
  addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();

  /* menu do celular */
  const menuBtn = $('.menu-btn');
  const gavetaAbrir = abrir => {
    menuBtn.setAttribute('aria-expanded', abrir);
    menuBtn.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
    document.documentElement.style.overflow = abrir ? 'hidden' : '';
    if (abrir) { gaveta.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => gaveta.classList.add('aberta'))); topo.classList.remove('some'); }
    else { gaveta.classList.remove('aberta'); setTimeout(() => { if (!gaveta.classList.contains('aberta')) gaveta.hidden = true; }, 400); }
    aoRolar();
  };
  menuBtn.addEventListener('click', () => gavetaAbrir(menuBtn.getAttribute('aria-expanded') !== 'true'));
  $$('a', gaveta).forEach(a => a.addEventListener('click', () => gavetaAbrir(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !gaveta.hidden) gavetaAbrir(false); });
  addEventListener('resize', () => { if (innerWidth > 1100 && !gaveta.hidden) gavetaAbrir(false); });

  /* cascata: irmãos da mesma grade entram com atraso crescente */
  $$('.serv-grade, .passos, .galeria, .relatos').forEach(g => {
    const cols = getComputedStyle(g).gridTemplateColumns.split(' ').length || 1;
    [...g.children].forEach((el, i) => el.style.setProperty('--d', ((i % cols) * .12) + 's'));
  });

  /* entradas ao rolar */
  const io = 'IntersectionObserver' in window && !reduz
    ? new IntersectionObserver(ents => ents.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 })
    : null;
  const observar = el => io ? io.observe(el) : el.classList.add('visto');
  $$('.revela').forEach(observar);

  /* manifesto: as palavras acendem conforme a frase sobe na tela */
  const man = $('[data-palavras]');
  if (man) {
    const destaque = ['calmo', 'conhece'];
    man.innerHTML = man.textContent.trim().split(/\s+/).map(w => `<span class="p${destaque.some(d => w.startsWith(d)) ? ' v' : ''}">${w}</span>`).join(' ');
    const ps = $$('.p', man);
    if (reduz) ps.forEach(p => p.classList.add('on'));
    else {
      const acende = () => {
        const r = man.getBoundingClientRect();
        const k = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (innerHeight * .55 + r.height * .5)));
        const n = Math.round(k * ps.length);
        ps.forEach((p, i) => p.classList.toggle('on', i < n));
      };
      addEventListener('scroll', acende, { passive: true });
      acende();
    }
  }

  /* dúvidas: abre uma por vez, altura animada pelo grid */
  const itens = $$('.faq-item');
  itens.forEach(item => {
    const b = $('button', item);
    b.addEventListener('click', () => {
      const abrir = !item.classList.contains('aberto');
      itens.forEach(o => { o.classList.remove('aberto'); $('button', o).setAttribute('aria-expanded', 'false'); });
      item.classList.toggle('aberto', abrir);
      b.setAttribute('aria-expanded', abrir);
    });
  });

  /* patinhas ao fundo: grade com sorteio fixo, duas camadas que andam em velocidades diferentes */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const pata = linha => {
    const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('class', 'paw');
    const u = document.createElementNS(SVGNS, 'use'); u.setAttribute('href', linha ? '#paw-line' : '#paw');
    s.appendChild(u); return s;
  };
  const semente = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const CAMADAS = [
    { prof: 14, fica: .45, smin: 13, smax: 20, omin: .08, omax: .12, linha: .2 },
    { prof: 40, fica: .32, smin: 22, smax: 38, omin: .1, omax: .16, linha: .4 }
  ];
  const trilhas = $$('.paw-trail');
  let largura = 0;
  const montaPatas = () => {
    largura = innerWidth;
    const cel = largura < 600;
    trilhas.forEach((t, ti) => {
      t.textContent = '';
      const sec = t.parentNode, w = sec.offsetWidth, h = sec.offsetHeight + 120;
      CAMADAS.forEach((L, li) => {
        const rnd = semente(ti * 7919 + li * 104729 + (cel ? 3 : 0));
        const lado = (li ? 180 : 130) * (cel ? .75 : 1);
        const camada = document.createElement('div');
        camada.className = 'paw-layer'; camada.dataset.prof = L.prof;
        for (let r = 0; r < Math.ceil(h / lado); r++) for (let c = 0; c < Math.ceil(w / lado); c++) {
          if (rnd() > L.fica) continue;
          const linha = rnd() < L.linha, p = pata(linha);
          const sz = (L.smin + Math.pow(rnd(), 1.6) * (L.smax - L.smin)) * (cel ? .82 : 1);
          p.style.left = ((c + .12 + rnd() * .76) * lado / w * 100).toFixed(2) + '%';
          p.style.top = ((r + .12 + rnd() * .76) * lado / h * 100).toFixed(2) + '%';
          p.style.setProperty('--s', sz.toFixed(1) + 'px');
          p.style.setProperty('--r', Math.round(rnd() * 360 - 180) + 'deg');
          p.style.setProperty('--o', ((L.omin + rnd() * (L.omax - L.omin)) * (linha ? 1.3 : 1)).toFixed(3));
          p.style.setProperty('--dl', (rnd() * 1.1).toFixed(2) + 's');
          camada.appendChild(p);
        }
        t.appendChild(camada);
      });
    });
  };
  montaPatas();
  if ('IntersectionObserver' in window) {
    const pio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visto'); pio.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
    trilhas.forEach(t => pio.observe(t));
  } else trilhas.forEach(t => t.classList.add('visto'));

  /* paralaxe leve: patinhas e foto do Sobre (um quadro por rolagem) */
  const fotoSobre = $('.sobre-foto img');
  let pedido = false;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const paralaxe = () => {
    pedido = false;
    if (reduz) return;
    const vh = innerHeight;
    trilhas.forEach(t => {
      const r = t.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const c = clamp((r.top + r.height / 2 - vh / 2) / vh, -1.3, 1.3);
      [...t.children].forEach(l => { l.style.transform = `translate3d(0,${(c * l.dataset.prof).toFixed(1)}px,0)`; });
    });
    if (fotoSobre) {
      const r = fotoSobre.parentNode.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const c = clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1);
        fotoSobre.style.transform = `translate3d(0,${(c * 24).toFixed(1)}px,0) scale(1.12)`;
      }
    }
  };
  const pedir = () => { if (!pedido) { pedido = true; requestAnimationFrame(paralaxe); } };
  addEventListener('scroll', pedir, { passive: true });
  let tm;
  addEventListener('resize', () => {
    pedir();
    if (Math.abs(innerWidth - largura) < 40) return;   // ignora a barra do navegador do celular
    clearTimeout(tm); tm = setTimeout(() => { montaPatas(); pedir(); }, 250);
  });
  paralaxe();
})();
