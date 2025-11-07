/* ===================================================================
 * ARQUIVO: membros.js (O "ENGENHEIRO") - v4.2 (com Troca de Alimentos)
 *
 * MUDANÇAS:
 * 1. (Melhoria 2) Importa as novas funções do SuperDietEngine
 * (getFoodCategory, getFoodsByCategory).
 * 2. (Melhoria 2) Adicionada a função showFoodSwapModal().
 * 3. (Melhoria 2) Adicionada a função performFoodSwap()
 * e suas auxiliares (recalculateSwappedComponent).
 * 4. (Melhoria 2) Adicionado o event listener para
 * o botão #food-swap-btn na página de percurso.
 * 5. (Melhoria 2) Atualizada a renderMonth() para recalcular
 * porções e totais de kcal dinamicamente.
 * 6. (Falhas Corrigidas) Contém toda a lógica de UI
 * correta que depende do diet-engine v4.2.
 * =================================================================== */

// PASSO 1: Importar o "Cofre" e o "Cérebro"
import { supabase, DIFY_APP_TOKEN } from './supabase-client.js';
import SuperDietEngine from './diet-engine.js';

/* =========================
 * Funções de UI (Interface)
 * ========================= */

// Funções utilitárias locais
const stripParenthesis = (name) => (name || '').replace(/\s*\(.*?\)\s*/g,'').trim();
const quantize = (v) => Math.max(0.5, Math.round(v * 2) / 2); // Arredonda para 0.5


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
  const contentArea = document.createElement('div'); contentArea.id = 'plan-content-area'; container.appendChild(contentArea);

  monthKeys.forEach((mk, idx) => {
    const pill = document.createElement('div'); pill.className = 'plan-tab' + (idx===0 ? ' active' : ''); pill.textContent = months[mk].label;
    pill.onclick = () => { 
      document.querySelectorAll('.plan-tab.active').forEach(p=>p.classList.remove('active')); 
      pill.classList.add('active'); 
      // Salva o payload do mês atual no elemento pai (para re-renderizar após a troca)
      container._currentMonthPayload = months[mk];
      renderMonth(months[mk], contentArea); 
    };
    tabsBar.appendChild(pill);
  });

  if(monthKeys.length) {
    // Salva o primeiro mês para ser re-renderizado
    container._currentMonthPayload = months[monthKeys[0]];
    renderMonth(months[monthKeys[0]], contentArea);
  }
}

/**
 * (MELHORIA 2) - renderMonth atualizada.
 * Agora recalcula porções e totais de Kcal dinamicamente.
 */
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
    const right = document.createElement('div'); right.style.textAlign='right'; 
    
    // Calcula o total de Kcal do dia somando as refeições
    let dayKcalTotal = 0;

    d.meals.forEach(m => {
      const mealRow = document.createElement('div'); mealRow.className = 'meal-row';
      const mealLeft = document.createElement('div'); mealLeft.className = 'meal-left';
      const name = document.createElement('div'); name.className = 'meal-name'; name.textContent = m.mealName;
      const listPreview = document.createElement('div'); listPreview.style.color = '#bbb'; listPreview.style.fontSize = '13px';

      // ATUALIZADO: Recalcula porções dinamicamente
      const items = m.components.map(c => {
        // Encontra o registro do alimento no Cérebro (diet-engine)
        const foodRec = SuperDietEngine.findFood(c.source_id); 
        const portionName = foodRec?.portion?.name || 'porção';
        const portionGrams = foodRec?.portion?.grams || 100;
        // Recalcula o número de porções com base nos gramas atuais
        const portions = quantize(c.grams / portionGrams); 

        return `${c.food} (${portions} ${portionName})`;
      }).join(' • ');

      listPreview.textContent = items;
      mealLeft.appendChild(name); mealLeft.appendChild(listPreview);

      const mealRight = document.createElement('div'); mealRight.style.display = 'flex'; mealRight.style.flexDirection = 'column'; mealRight.style.alignItems = 'flex-end';
      const kcal = document.createElement('div'); kcal.className = 'meal-kcal';
      
      // ATUALIZADO: Recalcula o Kcal total da refeição com base nos componentes
      const mealKcalTotal = m.components.reduce((sum, comp) => {
        // Recalcula o kcal do componente (caso tenha sido trocado)
        const foodRec = SuperDietEngine.findFood(comp.source_id);
        const kcalPer100g = foodRec?.nutrition?.kcal || 0;
        const compKcal = Math.round((comp.grams / 100) * kcalPer100g);
        comp.kcal = compKcal; // Atualiza o kcal no componente
        return sum + (compKcal || 0);
      }, 0);

      m.mealKcalTotal = mealKcalTotal; // Atualiza o payload da refeição
      dayKcalTotal += mealKcalTotal; // Adiciona ao total do dia

      kcal.textContent = `${mealKcalTotal || '—'} kcal`;
      
      mealRight.appendChild(kcal);

      mealRow.appendChild(mealLeft); mealRow.appendChild(mealRight);
      dayCard.appendChild(mealRow);
    });
    
    // ATUALIZADO: Atualiza o total de Kcal do dia no payload e na UI
    d.baseCalories = dayKcalTotal;
    right.innerHTML = `<div style="font-weight:700">${dayKcalTotal} kcal</div>`;

    dayTitle.appendChild(left); dayTitle.appendChild(right); dayCard.appendChild(dayTitle);
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
  const foodSwapBtn = document.getElementById('food-swap-btn');
  if (!dietaCard) return; 
  
  const targetContainer = document.getElementById('dieta-card-content');
  if (!targetContainer) return;

  targetContainer.innerHTML = '<p style="color:#bbb;">Buscando seu plano de dieta...</p>';
  if (foodSwapBtn) foodSwapBtn.style.display = 'none'; // Oculta o botão por padrão

  const latest = await fetchLatestUserDiet();
  
  if(latest && latest.payload){
    if (foodSwapBtn) foodSwapBtn.style.display = 'block'; // Mostra o botão se o plano existe
    // (MELHORIA 2) Armazena o registro do DB no elemento para o botão de troca usar
    targetContainer._latestDBRecord = latest; 
    renderGeneratedPlanEditor(targetContainer, latest.payload, latest.id);
  } else {
    targetContainer.innerHTML = '<p style="color:#bbb;">Você ainda não gerou um plano. Vá à aba "IA Especialista" para criar sua meta.</p>';
  }
}

/**
 * (MELHORIA 2) - Atualizada para ser re-chamável.
 * Desenha o editor do plano.
 */
function renderGeneratedPlanEditor(container, planPayload, existingId = null){
  container.innerHTML = ''; // Limpa o container
  
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
  container._lastPlan = planPayload; // Armazena o payload no container para referência
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
      // Pega o payload *modificado* que está armazenado no container
      const currentPlanPayload = container._lastPlan; 
      currentPlanPayload.modified_at = new Date().toISOString();
      if(existingId){
        const { error } = await supabase.from('user_diets').update({ payload: currentPlanPayload }).eq('id', existingId);
        if(error){ console.error(error); statusSpan.textContent = 'Erro ao atualizar.'; return; }
        statusSpan.textContent = 'Salvo (atualizado).';
      } else {
        const { data, error } = await SuperDietEngine.savePlan(user.id, currentPlanPayload, { title: `Plano - ${currentPlanPayload.targets.targetCalories} kcal` });
        if (error) throw error;
        // (MELHORIA 2) Atualiza o ID do registro para o novo plano salvo
        const newRecord = data[0];
        existingId = newRecord.id;
        container._latestDBRecord = newRecord; 
        statusSpan.textContent = 'Salvo com sucesso.';
        // Não precisa recarregar tudo, apenas atualiza o ID
      }
    } catch(err){ console.error(err); statusSpan.textContent = 'Erro: ' + err.message; }
  };

  saveNewBtn.onclick = async () => {
    statusSpan.textContent = 'Salvando cópia...';
    try{
      const user = await getCurrentUser();
      if(!user){ statusSpan.textContent = 'Usuário não autenticado.'; return; }
      const currentPlanPayload = container._lastPlan; 
      // Cria uma cópia "limpa" para salvar como novo, sem o ID antigo
      const newPlanPayload = { ...currentPlanPayload };
      newPlanPayload.created_at = new Date().toISOString();
      delete newPlanPayload.modified_at;

      await SuperDietEngine.savePlan(user.id, newPlanPayload, { title: `Plano cópia - ${newPlanPayload.targets.targetCalories} kcal` });
      statusSpan.textContent = 'Cópia salva. Recarregue a página para vê-la.';
    } catch(err){ console.error(err); statusSpan.textContent = 'Erro: ' + err.message; }
  };
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


/* ==========================================================
 * === MELHORIA 2: LÓGICA DE TROCA DE ALIMENTOS ===
 * ========================================================== */

/**
 * Recalcula um componente de alimento (isocalórico).
 * Troca um alimento antigo por um novo, mantendo as calorias.
 */
function recalculateSwappedComponent(oldComponent, newFoodId) {
  // 1. Encontra o registro do NOVO alimento no "Cérebro"
  const newFoodRec = SuperDietEngine.findFood(newFoodId);
  if (!newFoodRec) return null; // Não encontrou o novo alimento

  // 2. Pega as calorias do componente ANTIGO
  // (Usamos o kcal do componente, que foi calculado na geração)
  const oldKcal = oldComponent.kcal || 0;
  if (oldKcal === 0) return null; // Não troca alimentos sem calorias

  // 3. Pega os kcal/100g do NOVO alimento
  const newKcalPer100g = newFoodRec.nutrition?.kcal || 0;
  if (newKcalPer100g === 0) return null; // Evita divisão por zero

  // 4. Regra de troca: Manter as calorias (ISOCALÓRICO)
  // newGrams = (oldKcal / newKcal_per_100g) * 100
  const newGrams = (oldKcal / newKcalPer100g) * 100;

  // 5. Cria o novo componente
  const newComponent = {
    ...oldComponent, // Mantém o 'role' (ex: 'proteina', 'carbo')
    food: stripParenthesis(newFoodRec.name),
    grams: Math.round(newGrams), // Arredonda os gramas
    kcal: oldKcal, // Mantém as calorias originais
    source_id: newFoodRec.id,
  };

  return newComponent;
}

/**
 * Aplica a troca de alimentos no payload do plano.
 */
function performFoodSwap(planPayload, foodFromId, foodToId, swapScope) {
  let componentsSwapped = 0;

  planPayload.timeline_weeks.forEach(week => {
    week.days.forEach(day => {
      day.meals.forEach(meal => {
        // Se o escopo é por refeição, e não é esta, pula
        if (swapScope !== 'all' && meal.mealName !== swapScope) {
          return; 
        }

        // Encontra e substitui os componentes
        meal.components = meal.components.map(comp => {
          if (comp.source_id === foodFromId) {
            const newComp = recalculateSwappedComponent(comp, foodToId);
            if (newComp) {
              componentsSwapped++;
              return newComp; // Retorna o componente trocado
            }
          }
          return comp; // Retorna o componente original
        });
      });
    });
  });

  return componentsSwapped; // Retorna quantos foram trocados
}


/**
 * Mostra o modal de troca de alimentos.
 */
function showFoodSwapModal(planPayload, planId) {
  const root = document.getElementById('followup-root');
  if (!root) return;

  // 1. Coletar todos os alimentos únicos e refeições do plano
  const allFoods = new Map();
  const allMealNames = new Set();
  planPayload.timeline_weeks.forEach(w => {
    w.days.forEach(d => {
      d.meals.forEach(m => {
        allMealNames.add(m.mealName);
        m.components.forEach(c => {
          // Não permite trocar vegetais de folha ou suplementos
          if (c.source_id && c.role !== 'verdura_folha' && c.role !== 'suplemento') { 
            allFoods.set(c.source_id, c.food);
          }
        });
      });
    });
  });

  // Converte para arrays ordenados
  const uniqueFoods = Array.from(allFoods.entries()).sort((a,b) => a[1].localeCompare(b[1]));
  const mealNames = Array.from(allMealNames);

  // 2. Criar o HTML do Modal
  root.style.display = 'block';
  root.innerHTML = `
    <div class="followup-overlay" id="swap-overlay">
      <div class="swap-modal">
        <h3>🔄 Trocar Alimentos</h3>
        
        <!-- Passo 1: Escolher o alimento A SER TROCADO -->
        <div class="swap-section">
          <label class="swap-label" for="swap-food-from">Qual alimento você quer trocar?</label>
          <select id="swap-food-from" class="swap-select">
            <option value="">Selecione um alimento...</option>
            ${uniqueFoods.map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}
          </select>
        </div>

        <!-- Passo 2: Escolher o escopo (Onde trocar) -->
        <div class="swap-section" id="swap-scope-section" style="display: none;">
          <label class="swap-label">Onde você quer trocar?</label>
          <div class="swap-radio-group">
            <input type="radio" name="swap-scope" id="scope-all" value="all" checked>
            <label for="scope-all">Todas as refeições</label>
            <input type="radio" name="swap-scope" id="scope-specific" value="specific">
            <label for="scope-specific">Refeição específica</label>
          </div>
          <select id="swap-meal-scope" class="swap-select" style="display: none; margin-top: 10px;">
            ${mealNames.map(name => `<option value="${name}">${name}</option>`).join('')}
          </select>
        </div>

        <!-- Passo 3: Escolher o NOVO alimento (Substituto) -->
        <div class="swap-section" id="swap-to-section" style="display: none;">
          <label class="swap-label" id="swap-to-label">Trocar por qual?</label>
          <div class="swap-grid" id="swap-grid-options">
            <div class="swap-loading">Selecione um alimento acima...</div>
          </div>
        </div>

        <!-- Ações -->
        <div class="swap-actions">
          <button id="swap-btn-cancel" class="swap-btn-cancel">Cancelar</button>
          <button id="swap-btn-confirm" class="swap-btn-confirm" disabled>Confirmar Troca</button>
        </div>
      </div>
    </div>
  `;

  // 3. Adicionar Lógica e Event Listeners
  const overlay = document.getElementById('swap-overlay');
  const cancelBtn = document.getElementById('swap-btn-cancel');
  const confirmBtn = document.getElementById('swap-btn-confirm');
  
  const foodFromSelect = document.getElementById('swap-food-from');
  const scopeSection = document.getElementById('swap-scope-section');
  const scopeSpecificRadio = document.getElementById('scope-specific');
  const scopeAllRadio = document.getElementById('scope-all');
  const mealScopeSelect = document.getElementById('swap-meal-scope');
  
  const toSection = document.getElementById('swap-to-section');
  const toGrid = document.getElementById('swap-grid-options');
  const toLabel = document.getElementById('swap-to-label');

  let selectedFoodFromId = null;
  let selectedFoodToId = null;

  const closeModal = () => {
    root.style.display = 'none';
    root.innerHTML = '';
  };

  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
  cancelBtn.onclick = closeModal;

  // Rádios do Escopo
  scopeAllRadio.onchange = () => { mealScopeSelect.style.display = 'none'; };
  scopeSpecificRadio.onchange = () => { mealScopeSelect.style.display = 'block'; };

  // Listener principal (Passo 1 -> Passo 2)
  foodFromSelect.onchange = (e) => {
    selectedFoodFromId = e.target.value;
    selectedFoodToId = null; // Reseta a seleção
    confirmBtn.disabled = true;

    if (!selectedFoodFromId) {
      scopeSection.style.display = 'none';
      toSection.style.display = 'none';
      return;
    }

    // Mostra as seções de escopo e substituição
    scopeSection.style.display = 'block';
    toSection.style.display = 'block';
    toGrid.innerHTML = `<div class="swap-loading">Buscando substitutos...</div>`;

    // Busca os substitutos (Conexão com o Cérebro)
    const category = SuperDietEngine.getFoodCategory(selectedFoodFromId);
    if (!category) {
      toGrid.innerHTML = `<div class="swap-loading">Erro: Categoria não encontrada.</div>`;
      return;
    }

    // Encontra o "grupo" de categorias (ex: 'tuberculo' -> 'tuberculo')
    // Esta é a regra principal da troca
    let categoriesToSearch = [category];
    const slotMap = SuperDietEngine.SLOT_MAP || {};
    
    // Agrupa categorias similares para troca
    const categoryGroups = {
        'proteina': ['proteina_main', 'peixe'],
        'carbo_main': ['cereal_main', 'tuberculo', 'leguminosa'],
        'snack_carb': ['snack_carb_cereal', 'snack_carb_pao', 'snack_carb_outro'],
        'snack_prot': ['snack_prot_ovo', 'laticinio_liquido', 'laticinio_cremoso', 'laticinio_solido'],
        'gordura': ['gordura_boa'],
        'fruta': ['fruta']
    };

    let groupFound = null;
    for (const group in categoryGroups) {
        if (categoryGroups[group].includes(category)) {
            groupFound = group;
            break;
        }
    }

    if (groupFound) {
      categoriesToSearch = categoryGroups[groupFound];
      toLabel.textContent = `Trocar por qual? (Grupo: ${groupFound})`;
    } else {
      toLabel.textContent = `Trocar por qual? (Categoria: ${category})`;
    }


    let substitutes = [];
    categoriesToSearch.forEach(cat => {
      substitutes.push(...SuperDietEngine.getFoodsByCategory(cat));
    });
    
    // Filtra o alimento original e duplicados
    const substituteIds = new Set(substitutes.map(f => f.id));
    substituteIds.delete(selectedFoodFromId);
    
    const substituteOptions = Array.from(substituteIds).map(id => SuperDietEngine.findFood(id)).filter(Boolean);

    if (substituteOptions.length === 0) {
      toGrid.innerHTML = `<div class="swap-loading">Nenhum substituto encontrado para este grupo.</div>`;
      return;
    }

    // Popula o Grid (Passo 3)
    toGrid.innerHTML = '';
    substituteOptions.forEach(food => {
      const item = document.createElement('div');
      item.className = 'swap-item';
      item.textContent = stripParenthesis(food.name);
      item.dataset.foodId = food.id;

      item.onclick = () => {
        // Lógica de seleção
        document.querySelectorAll('.swap-item.selected').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        selectedFoodToId = food.id;
        confirmBtn.disabled = false;
      };
      toGrid.appendChild(item);
    });
  };

  // Listener do botão Confirmar
  confirmBtn.onclick = () => {
    if (!selectedFoodFromId || !selectedFoodToId) return;

    const swapScope = document.querySelector('input[name="swap-scope"]:checked').value;
    let finalScope = 'all';
    if (swapScope === 'specific') {
      finalScope = mealScopeSelect.value;
    }

    // Pega o payload que está "vivo" no DOM
    const dietaCard = document.getElementById('dieta-card-content');
    const currentPlan = dietaCard._lastPlan;

    // 1. Executa a troca (modifica o payload em memória)
    const count = performFoodSwap(currentPlan, selectedFoodFromId, selectedFoodToId, finalScope);
    
    if (count > 0) {
      // 2. Salva o payload modificado de volta no elemento DOM
      dietaCard._lastPlan = currentPlan;
      
      // 3. Re-renderiza o plano com os novos dados
      // Encontra o container do mês atual e o payload do mês
      const planView = document.getElementById('plan-view');
      const monthPayload = planView._currentMonthPayload; // Pega o payload do mês salvo no container
      
      if (planView && monthPayload) {
         renderMonth(monthPayload, document.getElementById('plan-content-area'));
      } else {
         // Fallback: re-renderiza tudo (menos eficiente, mas seguro)
         renderGeneratedPlanEditor(dietaCard, currentPlan, planId);
      }
    }

    closeModal();
  };
}

/* ===================================================================
 * INICIALIZAÇÃO DO SCRIPT
 * =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  try {
    SuperDietEngine.init({ supabase }); // Passa o cliente supabase para o Cérebro
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

  // Correção do Bug 1 (Reset)
  if (resetBtn) resetBtn.addEventListener('click', async () => {
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
        await SuperDietEngine.deleteLatestPlan(user.id);
      }
    } catch (err) {
      console.error("Erro ao resetar a meta (deletar plano):", err);
      alert("Erro ao limpar sua meta antiga. Tente novamente.");
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
      if (quaisSupp) quaisSupp.value = '';
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

    // Correção do Bug 2 (Submit)
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
        inputs.goal_type = strategy ? strategy.specificGoal : SuperDietEngine.detectGoalType(objetivoText);

        if(strategy && strategy.nextQuestions && strategy.nextQuestions.length > 0){
          const answers = await showFollowupQuestions(strategy.nextQuestions);
          if(!answers){
            submitButton.disabled = false; submitButton.textContent = 'Crie seu próprio caminho';
            return;
          }
          Object.keys(answers).forEach(k => { inputs[k] = answers[k]; });
        }

        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000*60*60*24));
        const months = Math.max(1, Math.round(diffDays / 30.44));

        // O 'inputs' é passado aqui e salvo como 'profile_snapshot' dentro do plano
        const plan = await SuperDietEngine.generatePlan(inputs, { months, debug: false, strategy });

        const current = await getCurrentUser();
        if(current){
          // Salva o plano na tabela 'user_diets' (o que já funciona)
          await SuperDietEngine.savePlan(current.id, plan, { title: `Plano - ${plan.targets.targetCalories} kcal` });
        }
        
        // Redireciona para a página de Percurso
        window.location.href = 'percurso.html';

      } catch(err){
        console.error('Erro no fluxo de criação da meta:', err);
        alert('Erro ao salvar sua meta: ' + (err.message || JSON.stringify(err)));
        submitButton.disabled = false; submitButton.textContent = 'Crie seu próprio caminho';
      }
    });
  }
  
  
  (async function initializePageData(){
    
    const user = await getCurrentUser();
    const welcomeMsg = document.getElementById('welcome-msg');
    
    if (!user) {
      window.location.replace('/login.html');
      return;
    }
    
    if (welcomeMsg) welcomeMsg.textContent = user.email || user.id;

    // --- Lógica da Página 'membros-saude.html' ---
    const formWrapper = document.getElementById('form-wrapper');
    if (formWrapper) {
      // Estamos na 'membros-saude.html'
      loadFreshDifyChat();
      
      try {
        // Correção do Bug 2 (Carregamento)
        const latestPlan = await fetchLatestUserDiet(); 
        
        if (latestPlan && latestPlan.payload) {
          // SUCESSO: Usuário TEM um plano, esconde formulário
          
          // Pega os dados de progresso do snapshot salvo DENTRO do plano
          const profileData = latestPlan.payload.profile_snapshot;
          
          if (profileData && profileData.goal_start_date && profileData.goal_end_date) {
            displayProgress(new Date(profileData.goal_start_date), new Date(profileData.goal_end_date));
          }
          
          const playlistSection = document.getElementById('playlist-section');
          if (playlistSection && profileData) {
             playlistSection.style.display = profileData.goal_type ? 'block' : 'none';
          }
          
          formWrapper.style.display = 'none';
          document.getElementById('results-wrapper').style.display = 'block';
        } else {
          // SUCESSO: Usuário NÃO tem plano, mostra formulário
          formWrapper.style.display = 'block';
          document.getElementById('results-wrapper').style.display = 'none';
        }
      } catch(e) {
        // Erro? Mostra o formulário por segurança.
        console.error("Erro no initializePageData:", e);
        formWrapper.style.display = 'block';
        document.getElementById('results-wrapper').style.display = 'none';
      }
    }

    // --- Lógica da Página 'percurso.html' ---
    const dietaCard = document.getElementById('dieta-card');
    if (dietaCard) {
      await renderPercursoDietArea(); // Isso vai carregar o plano e o editor

      // (MELHORIA 2) Adiciona o listener para o botão de troca
      const foodSwapBtn = document.getElementById('food-swap-btn');
      if (foodSwapBtn) {
        foodSwapBtn.addEventListener('click', () => {
          const dietaCardContent = document.getElementById('dieta-card-content');
          const currentPlan = dietaCardContent._lastPlan; // Pega o plano atual do DOM
          const latest = dietaCardContent._latestDBRecord; // Pega o ID do registro
          
          if (currentPlan && latest) {
            showFoodSwapModal(currentPlan, latest.id);
          } else {
            console.error('Não foi possível carregar o plano para edição.', currentPlan, latest);
            alert('Não foi possível carregar o plano para edição.');
          }
        });
      }
    }
    
  })(); // Fim da inicialização da página

}); // Fim do DOMContentLoaded
