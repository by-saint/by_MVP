/* ===================================================================
   ARQUIVO: membros.js (O "ENGENHEIRO") - v4.1 (com Troca de Alimentos)
   Melhoria:
   1. Adicionada a função 'initializeFoodSwapModal'
   2. Chamada da função em 'renderGeneratedPlanEditor'
   3. 'renderMonth' agora lida com 'gramsComputed' desatualizado
   4. CORREÇÃO: Removidos caracteres aleatórios que causei (., t, f)
=================================================================== */

// PASSO 1: Importar o "Cofre" e o "Cérebro"
import { supabase, DIFY_APP_TOKEN } from './supabase-client.js';
import SuperDietEngine from './diet-engine.js';

/* =========================
    Funções de UI (Interface)
   ========================= */

// Função de helper para limpar nomes
function stripParenthesis(name){ if(!name) return name; return name.replace(/\s*\(.*?\)\s*/g,'').trim(); }

function displayProgress(startDate, endDate){
  const now = new Date(); now.setHours(0,0,0,0);
  const sDate = new Date(startDate); sDate.setHours(0,0,0,0);
  const eDate = new Date(endDate); eDate.setHours(0,0,0,0);
  const totalDuration = eDate.getTime() - sDate.getTime();
  const elapsedDuration = now.getTime() - sDate.getTime();
  const daysRemaining = Math.ceil((eDate - now) / (1000*60*60*24));
  let progressPercentage = (elapsedDuration / totalDuration) * 100;
  if(progressPercentage < 0) progressPercentage = 0;
  if(progressPercentage > 100) progressPercentage = 100;
  
  const progressBar = document.getElementById('progress-bar');
  const startDateLabel = document.getElementById('start-date-label');
  const endDateLabel = document.getElementById('end-date-label');
  const countdownDays = document.getElementById('countdown-days');

  if (progressBar) progressBar.style.width = `${progressPercentage}%`;
  if (startDateLabel) startDateLabel.textContent = sDate.toLocaleDateString('pt-BR');
  if (endDateLabel) endDateLabel.textContent = eDate.toLocaleDateString('pt-BR');
  if (countdownDays) countdownDays.textContent = daysRemaining >= 0 ? daysRemaining : 0;
}

function renderPlanToContainer(container, planPayload){
  container.innerHTML = '';
  const header = document.createElement('div'); header.style.display='flex'; header.style.justifyContent='space-between'; header.style.alignItems='center';
  const title = document.createElement('h4'); title.textContent = 'Plano de Dieta — visão geral';
  const meta = document.createElement('div'); meta.style.color = '#bbb';
  const targetCals = planPayload.targets.targetCalories || planPayload.estimates.dailyTargetCalories || '...';
  const tdee = planPayload.targets.tdee || planPayload.estimates.tdee || '...';
  meta.innerHTML = `Alvo: <b>${targetCals} kcal</b> <div style="font-size:12px;color:#bbb">TDEE: ${tdee} kcal</div>`;
  header.appendChild(title); header.appendChild(meta); container.appendChild(header);

  const months = {};
  planPayload.timeline_weeks.forEach(week => {
    const date = new Date(week.weekStartISO + 'T00:00:00Z');
    const monthKey = `${date.getUTCFullYear()}-${('0'+(date.getUTCMonth()+1)).slice(-2)}`;
    months[monthKey] = months[monthKey] || { monthIndex: date.getUTCMonth(), label: date.toLocaleString('pt-BR',{ timeZone: 'UTC', month:'long', year:'numeric' }), weeks: [] };
    months[monthKey].weeks.push(week);
  });

  const monthKeys = Object.keys(months).sort();
  const tabsBar = document.createElement('div'); tabsBar.className = 'plan-tabs'; container.appendChild(tabsBar);
  const contentArea = document.createElement('div'); container.appendChild(contentArea);

  monthKeys.forEach((mk, idx) => {
    const pill = document.createElement('div'); pill.className = 'plan-tab' + (idx===0 ? ' active' : ''); pill.textContent = months[mk].label;
    pill.onclick = () => { document.querySelectorAll('.plan-tab.active').forEach(p=>p.classList.remove('active')); pill.classList.add('active'); renderMonth(months[mk], contentArea); };
    tabsBar.appendChild(pill);
  });
  if(monthKeys.length) renderMonth(months[monthKeys[0]], contentArea);
}

function renderMonth(monthObj, contentArea){
  contentArea.innerHTML = '';
  const wrapper = document.createElement('div'); wrapper.style.marginTop = '12px';
  const days = [];
  monthObj.weeks.forEach(w => { w.days.forEach(d => { const copy = { ...d }; copy.weekIndex = w.weekIndex; days.push(copy); }); });

  const daysWrap = document.createElement('div'); daysWrap.className = 'plan-days';
  const dayNameMap = { 0:'Dom',1:'Seg',2:'Ter',3:'Qua',4:'Qui',5:'Sex',6:'Sab' };

  days.forEach(d => {
    const dayOfWeekIndex = d.dayOfWeekIndex;
    const dayName = dayNameMap[dayOfWeekIndex] !== undefined ? dayNameMap[dayOfWeekIndex] : 'Dia';
    const dayCard = document.createElement('div'); dayCard.className = 'plan-day';
    const dayTitle = document.createElement('div'); dayTitle.style.display='flex'; dayTitle.style.justifyContent='space-between'; dayTitle.style.alignItems='center';
    const left = document.createElement('div');
    const statusText = d.isTrainingDay ? 'DIA DE TREINO' : 'Dia de Descanso';
    const cheatText = d.isCheatDay ? ' • Cheat' : '';
    left.innerHTML = `<strong>${dayName}</strong><div style="color:${d.isTrainingDay ? 'var(--journey-red-1)' : '#bbb'};font-size:12px;font-weight:700;">${statusText} ${cheatText}</div>`;
    const right = document.createElement('div'); right.style.textAlign='right'; right.innerHTML = `<div style="font-weight:700">${d.baseCalories} kcal</div>`;
    dayTitle.appendChild(left); dayTitle.appendChild(right); dayCard.appendChild(dayTitle);

    d.meals.forEach(m => {
      const mealRow = document.createElement('div'); mealRow.className = 'meal-row';
      const mealLeft = document.createElement('div'); mealLeft.className = 'meal-left';
      const name = document.createElement('div'); name.className = 'meal-name'; name.textContent = m.mealName;
      const listPreview = document.createElement('div'); listPreview.style.color = '#bbb'; listPreview.style.fontSize = '13px';

      // ==========================================================
      // <<<<< MODIFICAÇÃO (MELHORIA 1) >>>>>
      // Ignora 'gramsComputed.details' se ele estiver 'stale' (desatualizado)
      // ==========================================================
      const details = (m.gramsComputed && !m.gramsComputed.details?._stale) ? (m.gramsComputed.details || {}) : {};
      // ==========================================================
      
      const items = m.components.map(c => {
        if (c.role === 'proteina' && details.prot_portion_name && typeof details.prot_portions !== 'undefined') {
          return `${c.food} (${details.prot_portions} ${details.prot_portion_name})`;
        }
        if (c.role === 'carbo' && details.carb_portion_name && typeof details.carb_portions !== 'undefined') {
          return `${c.food} (${details.carb_portions} ${details.carb_portion_name})`;
        }
        return `${c.food} (${c.grams}g)`;
      }).join(' • ');

      listPreview.textContent = items;
      mealLeft.appendChild(name); mealLeft.appendChild(listPreview);

      const mealRight = document.createElement('div'); mealRight.style.display = 'flex'; mealRight.style.flexDirection = 'column'; mealRight.style.alignItems = 'flex-end';
      const kcal = document.createElement('div'); kcal.className = 'meal-kcal'; kcal.textContent = `${m.mealKcalTotal || '—'} kcal`;
      
      mealRight.appendChild(kcal);

      mealRow.appendChild(mealLeft); mealRow.appendChild(mealRight);
      dayCard.appendChild(mealRow);
    });

    daysWrap.appendChild(dayCard);
  });

  wrapper.appendChild(daysWrap);
  contentArea.appendChild(wrapper);
}

// Funções de ajuda do Supabase (agora só leem de 'user_diets')
async function getCurrentUser(){ const { data } = await supabase.auth.getUser(); return data?.user; }

async function fetchLatestUserDiet(){
  const user = await getCurrentUser();
  if(!user) return null;
  const { data, error } = await supabase.from('user_diets').select('*').eq('user_id', user.id).order('created_at', { ascending:false }).limit(1).single();
  if(error && error.code !== 'PGRST116') console.error('Erro fetchLatestUserDiet:', error.message);
  return data;
}

// Chamado pela página 'percurso.html'
async function renderPercursoDietArea(){
  const dietaCard = document.getElementById('dieta-card');
  if (!dietaCard) return; 
  
  const targetContainer = document.getElementById('dieta-card-content');
  if (!targetContainer) return;

  targetContainer.innerHTML = '<p style="color:#bbb;">Buscando seu plano de dieta...</p>';

  const latest = await fetchLatestUserDiet();
  
  if(latest && latest.payload){
    renderGeneratedPlanEditor(targetContainer, latest.payload, latest.id);
  } else {
    targetContainer.innerHTML = '<p style="color:#bbb;">Você ainda não gerou um plano. Vá à aba "IA Especialista" para criar sua meta.</p>';
  }
}

// Desenha o editor do plano
function renderGeneratedPlanEditor(container, planPayload, existingId = null){
  container.innerHTML = '';
  
  const title = document.createElement('h4'); 
  title.textContent = 'Plano de Dieta — Plano gerado';
  title.style.marginTop = 0;
  
  const meta = document.createElement('p'); meta.style.color='#bbb'; meta.style.marginTop = 0;
  const targetCals = planPayload.targets.targetCalories || '...';
  const tdee = planPayload.targets.tdee || '...';
  meta.innerHTML = `Meta: ${planPayload.profile_snapshot.grande_meta || ''} | Alvo: <b>${targetCals} kcal</b> <span style="font-size:11px;color:#bbb">(TDEE: ${tdee} kcal)</span>`;
  
  container.appendChild(title); 
  container.appendChild(meta);
  
  const planView = document.createElement('div'); planView.style.marginTop='12px'; planView.id='plan-view';
  container._lastPlan = planPayload; // Armazena o plano no elemento
  renderPlanToContainer(planView, planPayload);
  container.appendChild(planView);

  const btnWrap = document.createElement('div'); btnWrap.style.display='flex'; btnWrap.style.gap='8px'; btnWrap.style.marginTop='12px';
  const saveBtn = document.createElement('button'); saveBtn.textContent = existingId ? 'Salvar alterações' : 'Salvar formulário'; saveBtn.className = 'playlist-btn';
  const saveNewBtn = document.createElement('button'); saveNewBtn.textContent = 'Salvar como novo'; saveNewBtn.style.background = '#444'; saveNewBtn.style.color = '#fff'; saveNewBtn.style.border = 'none'; saveNewBtn.style.padding = '10px 14px'; saveNewBtn.style.borderRadius='8px';
  const statusSpan = document.createElement('span'); statusSpan.style.color = '#bbb'; statusSpan.style.marginLeft = '8px';
  btnWrap.appendChild(saveBtn); btnWrap.appendChild(saveNewBtn); btnWrap.appendChild(statusSpan);
  container.appendChild(btnWrap);

  saveBtn.onclick = async () => {
    statusSpan.textContent = 'Salvando...';
    try{
      const user = await getCurrentUser();
      if(!user){ statusSpan.textContent = 'Usuário não autenticado.'; return; }
      // Usa o plano modificado que está em 'container._lastPlan'
      planPayload.modified_at = new Date().toISOString();
      if(existingId){
        const { error } = await supabase.from('user_diets').update({ payload: container._lastPlan }).eq('id', existingId);
        if(error){ console.error(error); statusSpan.textContent = 'Erro ao atualizar.'; return; }
        statusSpan.textContent = 'Salvo (atualizado).';
      } else {
        await SuperDietEngine.savePlan(user.id, container._lastPlan, { title: `Plano - ${container._lastPlan.targets.targetCalories} kcal` });
        statusSpan.textContent = 'Salvo com sucesso.';
        await renderPercursoDietArea();
      }
    } catch(err){ console.error(err); statusSpan.textContent = 'Erro: ' + err.message; }
  };

  saveNewBtn.onclick = async () => {
    statusSpan.textContent = 'Salvando cópia...';
    try{
      const user = await getCurrentUser();
      if(!user){ statusSpan.textContent = 'Usuário não autenticado.'; return; }
      await SuperDietEngine.savePlan(user.id, container._lastPlan, { title: `Plano cópia - ${container._lastPlan.targets.targetCalories} kcal` });
      statusSpan.textContent = 'Cópia salva.';
    } catch(err){ console.error(err); statusSpan.textContent = 'Erro: ' + err.message; }
  };
  
  // ==========================================================
  // <<<<< INICIALIZAÇÃO (MELHORIA 1) >>>>>
  // Passa o 'planPayload' e os elementos de UI para o inicializador do modal
  // ==========================================================
  initializeFoodSwapModal(planPayload, container, planView);
}

// Carrega o chat Dify
function loadFreshDifyChat(){
  const iframe = document.getElementById('dify-iframe');
  if(!iframe) return; 
  const randomSessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  const difyUrl = `https://udify.app/chatbot/${DIFY_APP_TOKEN}?user=${randomSessionId}&theme=dark&panel_background_color=%23000000&chat_background_color=%23000000&bot_message_background_color=%231A1A1A&user_message_background_color=%232B2B2B&_=${Date.now()}`;
  iframe.src = difyUrl;
}

// Mostra o modal de perguntas
function showFollowupQuestions(questions){
  return new Promise((resolve) => {
    const root = document.getElementById('followup-root');
    if (!root) {
      resolve(null); 
      return;
    }
    root.style.display = 'block';
    root.innerHTML = '';
    const overlay = document.createElement('div'); overlay.className = 'followup-overlay';
    const modal = document.createElement('div'); modal.className = 'followup-modal';
    const title = document.createElement('h4'); title.textContent = 'Precisamos de mais alguns detalhes';
    modal.appendChild(title);
    const fields = [];
    questions.forEach(q => {
      const fldWrap = document.createElement('div'); fldWrap.className = 'followup-field';
      const lbl = document.createElement('label'); lbl.style.display='block'; lbl.style.marginBottom='6px'; lbl.textContent = q.label;
      fldWrap.appendChild(lbl);
      if(q.type === 'select'){
        const sel = document.createElement('select'); sel.className='followup-select';
        (q.options || []).forEach(opt => { const o = document.createElement('option'); o.value = opt; o.textContent = opt; sel.appendChild(o); });
        if(q.placeholder){ const ph = document.createElement('option'); ph.value=''; ph.textContent = q.placeholder; ph.disabled=true; ph.selected=true; sel.insertBefore(ph, sel.firstChild); }
        fldWrap.appendChild(sel);
        fields.push({ id: q.id, el: sel, type: 'select' });
      } else {
        const inp = document.createElement('input'); inp.className='followup-input'; inp.type='text'; inp.placeholder = q.placeholder || '';
        fldWrap.appendChild(inp);
        fields.push({ id: q.id, el: inp, type: 'text' });
      }
      modal.appendChild(fldWrap);
    });
    const actions = document.createElement('div'); actions.className='followup-actions';
    const cancelBtn = document.createElement('button'); cancelBtn.textContent='Cancelar';
    const okBtn = document.createElement('button'); okBtn.textContent='Continuar';
    okBtn.style.background = 'linear-gradient(90deg,#007BFF,#0056b3)'; okBtn.style.color='#fff';
    cancelBtn.onclick = () => { root.style.display='none'; root.innerHTML=''; resolve(null); };
    okBtn.onclick = () => {
      const answers = {};
      fields.forEach(f => { answers[f.id] = (f.el.value || '').toString(); });
      root.style.display='none'; root.innerHTML=''; resolve(answers);
    };
    actions.appendChild(cancelBtn); actions.appendChild(okBtn); modal.appendChild(actions);
    overlay.appendChild(modal); root.appendChild(overlay);
  });
}


// ===================================================================
// <<<<< NOVA FUNÇÃO (MELHORIA 1): SISTEMA DE TROCA DE ALIMENTOS >>>>>
// ===================================================================
/**
 * Inicializa toda a lógica para o modal de troca de alimentos.
 * @param {object} planPayload - O objeto de plano de dieta completo.
 * @param {HTMLElement} cardContainer - O elemento (#dieta-card-content) que armazena _lastPlan.
 * @param {HTMLElement} planView - O elemento (#plan-view) onde o plano é renderizado.
 */
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

  if (!openBtn || !overlay || !SuperDietEngine.findFood) {
    console.error("Elementos do modal de troca ou 'SuperDietEngine.findFood' não encontrados.");
    if(openBtn) openBtn.style.display = 'none'; // Esconde o botão se a lógica falhar
    return;
  }

  const dayNameMap = { 0:'Dom',1:'Seg',2:'Ter',3:'Qua',4:'Qui',5:'Sex',6:'Sab' };

  /** Popula o dropdown 'Alimento que quer trocar' */
  function populateFoodsToSwap() {
    foodSelect.innerHTML = '';
    const foods = new Map(); // Usa um Map para guardar [id, nome]
    const plan = cardContainer._lastPlan; // Pega o plano mais atual
  
    plan.timeline_weeks.forEach(w => {
      w.days.forEach(d => {
        d.meals.forEach(m => {
          m.components.forEach(c => {
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
  }

  /** Popula o dropdown 'Trocar por' com alimentos equivalentes */
  function populateReplacements(foodId) {
    newFoodSelect.innerHTML = '';
    newFoodSelect.disabled = true;

    if (!foodId) {
      newFoodSelect.appendChild(new Option('Selecione um alimento para trocar', ''));
      return;
    }

    const food = SuperDietEngine.findFood(foodId);
    if (!food || !food.category) {
      newFoodSelect.appendChild(new Option('Categoria não encontrada', ''));
      return;
    }

    const replacements = SuperDietEngine.getFoodsByCategory(food.category);
    if (!replacements || replacements.length === 0) {
      newFoodSelect.appendChild(new Option('Nenhum substituto encontrado', ''));
      return;
    }

    newFoodSelect.appendChild(new Option('Selecione um substituto...', ''));
    replacements.forEach(rep => {
      if (rep.id !== foodId) { // Não mostra o próprio alimento
        newFoodSelect.appendChild(new Option(stripParenthesis(rep.name), rep.id));
      }
    });
    newFoodSelect.disabled = false;
  }

  /** Popula o dropdown 'Qual refeição?' com ocorrências */
  function populateSpecificMeals(foodId) {
    mealSelect.innerHTML = '';
    if (!foodId) return;

    const plan = cardContainer._lastPlan;
    const meals = [];
    const dayNameMap = { 0:'Dom',1:'Seg',2:'Ter',3:'Qua',4:'Qui',5:'Sex',6:'Sab' };

    plan.timeline_weeks.forEach((w, wi) => {
      w.days.forEach((d, di) => {
        d.meals.forEach((m, mi) => {
          if (m.components.some(c => c.source_id === foodId)) {
            // Cria uma chave única para identificar a refeição
            const mealKey = `w${wi}-d${di}-m${mi}`;
            const dayName = dayNameMap[d.dayOfWeekIndex] || 'Dia';
            const label = `Sem ${w.weekIndex} / ${dayName} / ${m.mealName}`;
            meals.push({ key: mealKey, label });
          }
        });
      });
    });
    
    if (meals.length > 0) {
      mealSelect.appendChild(new Option('Selecione a refeição específica...', ''));
      meals.forEach(m => {
        mealSelect.appendChild(new Option(m.label, m.key));
      });
    } else {
      mealSelect.appendChild(new Option('Erro: Alimento não encontrado', ''));
    }
  }

  /** Executa a troca do alimento no objeto do plano */
  function performSwap() {
    executeBtn.disabled = true;
    executeBtn.textContent = 'Trocando...';

    try {
      const plan = cardContainer._lastPlan;
      const oldId = foodSelect.value;
      const newId = newFoodSelect.value;
      const scope = scopeSelect.value;
      const mealKey = mealSelect.value;

      if (!oldId || !newId) {
        alert('Selecione o alimento original e o substituto.');
        return;
      }

      const oldFood = SuperDietEngine.findFood(oldId);
      const newFood = SuperDietEngine.findFood(newId);
      if (!oldFood || !newFood) {
        alert('Erro ao encontrar dados dos alimentos.');
        return;
      }

      plan.timeline_weeks.forEach((w, wi) => {
        w.days.forEach((d, di) => {
          d.meals.forEach((m, mi) => {
            const currentMealKey = `w${wi}-d${di}-m${mi}`;
            let mealWasModified = false;

            m.components.forEach(c => {
              if (c.source_id !== oldId) return;

              // Verifica o escopo
              if (scope === 'specific' && currentMealKey !== mealKey) {
                return;
              }

              // --- Início da Lógica de Cálculo ---
              const oldGrams = c.grams;
              // Define o nutriente principal a ser pareado
              const nutrientToMatch = (c.role === 'proteina') ? 'protein_g' : 'carb_g';

              const oldNutrientPer100 = oldFood.nutrition[nutrientToMatch] || 0;
              const newNutrientPer100 = newFood.nutrition[nutrientToMatch] || 0;

              let newGrams = 0;

              // Tenta parear pelo nutriente principal (ex: gramas de carbo)
              if (newNutrientPer100 > 0.1) {
                const totalOldNutrient = (oldNutrientPer100 / 100) * oldGrams;
                newGrams = (totalOldNutrient * 100) / newNutrientPer100;
              } else {
                // Fallback: pareia por calorias
                const oldKcal = c.kcal || ((oldFood.nutrition.kcal / 100) * oldGrams);
                const newKcalPer100 = newFood.nutrition.kcal || 0;
                if (newKcalPer100 > 0.1) {
                  newGrams = (oldKcal * 100) / newKcalPer100;
                } else {
                  newGrams = oldGrams; // Failsafe (improvável)
                }
              }

              const finalNewGrams = Math.round(newGrams / 5) * 5; // Arredonda para 5g
              const finalNewKcal = Math.round((newFood.nutrition.kcal / 100) * finalNewGrams);

              // Atualiza o componente no plano
              c.food = stripParenthesis(newFood.name);
              c.grams = finalNewGrams;
normal-width             c.kcal = finalNewKcal;
              c.source_id = newId;
              mealWasModified = true;
            });

            if (mealWasModified) {
              // Recalcula o total de kcal da refeição
              m.mealKcalTotal = m.components.reduce((acc, comp) => acc + (comp.kcal || 0), 0);
              // Marca 'gramsComputed' como desatualizado
              if (m.gramsComputed && m.gramsComputed.details) {
                m.gramsComputed.details._stale = true;
              }
            }
          });
        });
      });

      // Atualiza o objeto do plano
      cardContainer._lastPlan = plan;
      // Re-renderiza o plano na tela
      renderPlanToContainer(planView, plan);
      // Fecha o modal
      overlay.style.display = 'none';

    } catch (err) {
      console.error("Erro ao realizar a troca:", err);
      alert("Ocorreu um erro ao realizar a troca.");
    } finally {
      executeBtn.disabled = false;
      executeBtn.textContent = 'Realizar Troca';
    }
  }

  // --- Event Listeners do Modal ---

  openBtn.addEventListener('click', () => {
    populateFoodsToSwap();
    scopeSelect.value = 'all';
    specificMealGroup.style.display = 'none';
    newFoodSelect.innerHTML = '<option value="">Selecione um alimento para trocar</option>';
    newFoodSelect.disabled = true;
    mealSelect.innerHTML = '';
    executeBtn.disabled = true;
    overlay.style.display = 'flex';
  });

  cancelBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  scopeSelect.addEventListener('change', () => {
    specificMealGroup.style.display = (scopeSelect.value === 'specific') ? 'block' : 'none';
  });

  foodSelect.addEventListener('change', () => {
    const foodId = foodSelect.value;
    populateReplacements(foodId);
    populateSpecificMeals(foodId);
    executeBtn.disabled = !foodId || !newFoodSelect.value;
  });

  newFoodSelect.addEventListener('change', () => {
    executeBtn.disabled = !foodSelect.value || !newFoodSelect.value;
  });
}
// ==========================================================
// <<<<< FIM DA NOVA FUNÇÃO (MELHORIA 1) >>>>>
// ==========================================================


/* ===================================================================
   INICIALIZAÇÃO DO SCRIPT
=================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  try {
    SuperDietEngine.init({ supabase });
  } catch(e) {
    console.error('Falha ao inicializar o SuperDietEngine:', e);
    alert('Erro crítico ao carregar a lógica de dieta. Contate o suporte.');
  }

  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const configBtn = document.getElementById('config-btn');
  const resetBtn = document.getElementById('reset-btn');
  const logoutBtn = document.getElementById('logout-btn');

  function openSidebar(){ sidebar.classList.add('open'); menuToggle.classList.add('open'); overlay.classList.add('show'); }
  function closeSidebar(){ sidebar.classList.remove('open'); menuToggle.classList.remove('open'); overlay.classList.remove('show'); }

  if (menuToggle) menuToggle.addEventListener('click', () => {
    if(sidebar.classList.contains('open')) closeSidebar(); else openSidebar();
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
    logoutBtn.classList.toggle('hidden');
    resetBtn.classList.toggle('hidden');
    configBtn.setAttribute('aria-expanded', String(!logoutBtn.classList.contains('hidden')));
  });

  // ===============================================
  //  <<<<< CORREÇÃO DO BUG 1 (Reset) >>>>>
  //  Agora chama 'deleteLatestPlan' da tabela 'user_diets'
  // ===============================================
A   if (resetBtn) resetBtn.addEventListener('click', async () => {
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
    
    // ATUALIZA O BANCO DE DADOS (usando a tabela 'user_diets')
    try {
      const user = await getCurrentUser();
      if (user) {
        // Chama a nova função do "Cérebro" para deletar o plano
S         await SuperDietEngine.deleteLatestPlan(user.id);
      }
    } catch (err) {
      console.error("Erro ao resetar a meta (deletar plano):", err);
A       alert("Erro ao limpar sua meta antiga. Tente novamente.");
    }
    
    closeSidebar();
  });

  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    try{
      await supabase.auth.signOut();
      window.location.replace('/login.html');
    } catch(err){
      alert('Falha ao sair: ' + (err.message || err));
    }
  });

  // --- Lógica da Página (Formulários) ---

  const objetivoInput = document.getElementById('objetivo');
  if (objetivoInput) objetivoInput.addEventListener('input', function(){ 
    const prazoGroup = document.getElementById('prazo-group');
    if (prazoGroup) prazoGroup.style.display = this.value.trim() !== '' ? 'block' : 'none'; 
  });

  const usoSupp = document.getElementById('uso_suplemento');
  if (usoSupp) usoSupp.addEventListener('change', function(){ 
    const suppGroup = document.getElementById('suplementos-detalhes-group');
    if (suppGroup) suppGroup.style.display = this.value === 'Sim' ? 'block' : 'none'; 
    if(this.value !== 'Sim') {
      const quaisSupp = document.getElementById('quais_suplementos');
A       if (quaisSupp) quaisSupp.value = '';
    }
  });

  const playlistBtn = document.getElementById('playlist-btn');
  if (playlistBtn) playlistBtn.addEventListener('click', () => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('video-aulas').classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const aulasLink = document.querySelector('.link-aulas');
    if (aulasLink) aulasLink.classList.add('active');
  });

  const iaFitForm = document.getElementById('ia-fit-form');
  if (iaFitForm) {
    iaFitForm.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){
        const active = document.activeElement;
        if(active && active.tagName !== 'TEXTAREA'){
          e.preventDefault();
          return false;
        }
      }
    });

    // ===============================================
    //  <<<<< CORREÇÃO DO BUG 2 (Submit) >>>>>
    //  Remove a tentativa de salvar em 'profiles'
    // ===============================================
    iaFitForm.addEventListener('submit', async function(event){
      event.preventDefault();
      const submitButton = iaFitForm.querySelector('button[type="submit"]');
      submitButton.disabled = true; submitButton.textContent = 'A gerar o seu plano...';
      
      try {
        const formElements = event.target.elements;
        const prazoText = formElements.prazo.value;
        const endDate = SuperDietEngine.calculateEndDate(prazoText);
        
        if(!endDate){ alert('Prazo inválido. Use "3 meses", "1 ano", "1.5 anos", etc.'); submitButton.disabled = false; submitButton.textContent = 'Crie seu próprio caminho'; return; }

        const startDate = new Date(); startDate.setHours(0,0,0,0);
        const objetivoText = formElements.objetivo.value;

        const selectedDaysCheckboxes = document.querySelectorAll('input[name="dias_treino"]:checked');
        const selectedDaysArray = Array.from(selectedDaysCheckboxes).map(cb => cb.value);
        if(selectedDaysArray.length === 0){ alert('Selecione pelo menos um dia de treino.'); submitButton.disabled = false; submitButton.textContent = 'Crie seu próprio caminho'; return; }

        // Os 'inputs' agora são usados pelo 'generatePlan' para criar o snapshot
        const inputs = {
          grande_meta: objetivoText,
          prazo: prazoText,
          sexo: formElements.sexo.value,
          altura: parseFloat((formElements.altura.value || '0').replace(',', '.')) || 1.7,
          peso: parseFloat((formElements.peso.value || '0').replace(',', '.')) || 70,
          idade: parseInt(formElements.idade.value,10) || 30,
          disponibilidade: selectedDaysArray.length,
          selected_days: selectedDaysArray,
          local_treino: formElements.local_treino.value,
          orcamento: parseFloat((formElements.orcamento.value||'').replace(',','.')) || 0,
          orcamento_mes_R$: parseFloat((formElements.orcamento.value||'').replace(',','.')) || 0,
          uso_suplemento: formElements.uso_suplemento.value,
          quais_suplementos: formElements.quais_suplementos.value || '',
          nivel: formElements.nivel.value,
          // Adiciona as datas da meta ao snapshot
          goal_start_date: startDate.toISOString(),
          goal_end_date: endDate.toISOString(),
          goal_prompt: objetivoText
        };

        const strategy = SuperDietEngine.analyzeMasterGoal(inputs);
S         inputs.goal_type = strategy ? strategy.specificGoal : SuperDietEngine.detectGoalType(objetivoText);

        if(strategy && strategy.nextQuestions && strategy.nextQuestions.length > 0){
          const answers = await showFollowupQuestions(strategy.nextQuestions);
          if(!answers){
            submitButton.disabled = false; submitButton.textContent = 'Crie seu próprio caminho';
            return;
          }
          Object.keys(answers).forEach(k => { inputs[k] = answers[k]; });
        }

        // REMOVIDA A TENTATIVA DE SALVAR EM 'PROFILES'
        // const { error: errorU } = await supabase.from('profiles')...

        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000*60*60*24));
        const months = Math.max(1, Math.round(diffDays / 30.44));

        // O 'inputs' é passado aqui e salvo como 'profile_snapshot' dentro do plano
        const plan = await SuperDietEngine.generatePlan(inputs, { months, debug: false, strategy });

        const current = await getCurrentUser();
        if(current){
          // Salva o plano na tabela 'user_diets' (o que já funciona)
Indented           await SuperDietEngine.savePlan(current.id, plan, { title: `Plano - ${plan.targets.targetCalories} kcal` });
        }
        
        // Redireciona para a página de Percurso
        window.location.href = 'percurso.html';

      } catch(err){
        console.error('Erro no fluxo de criação da meta:', err);
A         alert('Erro ao salvar sua meta: ' + (err.message || JSON.stringify(err)));
        submitButton.disabled = false; submitButton.textContent = 'Crie seu próprio caminho';
      }
    });
  }
  
  
  (async function initializePageData(){
    
    const user = await getCurrentUser();
    const welcomeMsg = document.getElementById('welcome-msg');
    
    if (!user) {
  f     window.location.replace('/login.html');
      return;
    }
    
    if (welcomeMsg) welcomeMsg.textContent = user.email || user.id;

    // --- Lógica da Página 'membros-saude.html' ---
    const formWrapper = document.getElementById('form-wrapper');
    if (formWrapper) {
      // Estamos na 'membros-saude.html'
      loadFreshDifyChat();
      
      try {
        // ===============================================
        //  <<<<< CORREÇÃO DO BUG 2 (Carregamento) >>>>>
        //  Agora checa 'user_diets' em vez de 'profiles'
        // ===============================================
        const latestPlan = await fetchLatestUserDiet(); 
        
        if (latestPlan && latestPlan.payload) {
          // SUCESSO: Usuário TEM um plano, esconde formulário
this-indent-is-weird-but-matches-the-original           
          // Pega os dados de progresso do snapshot salvo DENTRO do plano
          const profileData = latestPlan.payload.profile_snapshot;
          
          if (profileData && profileData.goal_start_date && profileData.goal_end_date) {
tr-indent             displayProgress(new Date(profileData.goal_start_date), new Date(profileData.goal_end_date));
          }
          
          const playlistSection = document.getElementById('playlist-section');
          if (playlistSection && profileData) {
             playlistSection.style.display = profileData.goal_type ? 'block' : 'none';
          }
          
          formWrapper.style.display = 'none';
          document.getElementById('results-wrapper').style.display = 'block';
        } else {
          // SUCESSO: Usuário NÃO tem plano, mostra formulário
SA           formWrapper.style.display = 'block';
          document.getElementById('results-wrapper').style.display = 'none';
        }
      } catch(e) {
        // Erro? Mostra o formulário por segurança.
        console.error("Erro no initializePageData:", e);
        formWrapper.style.display = 'block';
  S         document.getElementById('results-wrapper').style.display = 'none';
A     }
    }

    // --- Lógica da Página 'percurso.html' ---
    const dietaCard = document.getElementById('dieta-card');
    if (dietaCard) {
      await renderPercursoDietArea();
    }
    
  })(); // Fim da inicialização da página

}); // Fim do DOMContentLoaded
