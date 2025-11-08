// membros.js
// Script principal da área de membros — integra com o SuperDietEngine
// Usa SuperDietEngine.calculateEquivalentPortion para trocar alimentos
// Carregar este arquivo como <script type="module" src="membros.js"></script>

import SuperDietEngine from './diet-engine.js';

(async function(){
  // --- Config / estado local ---
  let planPayload = null; // plano atual em memória (gerado ou carregado)
  let profile = {
    peso: 75,
    altura: 1.75,
    idade: 30,
    sexo: 'M',
    disponibilidade: 4,
    nivel: 'intermediario',
    uso_suplemento: 'nao',
    orcamento_mes_R$: 400,
    grande_meta: 'manter composição e hipertrofia leve'
  };

  // Inicializa engine (não fornecemos supabase por padrão)
  try {
    SuperDietEngine.init({ supabase: null });
  } catch(e){
    // ignora: init é opcional aqui (use generatePlan local)
  }

  // --- Helpers DOM ---
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if(k === 'class') node.className = v;
      else if(k === 'html') node.innerHTML = v;
      else if(k.startsWith('data-')) node.setAttribute(k, v);
      else if(k === 'on') {
        Object.entries(v).forEach(([ev,fn]) => node.addEventListener(ev, fn));
      } else node.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c=>{
      if(c == null) return;
      if(typeof c === 'string') node.appendChild(document.createTextNode(c));
      else node.appendChild(c);
    });
    return node;
  }

  // --- UI Elements from HTML ---
  const menuToggleBtn = $('#menu-toggle');
  const sidebar = $('#sidebar');
  const overlay = $('#overlay');
  const welcomeMsg = $('#welcome-msg');
  const dietaCardContent = $('#dieta-card-content');

  // Sidebar toggle
  if(menuToggleBtn){
    menuToggleBtn.addEventListener('click', ()=>{
      menuToggleBtn.classList.toggle('open');
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show');
    });
    overlay.addEventListener('click', ()=>{
      menuToggleBtn.classList.remove('open');
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }

  // --- Plan load/generate ---
  async function loadPlanOrGenerate(){
    // tenta carregar último plano via engine (se init com supabase existiu)
    try {
      const latest = await SuperDietEngine.loadLatestPlan?.();
      if(latest && latest.payload){
        planPayload = latest.payload;
        return planPayload;
      }
    } catch(e){ /* ignore */ }

    // fallback: gerar plano com perfil de exemplo
    try {
      const payload = await SuperDietEngine.generatePlan(profile, { months: 1 });
      planPayload = payload;
      return payload;
    } catch(e){
      console.error('Erro gerando plano localmente:', e);
      // cria um plano mínimo manual se engine falhar
      planPayload = {
        version: 'fallback',
        created_at: new Date().toISOString(),
        profile_snapshot: profile,
        targets: { targetCalories: 2200, protein_g: 150, carbs_g: 250, fat_g: 60, tdee: 2500, bmr: 1700 },
        timeline_weeks: [{
          weekIndex: 1,
          weekStartISO: new Date().toISOString().slice(0,10),
          days: [{
            dayIndex: 1, dayOfWeekIndex: 1, baseCalories: 2200, isTrainingDay: true, isCheatDay: false,
            meals: [
              { mealIndex: 0, mealName: 'Café da manhã', mealCaloriesTarget: 400, components: [{ food: 'Pão integral', grams: 60, role:'carbo', source_id:'pao_integral_forma', kcal: Math.round(250*60/30) }, { food: 'Ovo cozido', grams:50, role:'proteina', source_id:'ovo_cozido', kcal: Math.round(155*50/100) }] },
              { mealIndex: 1, mealName: 'Almoço', mealCaloriesTarget: 800, components: [{ food:'Frango, Peito', grams:125, role:'proteina', source_id:'frango_peito', kcal: Math.round(165*125/100) }, { food:'Arroz', grams:100, role:'carbo', source_id:'arroz_branco_cozido', kcal: Math.round(130*100/50) }] }
            ]
          }]
        }]
      };
      return planPayload;
    }
  }

  // --- Render plan to DOM (simplificado) ---
  function renderPlanCard(){
    if(!dietaCardContent) return;
    dietaCardContent.innerHTML = '';
    if(!planPayload){
      dietaCardContent.appendChild(el('p', { style: 'color:#bbb' }, 'Nenhum plano carregado.'));
      return;
    }

    // Mostrar resumo targets
    const t = planPayload.targets || planPayload.estimates || {};
    const header = el('div', { class: 'plan-header' }, [
      el('p', { style:'margin:0 0 8px 0;color:#ddd;font-weight:700' }, `Calorias alvo: ${t.targetCalories || t.dailyTargetCalories || '-'} kCal`),
      el('p', { style:'margin:0 0 12px 0;color:#bbb;font-size:0.95em' }, `Proteína: ${t.protein_g || '-'} g — Carbs: ${t.carbs_g || t.carbs || '-'} g — Gordura: ${t.fat_g || '-'} g`)
    ]);
    dietaCardContent.appendChild(header);

    // Render primeira semana / dia por simplicidade
    const week = planPayload.timeline_weeks && planPayload.timeline_weeks[0];
    if(!week) {
      dietaCardContent.appendChild(el('p', { style:'color:#bbb' }, 'Plano sem timeline.'));
      return;
    }

    const dayList = el('div', { class: 'plan-days-list' });
    week.days.forEach(day => {
      const dayCard = el('div', { class: 'percurso-card', style: 'margin-bottom:12px;padding:14px;' }, [
        el('h4', {}, `Dia ${day.dayIndex} — ${day.isTrainingDay ? 'Treino' : 'Descanso'}`),
      ]);

      day.meals.forEach(meal => {
        const mealDiv = el('div', { style:'margin-top:10px;padding:10px;border-radius:8px;background:#121212;border:1px solid #222' }, [
          el('strong', {}, meal.mealName + ` — ${meal.mealKcalTotal || 0} kCal`),
          el('div', { style:'margin-top:8px' })
        ]);
        const compsWrap = mealDiv.querySelector('div');

        if(!meal.components || !meal.components.length){
          compsWrap.appendChild(el('p', { style:'color:#bbb' }, 'Sem componentes.'));
        } else {
          meal.components.forEach((comp, idx) => {
            const compRow = el('div', { class: 'meal-row', style:'display:flex;align-items:center;justify-content:space-between;gap:8px' });
            const left = el('div', { class: 'meal-left' }, [
              el('div', { style:'font-weight:700' }, comp.food || comp.source_id || '—'),
              el('div', { style:'font-size:0.9em;color:#bbb' }, `${comp.grams} g — ${comp.kcal || 0} kCal`)
            ]);
            const right = el('div', {}, [
              el('button', { class: 'swap-btn', 'data-source-id': comp.source_id || '', 'data-grams': comp.grams || 0, style:'padding:8px 10px;border-radius:8px;border:1px solid #444;background:transparent;color:#ddd;cursor:pointer' }, 'Trocar')
            ]);
            compRow.appendChild(left);
            compRow.appendChild(right);
            compsWrap.appendChild(compRow);

            // attach event
            compRow.querySelector('.swap-btn').addEventListener('click', (ev)=>{
              const btn = ev.currentTarget;
              const sourceId = btn.getAttribute('data-source-id');
              const grams = parseInt(btn.getAttribute('data-grams') || '0', 10);
              openSwapModal({ dayIndex: day.dayIndex, mealIndex: meal.mealIndex, compIndex: idx, sourceId, grams });
            });
          });
        }

        dayCard.appendChild(mealDiv);
      });

      dayList.appendChild(dayCard);
    });

    dietaCardContent.appendChild(dayList);
  }

  // --- Swap Modal Implementation ---
  let modalEl = null;
  function createSwapModal(){
    if(modalEl) return modalEl;
    modalEl = el('div', { class: 'followup-overlay', style:'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:2100;'}, [
      el('div', { class: 'followup-modal', style:'width:560px;max-width:94%;background:var(--card);padding:18px;border-radius:12px;color:#fff' }, [
        el('h4', { style:'margin-top:0;margin-bottom:8px' }, 'Troca de Alimentos'),
        el('div', { id: 'swap-body' }),
        el('div', { class: 'followup-actions', style:'margin-top:12px;display:flex;justify-content:space-between;gap:8px' }, [
          el('div', { id: 'swap-feedback', style:'align-self:center;color:#bbb;font-size:0.9em' }, ''),
          el('div', {}, [
            el('button', { id:'swap-cancel', style:'padding:8px 12px;border-radius:8px;border:1px solid #444;background:transparent;color:#ddd;cursor:pointer' }, 'Cancelar'),
            el('button', { id:'swap-doit', style:'padding:8px 12px;border-radius:8px;border:none;background:linear-gradient(90deg,var(--journey-red-1),var(--journey-red-2));color:#fff;margin-left:8px;cursor:pointer' }, 'Confirmar Troca')
          ])
        ])
      ])
    ]);
    document.body.appendChild(modalEl);
    modalEl.addEventListener('click', (e)=>{
      if(e.target === modalEl) closeSwapModal();
    });
    $('#swap-cancel', modalEl).addEventListener('click', closeSwapModal);
    $('#swap-doit', modalEl).addEventListener('click', onConfirmSwap);
    return modalEl;
  }

  let swapContext = null; // { dayIndex, mealIndex, compIndex, sourceId, grams }

  function openSwapModal(ctx){
    swapContext = ctx;
    createSwapModal();
    const body = $('#swap-body', modalEl);
    body.innerHTML = '';

    const oldRec = SuperDietEngine.findFood(ctx.sourceId) || { id: ctx.sourceId, name: ctx.sourceId, portion: { grams: ctx.grams } };
    const oldGrams = _safeInt(ctx.grams, 0);

    body.appendChild(el('p', { style:'margin:0 0 8px 0;color:#bbb' }, `Alimento atual: ${oldRec.name || oldRec.id}`));
    body.appendChild(el('p', { style:'margin:0 0 12px 0;color:#bbb;font-size:0.9em' }, `Quantidade atual: ${oldGrams} g`));

    const cat = SuperDietEngine.getFoodCategory(ctx.sourceId) || (oldRec.category || null);
    if(!cat){
      body.appendChild(el('p', { style:'color:#f88' }, 'Não foi possível determinar a categoria deste alimento.'));
      $('#swap-doit', modalEl).setAttribute('disabled', 'true');
    } else {
      // build select list of candidates (same category)
      const candidates = SuperDietEngine.getFoodsByCategory(cat) || [];
      const select = el('select', { id:'swap-select', style:'width:100%;padding:10px;border-radius:8px;background:#222;border:1px solid #333;color:#fff' });
      select.appendChild(el('option', { value:'' }, '-- Escolha um substituto --'));
      candidates.forEach(c => {
        // avoid same id
        if(c.id === ctx.sourceId) return;
        const text = `${c.name} — porção padrão: ${c.portion?.grams || '-'} g — kcal/100g: ${c.nutrition?.kcal || '-'}`;
        select.appendChild(el('option', { value: c.id }, text));
      });
      body.appendChild(el('label', { style:'display:block;margin-top:8px;color:#bbb' }, 'Trocar por:'));
      body.appendChild(select);

      // preview area
      const preview = el('div', { id:'swap-preview', style:'margin-top:10px;color:#ddd' }, '');
      body.appendChild(preview);

      select.addEventListener('change', ()=>{
        const newId = select.value;
        if(!newId){
          preview.innerHTML = '';
          return;
        }
        const newRec = SuperDietEngine.findFood(newId);
        // Use calculateEquivalentPortion
        const eq = SuperDietEngine.calculateEquivalentPortion(oldRec, newRec, oldGrams);
        const finalNewGrams = eq.grams;
        const finalNewKcal = eq.kcal;
        preview.innerHTML = `
          <div style="margin-bottom:6px;color:#bbb">Selecionado: <strong>${newRec.name}</strong></div>
          <div style="font-size:0.95em;color:#ddd">Quantidade sugerida: <strong>${finalNewGrams} g</strong> — Est. ${finalNewKcal} kCal</div>
          <div style="font-size:0.85em;color:#aaa;margin-top:6px">Score de similaridade: ${typeof eq.score === 'number' ? eq.score.toFixed(3) : '—'}</div>
        `;
        $('#swap-feedback', modalEl).textContent = '';
      });
    }

    // show modal
    modalEl.style.display = 'flex';
  }

  function closeSwapModal(){
    if(!modalEl) return;
    modalEl.style.display = 'none';
    const sel = $('#swap-select', modalEl);
    if(sel) sel.value = '';
    swapContext = null;
  }

  async function onConfirmSwap(){
    if(!swapContext) return;
    const sel = $('#swap-select', modalEl);
    if(!sel || !sel.value) {
      $('#swap-feedback', modalEl).textContent = 'Escolha um substituto antes de confirmar.';
      return;
    }
    const newId = sel.value;
    const newRec = SuperDietEngine.findFood(newId);
    const oldRec = SuperDietEngine.findFood(swapContext.sourceId) || { id: swapContext.sourceId, name: swapContext.sourceId };
    const oldGrams = _safeInt(swapContext.grams, 0);
    const eq = SuperDietEngine.calculateEquivalentPortion(oldRec, newRec, oldGrams);
    const finalNewGrams = eq.grams;
    const finalNewKcal = eq.kcal;

    // apply swap in planPayload (mutate)
    try {
      const week = planPayload.timeline_weeks && planPayload.timeline_weeks[0];
      if(!week) throw new Error('Plano sem timeline para aplicar troca.');
      const day = week.days.find(d => d.dayIndex === swapContext.dayIndex);
      if(!day) throw new Error('Dia não encontrado no plano.');
      const meal = day.meals.find(m => m.mealIndex === swapContext.mealIndex);
      if(!meal) throw new Error('Refeição não encontrada no plano.');
      const comp = meal.components[swapContext.compIndex];
      if(!comp) throw new Error('Componente não encontrado no plano.');

      // update component fields
      comp.source_id = newId;
      comp.food = newRec.name || newId;
      comp.grams = finalNewGrams;
      comp.kcal = finalNewKcal;

      // recalc mealKcalTotal (simple sum)
      meal.mealKcalTotal = meal.components.reduce((s,c)=> s + (_safeNum(c.kcal,0)), 0);

      // re-render card
      renderPlanCard();
      closeSwapModal();
    } catch(err){
      console.error('Erro aplicando troca:', err);
      $('#swap-feedback', modalEl).textContent = 'Erro ao aplicar a troca. Veja console.';
    }
  }

  // small helper
  function _safeInt(v, fallback=0){
    const n = parseInt(String(v || ''), 10);
    return isNaN(n) ? fallback : n;
  }

  // expose some debug helpers to window for console usage
  window.SuperDietEngine = SuperDietEngine;
  window.__members_debug = {
    loadPlanOrGenerate,
    renderPlanCard,
    getPlan: () => planPayload
  };

  // initial load
  (async ()=>{
    try {
      welcomeMsg && (welcomeMsg.textContent = 'Bem-vindo — carregando seu percurso...');
      await loadPlanOrGenerate();
      renderPlanCard();
      welcomeMsg && (welcomeMsg.textContent = 'Bem-vindo — plano carregado');
    } catch(e){
      console.error(e);
      welcomeMsg && (welcomeMsg.textContent = 'Erro ao carregar plano');
    }
  })();

})();
