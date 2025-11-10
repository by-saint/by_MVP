/* ===================================================================
   ARQUIVO: membros.js (v4.7)
   - Lida com a renderização do plano, modal de Troca de Alimentos e
     persistência automática no Supabase após a troca.
   - Usa SuperDietEngine.calculateEquivalentPortion quando disponível.
   - Preserva compatibilidade com o restante do seu projeto.
   =================================================================== */

import { supabase, DIFY_APP_TOKEN } from './supabase-client.js';
import SuperDietEngine from './diet-engine.js';

/* ============================
   UTILITÁRIOS
   ============================ */
function _safeNum(v, fallback = 0) {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (v == null || v === '') return fallback;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? fallback : n;
}
function nowISO() { return (new Date()).toISOString(); }
function stripParenthesis(name) { if (!name) return name; return name.replace(/\s*\(.*?\)\s*/g, '').trim(); }
function safeFindFood(key){ try { return SuperDietEngine.findFood(key); } catch(e){ console.warn('findFood error', e); return null; } }

/* DEBUG */
const Debug = {
  enabled: false,
  log(...args){ if (this.enabled) console.log('[membros.js]', ...args); },
  warn(...args){ if (this.enabled) console.warn('[membros.js]', ...args); },
  error(...args){ if (this.enabled) console.error('[membros.js]', ...args); },
};

/* ============================
   RENDER / UI
   ============================ */

function displayProgress(startDate, endDate) {
  try {
    const now = new Date(); now.setHours(0,0,0,0);
    const sDate = new Date(startDate); sDate.setHours(0,0,0,0);
    const eDate = new Date(endDate); eDate.setHours(0,0,0,0);
    const totalDuration = eDate.getTime() - sDate.getTime();
    const elapsedDuration = now.getTime() - sDate.getTime();
    const daysRemaining = Math.ceil((eDate - now) / (1000*60*60*24));
    let progressPercentage = totalDuration > 0 ? (elapsedDuration/totalDuration)*100 : 0;
    progressPercentage = Math.max(0, Math.min(100, progressPercentage));
    const progressBar = document.getElementById('progress-bar');
    const startDateLabel = document.getElementById('start-date-label');
    const endDateLabel = document.getElementById('end-date-label');
    const countdownDays = document.getElementById('countdown-days');
    if (progressBar) progressBar.style.width = `${progressPercentage}%`;
    if (startDateLabel) startDateLabel.textContent = sDate.toLocaleDateString('pt-BR');
    if (endDateLabel) endDateLabel.textContent = eDate.toLocaleDateString('pt-BR');
    if (countdownDays) countdownDays.textContent = daysRemaining >= 0 ? daysRemaining : 0;
  } catch (err) {
    Debug.error('displayProgress failed', err);
  }
}

function renderPlanToContainer(container, planPayload) {
  try {
    container.innerHTML = '';
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const title = document.createElement('h4');
    title.textContent = 'Plano de Dieta — visão geral';

    const meta = document.createElement('div');
    meta.style.color = '#bbb';
    const targetCals = planPayload.targets?.targetCalories || planPayload.estimates?.dailyTargetCalories || '...';
    const tdee = planPayload.targets?.tdee || planPayload.estimates?.tdee || '...';
    meta.innerHTML = `Alvo: <b>${targetCals} kcal</b> <div style="font-size:12px;color:#bbb">TDEE: ${tdee} kcal</div>`;

    header.appendChild(title);
    header.appendChild(meta);
    container.appendChild(header);

    // group weeks by month
    const months = {};
    (planPayload.timeline_weeks || []).forEach(week => {
      const date = new Date((week.weekStartISO || '').toString() + 'T00:00:00Z');
      const monthKey = `${date.getUTCFullYear()}-${('0' + (date.getUTCMonth() + 1)).slice(-2)}`;
      months[monthKey] = months[monthKey] || {
        monthIndex: date.getUTCMonth(),
        label: date.toLocaleString('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' }),
        weeks: []
      };
      months[monthKey].weeks.push(week);
    });

    const monthKeys = Object.keys(months).sort();
    const tabsBar = document.createElement('div');
    tabsBar.className = 'plan-tabs';
    container.appendChild(tabsBar);

    const contentArea = document.createElement('div');
    container.appendChild(contentArea);

    monthKeys.forEach((mk, idx) => {
      const pill = document.createElement('div');
      pill.className = 'plan-tab' + (idx === 0 ? ' active' : '');
      pill.textContent = months[mk].label;
      pill.onclick = () => {
        document.querySelectorAll('.plan-tab.active').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        renderMonth(months[mk], contentArea);
      };
      tabsBar.appendChild(pill);
    });

    if (monthKeys.length) renderMonth(months[monthKeys[0]], contentArea);
    else contentArea.innerHTML = '<p style="color:#bbb">Plano vazio.</p>';
  } catch (err) {
    Debug.error('renderPlanToContainer failed', err);
    container.innerHTML = '<p style="color:#f66">Erro ao renderizar plano. Veja console.</p>';
  }
}

function renderMonth(monthObj, contentArea) {
  contentArea.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.style.marginTop = '12px';

  const days = [];
  monthObj.weeks.forEach(w => {
    (w.days || []).forEach(d => {
      const copy = { ...d };
      copy.weekIndex = w.weekIndex;
      days.push(copy);
    });
  });

  const daysWrap = document.createElement('div');
  daysWrap.className = 'plan-days';

  const dayNameMap = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sab' };

  days.forEach(d => {
    const dayOfWeekIndex = d.dayOfWeekIndex;
    const dayName = dayNameMap[dayOfWeekIndex] !== undefined ? dayNameMap[dayOfWeekIndex] : 'Dia';
    const dayCard = document.createElement('div');
    dayCard.className = 'plan-day';

    const dayTitle = document.createElement('div');
    dayTitle.style.display = 'flex';
    dayTitle.style.justifyContent = 'space-between';
    dayTitle.style.alignItems = 'center';

    const left = document.createElement('div');
    const statusText = d.isTrainingDay ? 'DIA DE TREINO' : 'Dia de Descanso';
    const cheatText = d.isCheatDay ? ' • Cheat' : '';
    left.innerHTML = `<strong>${dayName}</strong><div style="color:${d.isTrainingDay ? 'var(--journey-red-1)' : '#bbb'};font-size:12px;font-weight:700;">${statusText} ${cheatText}</div>`;

    const right = document.createElement('div');
    right.style.textAlign = 'right';
    right.innerHTML = `<div style="font-weight:700">${d.baseCalories} kcal</div>`;

    dayTitle.appendChild(left);
    dayTitle.appendChild(right);
    dayCard.appendChild(dayTitle);

    (d.meals || []).forEach(m => {
      const mealRow = document.createElement('div');
      mealRow.className = 'meal-row';

      const mealLeft = document.createElement('div');
      mealLeft.className = 'meal-left';

      const name = document.createElement('div');
      name.className = 'meal-name';
      name.textContent = m.mealName;

      const listPreview = document.createElement('div');
      listPreview.style.color = '#bbb';
      listPreview.style.fontSize = '13px';

      const details = (m.gramsComputed && !m.gramsComputed.details?._stale) ? (m.gramsComputed.details || {}) : {};

      const items = (m.components || []).map(c => {
        if (c.role === 'proteina' && details.prot_portion_name && typeof details.prot_portions !== 'undefined') {
          return `${c.food} (${details.prot_portions} ${details.prot_portion_name})`;
        }
        if (c.role === 'carbo' && details.carb_portion_name && typeof details.carb_portions !== 'undefined') {
          return `${c.food} (${details.carb_portions} ${details.carb_portion_name})`;
        }
        return `${c.food} (${c.grams}g)`;
      }).join(' • ');

      listPreview.textContent = items;
      mealLeft.appendChild(name);
      mealLeft.appendChild(listPreview);

      const mealRight = document.createElement('div');
      mealRight.style.display = 'flex';
      mealRight.style.flexDirection = 'column';
      mealRight.style.alignItems = 'flex-end';
      const kcal = document.createElement('div');
      kcal.className = 'meal-kcal';
      kcal.textContent = `${m.mealKcalTotal || '—'} kcal`;

      mealRight.appendChild(kcal);

      mealRow.appendChild(mealLeft);
      mealRow.appendChild(mealRight);
      dayCard.appendChild(mealRow);
    });

    daysWrap.appendChild(dayCard);
  });

  wrapper.appendChild(daysWrap);
  contentArea.appendChild(wrapper);
}

/* ============================
   SUPABASE HELPERS
   ============================ */

async function getCurrentUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch (err) {
    Debug.error('getCurrentUser error', err);
    return null;
  }
}

async function fetchLatestUserDiet() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const { data, error } = await supabase.from('user_diets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
    if (error && error.code !== 'PGRST116') console.error('Erro fetchLatestUserDiet:', error);
    return data;
  } catch (err) {
    Debug.error('fetchLatestUserDiet error', err);
    return null;
  }
}

/* ============================
   RENDER / FLUXOS DA PÁGINA
   ============================ */

async function renderPercursoDietArea() {
  const dietaCard = document.getElementById('dieta-card');
  if (!dietaCard) return;

  const targetContainer = document.getElementById('dieta-card-content');
  if (!targetContainer) return;

  targetContainer.innerHTML = '<p style="color:#bbb;">Buscando seu plano de dieta...</p>';

  const latest = await fetchLatestUserDiet();

  if (latest && latest.payload) {
    renderGeneratedPlanEditor(targetContainer, latest.payload, latest.id);
  } else {
    targetContainer.innerHTML = '<p style="color:#bbb;">Você ainda não gerou um plano. Vá à aba "IA Especialista" para criar sua meta.</p>';
  }
}

/* ============================
   RENDER: Editor de Plano Gerado
   ============================ */

function renderGeneratedPlanEditor(container, planPayload, existingId = null) {
  container.innerHTML = '';

  const title = document.createElement('h4');
  title.textContent = 'Plano de Dieta — Plano gerado';
  title.style.marginTop = 0;

  const meta = document.createElement('p');
  meta.style.color = '#bbb';
  meta.style.marginTop = 0;
  const targetCals = planPayload.targets?.targetCalories || '...';
  const tdee = planPayload.targets?.tdee || '...';
  meta.innerHTML = `Meta: ${planPayload.profile_snapshot?.grande_meta || ''} | Alvo: <b>${targetCals} kcal</b> <span style="font-size:11px;color:#bbb">(TDEE: ${tdee} kcal)</span>`;

  container.appendChild(title);
  container.appendChild(meta);

  const planView = document.createElement('div');
  planView.style.marginTop = '12px';
  planView.id = 'plan-view';
  container._lastPlan = planPayload; // guarda o plano atual
  container._planId = existingId || null; // mantém id do registro supabase, se houver
  renderPlanToContainer(planView, planPayload);
  container.appendChild(planView);

  const btnWrap = document.createElement('div');
  btnWrap.style.display = 'flex';
  btnWrap.style.gap = '8px';
  btnWrap.style.marginTop = '12px';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = existingId ? 'Salvar alterações' : 'Salvar formulário';
  saveBtn.className = 'playlist-btn';

  const saveNewBtn = document.createElement('button');
  saveNewBtn.textContent = 'Salvar como novo';
  saveNewBtn.style.background = '#444';
  saveNewBtn.style.color = '#fff';
  saveNewBtn.style.border = 'none';
  saveNewBtn.style.padding = '10px 14px';
  saveNewBtn.style.borderRadius = '8px';

  const statusSpan = document.createElement('span');
  statusSpan.style.color = '#bbb';
  statusSpan.style.marginLeft = '8px';

  btnWrap.appendChild(saveBtn);
  btnWrap.appendChild(saveNewBtn);
  btnWrap.appendChild(statusSpan);
  container.appendChild(btnWrap);

  saveBtn.onclick = async () => {
    statusSpan.textContent = 'Salvando...';
    try {
      const user = await getCurrentUser();
      if (!user) { statusSpan.textContent = 'Usuário não autenticado.'; return; }
      container._lastPlan.modified_at = new Date().toISOString();
      if (existingId) {
        const { error } = await supabase.from('user_diets').update({ payload: container._lastPlan }).eq('id', existingId);
        if (error) { console.error(error); statusSpan.textContent = 'Erro ao atualizar.'; return; }
        statusSpan.textContent = 'Salvo (atualizado).';
      } else {
        const { data: inserted, error } = await supabase.from('user_diets').insert([{ user_id: user.id, payload: container._lastPlan }]).select('id').single();
        if (error) { console.error('save insert', error); statusSpan.textContent = 'Erro ao salvar.'; return; }
        container._planId = inserted?.id || null;
        statusSpan.textContent = 'Salvo com sucesso.';
        await renderPercursoDietArea();
      }
    } catch (err) {
      Debug.error('saveBtn onclick error', err);
      statusSpan.textContent = 'Erro: ' + (err.message || String(err));
    }
  };

  saveNewBtn.onclick = async () => {
    statusSpan.textContent = 'Salvando cópia...';
    try {
      const user = await getCurrentUser();
      if (!user) { statusSpan.textContent = 'Usuário não autenticado.'; return; }
      const { error } = await supabase.from('user_diets').insert([{ user_id: user.id, payload: container._lastPlan }]);
      if (error) { console.error('save copy error', error); statusSpan.textContent = 'Erro ao salvar cópia.'; return; }
      statusSpan.textContent = 'Cópia salva.';
    } catch (err) {
      Debug.error('saveNewBtn error', err);
      statusSpan.textContent = 'Erro: ' + (err.message || String(err));
    }
  };

  // inicializa modal de troca
  initializeFoodSwapModal(planPayload, container, planView);
}

/* ============================
   DIFY IFRAME (mantido)
   ============================ */

function loadFreshDifyChat() {
  try {
    const iframe = document.getElementById('dify-iframe');
    if (!iframe) return;
    const randomSessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const difyUrl = `https://udify.app/chatbot/${DIFY_APP_TOKEN}?user=${randomSessionId}&theme=dark&panel_background_color=%23000000&chat_background_color=%23000000&bot_message_background_color=%231A1A1A&user_message_background_color=%232B2B2B&_=${Date.now()}`;
    iframe.src = difyUrl;
  } catch (err) {
    Debug.error('loadFreshDifyChat error', err);
  }
}

/* ============================
   FOLLOWUP QUESTIONS MODAL (mantido)
   ============================ */

function showFollowupQuestions(questions) {
  return new Promise((resolve) => {
    const root = document.getElementById('followup-root');
    if (!root) { resolve(null); return; }
    root.style.display = 'block';
    root.innerHTML = '';
    const overlay = document.createElement('div');
    overlay.className = 'followup-overlay';
    const modal = document.createElement('div');
    modal.className = 'followup-modal';
    const title = document.createElement('h4');
    title.textContent = 'Precisamos de mais alguns detalhes';
    modal.appendChild(title);

    const fields = [];

    (questions || []).forEach(q => {
      const fldWrap = document.createElement('div');
      fldWrap.className = 'followup-field';
      const lbl = document.createElement('label');
      lbl.style.display = 'block';
      lbl.style.marginBottom = '6px';
      lbl.textContent = q.label;
      fldWrap.appendChild(lbl);
      if (q.type === 'select') {
        const sel = document.createElement('select');
        sel.className = 'followup-select';
        (q.options || []).forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          sel.appendChild(o);
        });
        if (q.placeholder) {
          const ph = document.createElement('option');
          ph.value = '';
          ph.textContent = q.placeholder;
          ph.disabled = true;
          ph.selected = true;
          sel.insertBefore(ph, sel.firstChild);
        }
        fldWrap.appendChild(sel);
        fields.push({ id: q.id, el: sel, type: 'select' });
      } else {
        const inp = document.createElement('input');
        inp.className = 'followup-input';
        inp.type = 'text';
        inp.placeholder = q.placeholder || '';
        fldWrap.appendChild(inp);
        fields.push({ id: q.id, el: inp, type: 'text' });
      }
      modal.appendChild(fldWrap);
    });

    const actions = document.createElement('div');
    actions.className = 'followup-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    const okBtn = document.createElement('button');
    okBtn.textContent = 'Continuar';
    okBtn.style.background = 'linear-gradient(90deg,#007BFF,#0056b3)';
    okBtn.style.color = '#fff';

    cancelBtn.onclick = () => { root.style.display = 'none'; root.innerHTML = ''; resolve(null); };
    okBtn.onclick = () => {
      const answers = {};
      fields.forEach(f => { answers[f.id] = (f.el.value || '').toString(); });
      root.style.display = 'none';
      root.innerHTML = '';
      resolve(answers);
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    root.appendChild(overlay);
  });
}

/* ============================
   SISTEMA DE TROCA DE ALIMENTOS (MODAL)
   - implementa performSwap que usa calculateEquivalentPortion
   - salva automaticamente no supabase ao finalizar a troca
   ============================ */

function initializeFoodSwapModal(planPayload, cardContainer, planView) {
  const openBtn = document.getElementById('open-swap-modal-btn');
  const overlay = document.getElementById('food-swap-modal-overlay');
  const cancelBtn = document.getElementById('swap-cancel-btn');
  const executeBtn = document.getElementById('swap-execute-btn');
  const foodSelect = document.getElementById('swap-food-select');
  const scopeSelect = document.getElementById('swap-scope-select');
  const specificMealGroup = document.getElementById('swap-meal-specific-group');
  const mealSelect = document.getElementById('swap-meal-select');
  const newFoodSelect = document.getElementById('swap-new-food-select');
  const statusDiv = document.getElementById('swap-status');

  if (!openBtn || !overlay || !foodSelect || !newFoodSelect || !executeBtn) {
    Debug.warn('Modal elements missing; disabling swap UI.');
    if (openBtn) openBtn.style.display = 'none';
    return;
  }

  const dayNameMap = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sab' };

  function setStatus(text, tone = 'info') {
    if (!statusDiv) return;
    statusDiv.textContent = text || '';
    statusDiv.style.color = tone === 'error' ? '#ff8b8b' : '#bbb';
  }

  /** Popula o dropdown 'Alimento que quer trocar' */
  function populateFoodsToSwap() {
    try {
      foodSelect.innerHTML = '';
      const foods = new Map();
      const plan = cardContainer._lastPlan || planPayload;
      (plan.timeline_weeks || []).forEach(w => {
        (w.days || []).forEach(d => {
          (d.meals || []).forEach(m => {
            (m.components || []).forEach(c => {
              if (c.source_id && !foods.has(c.source_id) && c.role !== 'suplemento') {
                foods.set(c.source_id, c.food);
              }
            });
          });
        });
      });

      foodSelect.appendChild(new Option('Selecione um alimento...', ''));
      const sortedFoods = [...foods.entries()].sort((a, b) => a[1].localeCompare(b[1]));
      sortedFoods.forEach(([id, name]) => {
        foodSelect.appendChild(new Option(name, id));
      });
    } catch (err) {
      Debug.error('populateFoodsToSwap failed', err);
      foodSelect.innerHTML = '<option>Erro</option>';
    }
  }

  /** Popula substitutos para uma categoria */
  function populateReplacements(foodId) {
    try {
      newFoodSelect.innerHTML = '';
      newFoodSelect.disabled = true;

      if (!foodId) {
        newFoodSelect.appendChild(new Option('Selecione um alimento para trocar', ''));
        return;
      }

      const food = safeFindFood(foodId);
      if (!food || !food.category) {
        newFoodSelect.appendChild(new Option('Categoria não encontrada', ''));
        return;
      }

      const replacements = SuperDietEngine.getFoodsByCategory(food.category) || [];
      if (!replacements || replacements.length === 0) {
        newFoodSelect.appendChild(new Option('Nenhum substituto encontrado', ''));
        return;
      }

      newFoodSelect.appendChild(new Option('Selecione um substituto...', ''));
      replacements.forEach(rep => {
        if (rep && rep.id && rep.id !== foodId) {
          newFoodSelect.appendChild(new Option(stripParenthesis(rep.name || rep.id), rep.id));
        }
      });
      newFoodSelect.disabled = false;
    } catch (err) {
      Debug.error('populateReplacements failed', err);
      newFoodSelect.innerHTML = '<option>Erro</option>';
    }
  }

  /** Popula as ocorrências (refeições onde o alimento aparece) */
  function populateSpecificMeals(foodId) {
    try {
      mealSelect.innerHTML = '';
      if (!foodId) return;
      const plan = cardContainer._lastPlan || planPayload;
      const meals = [];
      (plan.timeline_weeks || []).forEach((w, wi) => {
        (w.days || []).forEach((d, di) => {
          (d.meals || []).forEach((m, mi) => {
            if ((m.components || []).some(c => c.source_id === foodId)) {
              const mealKey = `w${wi}-d${di}-m${mi}`;
              const dayName = dayNameMap[d.dayOfWeekIndex] || 'Dia';
              const label = `Semana ${w.weekIndex} / ${dayName} / ${m.mealName}`;
              meals.push({ key: mealKey, label, wi, di, mi });
            }
          });
        });
      });
      if (meals.length > 0) {
        mealSelect.appendChild(new Option('Selecione a refeição específica...', ''));
        meals.forEach(m => mealSelect.appendChild(new Option(m.label, m.key)));
      } else {
        mealSelect.appendChild(new Option('Erro: Alimento não encontrado', ''));
      }
    } catch (err) {
      Debug.error('populateSpecificMeals failed', err);
      mealSelect.innerHTML = '<option>Erro</option>';
    }
  }

  /** Persiste plano no Supabase: update se planId, insert caso contrário */
  async function persistPlanToSupabase(plan) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setStatus('Usuário não autenticado. Não foi possível salvar.', 'error');
        return null;
      }

      // se tivermos id do registro, atualizamos
      if (cardContainer._planId) {
        const { error } = await supabase.from('user_diets').update({ payload: plan }).eq('id', cardContainer._planId);
        if (error) {
          Debug.error('persistPlanToSupabase update error', error);
          setStatus('Falha ao salvar alteração no servidor.', 'error');
          return null;
        }
        setStatus('Troca salva no plano (atualizado).', 'info');
        return cardContainer._planId;
      } else {
        // insere novo registro e captura id
        const { data, error } = await supabase.from('user_diets').insert([{ user_id: user.id, payload: plan }]).select('id').single();
        if (error) {
          Debug.error('persistPlanToSupabase insert error', error);
          setStatus('Falha ao salvar alteração no servidor.', 'error');
          return null;
        }
        cardContainer._planId = data?.id || null;
        setStatus('Troca salva no plano (novo registro).', 'info');
        return cardContainer._planId;
      }
    } catch (err) {
      Debug.error('persistPlanToSupabase unexpected error', err);
      setStatus('Erro ao salvar plano. Veja console.', 'error');
      return null;
    }
  }

  /** Função principal de troca */
  async function performSwap() {
    executeBtn.disabled = true;
    const prevTxt = executeBtn.textContent;
    executeBtn.textContent = 'Trocando...';
    setStatus('');

    try {
      const plan = cardContainer._lastPlan || planPayload;
      const oldId = foodSelect.value;
      const newId = newFoodSelect.value;
      const scope = scopeSelect.value;
      const mealKey = mealSelect.value;

      if (!oldId || !newId) {
        setStatus('Selecione alimento original e substituto.', 'error');
        executeBtn.disabled = false;
        executeBtn.textContent = prevTxt;
        return;
      }

      const oldFood = safeFindFood(oldId);
      const newFood = safeFindFood(newId);
      if (!oldFood || !newFood) {
        setStatus('Erro ao localizar dados dos alimentos (veja console).', 'error');
        Debug.error('performSwap: findFood failed', { oldId, oldFood, newId, newFood });
        executeBtn.disabled = false;
        executeBtn.textContent = prevTxt;
        return;
      }

      // apply swap (iterate weeks/days/meals)
      let modifications = 0;
      (plan.timeline_weeks || []).forEach((w, wi) => {
        (w.days || []).forEach((d, di) => {
          (d.meals || []).forEach((m, mi) => {
            const currentMealKey = `w${wi}-d${di}-m${mi}`;
            let mealWasModified = false;

            (m.components || []).forEach(c => {
              if (c.source_id !== oldId) return;
              if (scope === 'specific' && currentMealKey !== mealKey) return;

              const oldGrams = _safeNum(c.grams, 0);
              let eq = null;
              let usedCalc = false;

              if (SuperDietEngine && typeof SuperDietEngine.calculateEquivalentPortion === 'function') {
                try {
                  eq = SuperDietEngine.calculateEquivalentPortion(oldFood, newFood, oldGrams);
                  usedCalc = true;
                  Debug.log('calculateEquivalentPortion =>', eq);
                } catch (errCalc) {
                  Debug.warn('calculateEquivalentPortion threw, using fallback', errCalc);
                  eq = null;
                }
              }

              // fallback if eq invalid
              if (!eq || typeof eq.grams === 'undefined' || typeof eq.kcal === 'undefined') {
                try {
                  const nutrientToMatch = (c.role === 'proteina') ? 'protein_g' : 'carb_g';
                  const oldNutrPer100 = _safeNum(oldFood?.nutrition?.[nutrientToMatch], 0);
                  const newNutrPer100 = _safeNum(newFood?.nutrition?.[nutrientToMatch], 0);

                  let newGramsFallback = oldGrams;

                  if (newNutrPer100 > 0.1 && oldNutrPer100 > 0.1) {
                    const totalOldNutrient = (oldNutrPer100 / 100) * oldGrams;
                    newGramsFallback = (totalOldNutrient * 100) / newNutrPer100;
                  } else {
                    const oldKcal = _safeNum(c.kcal, Math.round((_safeNum(oldFood?.nutrition?.kcal, 0) / 100) * oldGrams));
                    const newKcalPer100 = _safeNum(newFood?.nutrition?.kcal, 0);
                    if (newKcalPer100 > 0.1) {
                      newGramsFallback = (oldKcal * 100) / newKcalPer100;
                    } else {
                      newGramsFallback = oldGrams;
                    }
                  }

                  const quantize = (v) => Math.max(5, Math.round(v / 5) * 5);
                  const finalNewGramsFB = Math.max(0, quantize(newGramsFallback || 0));
                  const finalNewKcalFB = Math.round((_safeNum(newFood?.nutrition?.kcal, 0) / 100) * finalNewGramsFB);

                  eq = { grams: finalNewGramsFB, kcal: finalNewKcalFB, score: 0, by: 'fallback' };
                  Debug.log('fallback eq', eq);
                } catch (errFb) {
                  Debug.error('fallback calculation failed', errFb);
                  eq = { grams: oldGrams, kcal: Math.round((_safeNum(newFood?.nutrition?.kcal, 0) / 100) * oldGrams), score: 0, by: 'fallback_error' };
                }
              }

              const finalNewGrams = Math.max(0, Math.round(_safeNum(eq.grams, 0)));
              const finalNewKcal = Math.max(0, Math.round(_safeNum(eq.kcal, Math.round((_safeNum(newFood?.nutrition?.kcal, 0) / 100) * finalNewGrams))));

              c.food = stripParenthesis(newFood.name);
              c.grams = finalNewGrams;
              c.kcal = finalNewKcal;
              c.source_id = newId;
              c._swap_meta = {
                from: oldId,
                to: newId,
                method: (eq && eq.by) ? eq.by : (usedCalc ? 'calc_unknown' : 'fallback'),
                score: _safeNum(eq && eq.score, 0),
                computed_at: nowISO()
              };

              mealWasModified = true;
              modifications++;
            });

            if (mealWasModified) {
              m.mealKcalTotal = (m.components || []).reduce((acc, comp) => acc + _safeNum(comp.kcal, 0), 0);
              if (m.gramsComputed && m.gramsComputed.details) {
                m.gramsComputed.details._stale = true;
              }
            }
          });
        });
      });

      if (modifications === 0) {
        setStatus('Nenhuma ocorrência encontrada para troca.', 'error');
      } else {
        // persiste o plano e re-renderiza
        cardContainer._lastPlan = plan;
        setStatus('Aplicando troca localmente...', 'info');
        renderPlanToContainer(planView, plan);

        // animação visual: pulse no botão principal ao confirmar e fechar modal
        openBtn.classList.add('pulse');
        setTimeout(()=>openBtn.classList.remove('pulse'), 420);

        // salvo automaticamente
        setStatus('Salvando alteração no servidor...', 'info');
        await persistPlanToSupabase(plan);
        // re-render para garantir dados atualizados
        renderPlanToContainer(planView, plan);
      }

      // fechar modal com animação
      overlay.classList.add('hiding');
      setTimeout(() => {
        overlay.classList.remove('visible', 'hiding');
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
      }, 260);
    } catch (err) {
      Debug.error('performSwap error', err);
      setStatus('Ocorreu um erro ao realizar a troca. Veja console.', 'error');
    } finally {
      executeBtn.disabled = false;
      executeBtn.textContent = prevTxt;
    }
  } // end performSwap

  /* Event listeners do modal */
  openBtn.addEventListener('click', () => {
    try {
      populateFoodsToSwap();
      scopeSelect.value = 'all';
      specificMealGroup.style.display = 'none';
      newFoodSelect.innerHTML = '<option value="">Selecione um alimento para trocar</option>';
      newFoodSelect.disabled = true;
      mealSelect.innerHTML = '';
      executeBtn.disabled = true;
      setStatus('');

      // show overlay with animation classes
      overlay.style.display = 'flex';
      // small delay to allow CSS transition: remove any hiding class then add visible
      requestAnimationFrame(()=> {
        overlay.classList.add('visible');
        overlay.setAttribute('aria-hidden', 'false');
      });

      // button click feedback
      openBtn.classList.add('press-anim');
      setTimeout(()=> openBtn.classList.remove('press-anim'), 180);
      openBtn.classList.add('pulse');
      setTimeout(()=> openBtn.classList.remove('pulse'), 350);
    } catch (err) {
      Debug.error('openBtn click error', err);
    }
  });

  cancelBtn.addEventListener('click', () => {
    setStatus('');
    overlay.classList.add('hiding');
    setTimeout(() => {
      overlay.classList.remove('visible', 'hiding');
      overlay.style.display = 'none';
      overlay.setAttribute('aria-hidden', 'true');
    }, 240);
  });

  scopeSelect.addEventListener('change', () => {
    specificMealGroup.style.display = (scopeSelect.value === 'specific') ? 'block' : 'none';
    // re-evaluate executeBtn
    executeBtn.disabled = !foodSelect.value || !newFoodSelect.value || (scopeSelect.value === 'specific' && !mealSelect.value);
  });

  foodSelect.addEventListener('change', () => {
    const foodId = foodSelect.value;
    populateReplacements(foodId);
    populateSpecificMeals(foodId);
    executeBtn.disabled = !foodId || !newFoodSelect.value;
  });

  newFoodSelect.addEventListener('change', () => {
    executeBtn.disabled = !foodSelect.value || !newFoodSelect.value || (scopeSelect.value === 'specific' && !mealSelect.value);
  });

  mealSelect.addEventListener('change', () => {
    if (scopeSelect.value === 'specific') {
      executeBtn.disabled = !foodSelect.value || !newFoodSelect.value || !mealSelect.value;
    }
  });

  executeBtn.addEventListener('click', () => {
    // small UX: show quick pulse on execute
    executeBtn.classList.add('press-anim');
    setTimeout(()=> executeBtn.classList.remove('press-anim'), 160);
    performSwap();
  });
}

/* ============================
   INICIALIZAÇÃO
   ============================ */

document.addEventListener('DOMContentLoaded', () => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true') Debug.enabled = true;
  } catch (e) {}

  try {
    SuperDietEngine.init({ supabase });
  } catch (e) {
    console.error('Falha ao inicializar SuperDietEngine', e);
    alert('Erro crítico ao carregar a lógica de dieta. Contate o suporte.');
    return;
  }

  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const configBtn = document.getElementById('config-btn');
  const resetBtn = document.getElementById('reset-btn');
  const logoutBtn = document.getElementById('logout-btn');

  function openSidebar() { if (sidebar) sidebar.classList.add('open'); if (menuToggle) menuToggle.classList.add('open'); if (overlay) overlay.classList.add('show'); }
  function closeSidebar() { if (sidebar) sidebar.classList.remove('open'); if (menuToggle) menuToggle.classList.remove('open'); if (overlay) overlay.classList.remove('show'); }

  if (menuToggle) menuToggle.addEventListener('click', () => {
    if (sidebar && sidebar.classList.contains('open')) closeSidebar(); else openSidebar();
  });
  if (overlay) overlay.addEventListener('click', closeSidebar);

  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.dataset.tab) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        const tabContent = document.getElementById(tab);
        if (tabContent) tabContent.classList.add('active');
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        closeSidebar();
      });
    }
  });

  if (configBtn) configBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (logoutBtn) logoutBtn.classList.toggle('hidden');
    if (resetBtn) resetBtn.classList.toggle('hidden');
    configBtn.setAttribute('aria-expanded', String(!(logoutBtn && logoutBtn.classList.contains('hidden'))));
  });

  if (resetBtn) resetBtn.addEventListener('click', async () => {
    try {
      const formWrapper = document.getElementById('form-wrapper');
      if (formWrapper) formWrapper.style.display = 'block';
      const resultsWrapper = document.getElementById('results-wrapper');
      if (resultsWrapper) resultsWrapper.style.display = 'none';
      const form = document.getElementById('ia-fit-form');
      if (form) form.reset();
      const prazoGroup = document.getElementById('prazo-group');
      if (prazoGroup) prazoGroup.style.display = 'none';
      const suppGroup = document.getElementById('suplementos-detalhes-group');
      if (suppGroup) suppGroup.style.display = 'none';
      const objetivo = document.getElementById('objetivo');
      if (objetivo) objetivo.focus();

      const user = await getCurrentUser();
      if (user) {
        await SuperDietEngine.deleteLatestPlan(user.id);
        const dietaCard = document.getElementById('dieta-card');
        if (dietaCard) await renderPercursoDietArea();
      }
    } catch (err) {
      Debug.error('resetBtn click error', err);
      alert('Erro ao limpar sua meta antiga. Tente novamente.');
    }
    closeSidebar();
  });

  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    try {
      await supabase.auth.signOut();
      window.location.replace('/login.html');
    } catch (err) {
      alert('Falha ao sair: ' + (err.message || err));
    }
  });

  // submit form bindings (kept as in original - if present on page)
  const iaFitForm = document.getElementById('ia-fit-form');
  if (iaFitForm) {
    iaFitForm.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const active = document.activeElement;
        if (active && active.tagName !== 'TEXTAREA') {
          e.preventDefault();
          return false;
        }
      }
    });

    iaFitForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      const submitButton = iaFitForm.querySelector('button[type="submit"]');
      if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'A gerar o seu plano...'; }

      try {
        const formElements = event.target.elements;
        const prazoText = formElements.prazo.value;
        const endDate = SuperDietEngine.calculateEndDate(prazoText);

        if (!endDate) {
          alert('Prazo inválido. Use "3 meses", "1 ano", "1.5 anos", etc.');
          if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Crie seu próprio caminho'; }
          return;
        }

        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const objetivoText = formElements.objetivo.value;

        const selectedDaysCheckboxes = document.querySelectorAll('input[name="dias_treino"]:checked');
        const selectedDaysArray = Array.from(selectedDaysCheckboxes).map(cb => cb.value);
        if (selectedDaysArray.length === 0) {
          alert('Selecione pelo menos um dia de treino.');
          if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Crie seu próprio caminho'; }
          return;
        }

        const inputs = {
          grande_meta: objetivoText,
          prazo: prazoText,
          sexo: formElements.sexo.value,
          altura: parseFloat((formElements.altura.value || '0').replace(',', '.')) || 1.7,
          peso: parseFloat((formElements.peso.value || '0').replace(',', '.')) || 70,
          idade: parseInt(formElements.idade.value, 10) || 30,
          disponibilidade: selectedDaysArray.length,
          selected_days: selectedDaysArray,
          local_treino: formElements.local_treino.value,
          orcamento: parseFloat((formElements.orcamento.value || '').replace(',', '.')) || 0,
          orcamento_mes_R$: parseFloat((formElements.orcamento.value || '').replace(',', '.')) || 0,
          uso_suplemento: formElements.uso_suplemento.value,
          quais_suplementos: formElements.quais_suplementos.value || '',
          nivel: formElements.nivel.value,
          goal_start_date: startDate.toISOString(),
          goal_end_date: endDate.toISOString(),
          goal_prompt: objetivoText
        };

        const strategy = SuperDietEngine.analyzeMasterGoal(inputs);
        inputs.goal_type = strategy ? strategy.specificGoal : SuperDietEngine.detectGoalType(objetivoText);

        if (strategy && strategy.nextQuestions && strategy.nextQuestions.length > 0) {
          const answers = await showFollowupQuestions(strategy.nextQuestions);
          if (!answers) {
            if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Crie seu próprio caminho'; }
            return;
          }
          Object.keys(answers).forEach(k => { inputs[k] = answers[k]; });
        }

        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const months = Math.max(1, Math.round(diffDays / 30.44));

        const plan = await SuperDietEngine.generatePlan(inputs, { months, debug: false, strategy });

        const current = await getCurrentUser();
        if (current) {
          await SuperDietEngine.savePlan(current.id, plan, { title: `Plano - ${plan.targets?.targetCalories} kcal` });
        }

        window.location.href = 'percurso.html';
      } catch (err) {
        Debug.error('iaFitForm submit error', err);
        alert('Erro ao salvar sua meta: ' + (err.message || JSON.stringify(err)));
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Crie seu próprio caminho'; }
      }
    });
  }

  (async function initializePageData() {
    try {
      const user = await getCurrentUser();
      const welcomeMsg = document.getElementById('welcome-msg');
      if (!user) {
        window.location.replace('/login.html');
        return;
      }
      if (welcomeMsg) welcomeMsg.textContent = user.email || user.id;

      const formWrapper = document.getElementById('form-wrapper');
      if (formWrapper) {
        loadFreshDifyChat();
        try {
          const latestPlan = await fetchLatestUserDiet();
          if (latestPlan && latestPlan.payload) {
            const profileData = latestPlan.payload.profile_snapshot;
            if (profileData && profileData.goal_start_date && profileData.goal_end_date) {
              displayProgress(new Date(profileData.goal_start_date), new Date(profileData.goal_end_date));
            }
            const playlistSection = document.getElementById('playlist-section');
            if (playlistSection && profileData) {
              playlistSection.style.display = profileData.goal_type ? 'block' : 'none';
            }

            formWrapper.style.display = 'none';
            const resultsWrapper = document.getElementById('results-wrapper');
            if (resultsWrapper) resultsWrapper.style.display = 'block';
          } else {
            formWrapper.style.display = 'block';
            const resultsWrapper = document.getElementById('results-wrapper');
            if (resultsWrapper) resultsWrapper.style.display = 'none';
          }
        } catch (e) {
          Debug.error('initializePageData inner error', e);
          formWrapper.style.display = 'block';
          const resultsWrapper = document.getElementById('results-wrapper');
          if (resultsWrapper) resultsWrapper.style.display = 'none';
        }
      }

      const dietaCard = document.getElementById('dieta-card');
      if (dietaCard) {
        await renderPercursoDietArea();
      }
    } catch (err) {
      Debug.error('initializePageData outer error', err);
    }
  })();

}); // end DOMContentLoaded
