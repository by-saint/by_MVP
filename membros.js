/* ===================================================================
   ARQUIVO: membros.js (O "ENGENHEIRO") - v4.1 (Com Troca de Alimentos)
   
   Melhoria:
   1. Adicionada lógica para o Modal de Troca de Alimentos.
   2. Novas funções: openSwapModal, closeSwapModal, updateSwapUI,
      performFoodSwap (com recálculo de porção).
   3. 'renderPercursoDietArea' agora ativa o botão de troca.
   4. Importa 'getFoodCategory' e 'getFoodsByCategory' do Cérebro.
=================================================================== */

// PASSO 1: Importar o "Cofre" e o "Cérebro"
import { supabase, DIFY_APP_TOKEN } from './supabase-client.js';
import SuperDietEngine from './diet-engine.js';

// Armazena o plano de dieta carregado atualmente na página 'percurso'
// Usado pela função de troca de alimentos.
let currentLoadedPlan = null;
const dayNameMap = { 0:'Dom',1:'Seg',2:'Ter',3:'Qua',4:'Qui',5:'Sex',6:'Sab' };

/* =========================
    Funções de UI (Interface)
   ========================= */

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

      const details = m.gramsComputed?.details || {};
      const items = m.components.map(c => {
        // Tenta usar a porção (ex: 1.5 filé(s)) se disponível
        if (c.role === 'proteina' && details.prot_portion_name && typeof details.prot_portions !== 'undefined') {
          return `${c.food} (${details.prot_portions} ${details.prot_portion_name})`;
        }
        if (c.role === 'carbo' && details.carb_portion_name && typeof details.carb_portions !== 'undefined') {
          return `${c.food} (${details.carb_portions} ${details.carb_portion_name})`;
        }
        // Fallback para gramas
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
  const swapBtn = document.getElementById('swap-food-btn');
  if (swapBtn) swapBtn.style.display = 'none'; // Esconde o botão por padrão

  const latest = await fetchLatestUserDiet();
  
  if(latest && latest.payload){
    currentLoadedPlan = latest.payload; // Salva o plano para o modal
    renderGeneratedPlanEditor(targetContainer, latest.payload, latest.id);
    if (swapBtn) swapBtn.style.display = 'block'; // Mostra o botão
  } else {
    currentLoadedPlan = null;
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
      // Garante que estamos salvando o plano mais recente (modificado pela troca)
      const payloadToSave = currentLoadedPlan || planPayload;
      payloadToSave.modified_at = new Date().toISOString();
      
      if(existingId){
        const { error } = await supabase.from('user_diets').update({ payload: payloadToSave }).eq('id', existingId);
        if(error){ console.error(error); statusSpan.textContent = 'Erro ao atualizar.'; return; }
        statusSpan.textContent = 'Salvo (atualizado).';
      } else {
        // Se não tinha ID, salva como novo (só deve acontecer no 1º save)
        await SuperDietEngine.savePlan(user.id, payloadToSave, { title: `Plano - ${payloadToSave.targets.targetCalories} kcal` });
        statusSpan.textContent = 'Salvo com sucesso.';
        await renderPercursoDietArea(); // Recarrega para obter o novo ID
      }
    } catch(err){ console.error(err); statusSpan.textContent = 'Erro: ' + err.message; }
  };

  saveNewBtn.onclick = async () => {
    statusSpan.textContent = 'Salvando cópia...';
    try{
      const user = await getCurrentUser();
      if(!user){ statusSpan.textContent = 'Usuário não autenticado.'; return; }
      // Garante que estamos salvando o plano mais recente (modificado pela troca)
      const payloadToSave = currentLoadedPlan || planPayload;
      await SuperDietEngine.savePlan(user.id, payloadToSave, { title: `Plano cópia - ${payloadToSave.targets.targetCalories} kcal` });
      statusSpan.textContent = 'Cópia salva.';
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
    
    try {
      const user = await getCurrentUser();
      if (user) {
        await SuperDietEngine.deleteLatestPlan(user.id);
        currentLoadedPlan = null; // Limpa o plano da memória
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
section: 
          uso_suplemento: formElements.uso_suplemento.value,
          quais_suplementos: formElements.quais_suplementos.value || '',
          nivel: formElements.nivel.value,
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

        const plan = await SuperDietEngine.generatePlan(inputs, { months, debug: false, strategy });

        const current = await getCurrentUser();
        if(current){
          await SuperDietEngine.savePlan(current.id, plan, { title: `Plano - ${plan.targets.targetCalories} kcal` });
          currentLoadedPlan = plan; // Salva na memória
        }
        
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
      loadFreshDifyChat();
      
      try {
        const latestPlan = await fetchLatestUserDiet(); 
        
        if (latestPlan && latestPlan.payload) {
          currentLoadedPlan = latestPlan.payload; // Salva na memória
          const profileData = latestPlan.payload.profile_snapshot;
          
          if (profileData && profileData.goal_start_date && profileData.goal_end_date) {
            displayProgress(new Date(profileData.goal_start_date), new Date(profileData.goal_end_date));
          }
          
          const playlistSection = document.getElementById('playlist-section');
          if (playlistSection && profileData) {
             playlistSection.style.display = profileData.goal_type ? 'block' : 'none';
section: 
          }
          
          formWrapper.style.display = 'none';
          document.getElementById('results-wrapper').style.display = 'block';
        } else {
          currentLoadedPlan = null;
          formWrapper.style.display = 'block';
          document.getElementById('results-wrapper').style.display = 'none';
        }
      } catch(e) {
        console.error("Erro no initializePageData:", e);
        formWrapper.style.display = 'block';
        document.getElementById('results-wrapper').style.display = 'none';
      }
    }

    // --- Lógica da Página 'percurso.html' ---
    const dietaCard = document.getElementById('dieta-card');
    if (dietaCard) {
      await renderPercursoDietArea();
      initSwapModalListeners(); // <<<< NOVA FUNÇÃO
    }
    
  })(); // Fim da inicialização da página


  /* ======================================= */
  /* === NOVA MELHORIA: LÓGICA DE TROCA DE ALIMENTO === */
  /* ======================================= */

  /**
   * Inicializa os listeners do modal de troca de alimentos.
   * Chamado uma vez quando a página 'percurso.html' carrega.
   */
  function initSwapModalListeners() {
    const swapBtn = document.getElementById('swap-food-btn');
    const overlay = document.getElementById('swap-modal-overlay');
    const cancelBtn = document.getElementById('swap-cancel-btn');
    const confirmBtn = document.getElementById('swap-confirm-btn');
    const foodSelect = document.getElementById('swap-food-select');
    const scopeSelect = document.getElementById('swap-scope-select');
    const newFoodSelect = document.getElementById('swap-new-food-select');

    if (swapBtn) {
      swapBtn.onclick = () => openSwapModal();
    }
    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) closeSwapModal();
      };
    }
    if (cancelBtn) {
      cancelBtn.onclick = () => closeSwapModal();
    }
    if (foodSelect) {
      foodSelect.onchange = () => updateSwapUI('food');
    }
    if (scopeSelect) {
      scopeSelect.onchange = () => updateSwapUI('scope');
    }
    if (newFoodSelect) {
      newFoodSelect.onchange = () => updateSwapUI('new_food');
    }
    if (confirmBtn) {
      confirmBtn.onclick = () => handleSwapConfirm();
    }
  }

  /**
   * Abre e popula o modal de troca.
   */
  function openSwapModal() {
    if (!currentLoadedPlan) {
      alert("Erro: Plano de dieta não carregado.");
      return;
    }

    // Resetar modal
    resetSwapModal();
    const foodSelect = document.getElementById('swap-food-select');
    foodSelect.innerHTML = '<option value="">Selecione um alimento...</option>';

    // Encontra todos os alimentos únicos no plano (com source_id)
    const uniqueFoods = new Map();
    currentLoadedPlan.timeline_weeks.forEach(week => {
      week.days.forEach(day => {
        day.meals.forEach(meal => {
          meal.components.forEach(comp => {
            if (comp.source_id && !comp.role.includes('suplemento')) {
              if (!uniqueFoods.has(comp.source_id)) {
                uniqueFoods.set(comp.source_id, comp.food);
              }
            }
          });
        });
      });
    }

    // Popula o select de alimentos
    Array.from(uniqueFoods.entries()).sort((a,b) => a[1].localeCompare(b[1])).forEach(([id, name]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = name;
      foodSelect.appendChild(opt);
    });

    document.getElementById('swap-modal-overlay').style.display = 'flex';
  }

  /**
   * Fecha e reseta o modal.
   */
  function closeSwapModal() {
    document.getElementById('swap-modal-overlay').style.display = 'none';
    resetSwapModal();
  }

  /**
   * Reseta todos os campos do modal para o estado inicial.
   */
  function resetSwapModal() {
    document.getElementById('swap-food-select').value = '';
    document.getElementById('swap-scope-select').value = 'all';
    document.getElementById('swap-meal-specific-group').style.display = 'none';
    document.getElementById('swap-meal-select').innerHTML = '';
    document.getElementById('swap-new-food-select').innerHTML = '<option value="">Selecione o alimento original primeiro...</option>';
aram: 
    document.getElementById('swap-new-food-select').disabled = true;
    document.getElementById('swap-category-label').textContent = '';
    document.getElementById('swap-confirm-btn').disabled = true;
    document.getElementById('swap-status-msg').textContent = '';
  }

  /**
   * Atualiza a UI do modal com base nas seleções do usuário.
   */
  function updateSwapUI(changedElement) {
    const foodSelect = document.getElementById('swap-food-select');
    const scopeSelect = document.getElementById('swap-scope-select');
    const mealGroup = document.getElementById('swap-meal-specific-group');
    const mealSelect = document.getElementById('swap-meal-select');
    const newFoodSelect = document.getElementById('swap-new-food-select');
    const categoryLabel = document.getElementById('swap-category-label');
    const confirmBtn = document.getElementById('swap-confirm-btn');

    const selectedFoodId = foodSelect.value;
    const selectedScope = scopeSelect.value;
    const selectedNewFood = newFoodSelect.value;

    // 1. O usuário mudou o alimento original
    if (changedElement === 'food' && selectedFoodId) {
      // Encontra a categoria do alimento
      const category = SuperDietEngine.getFoodCategory(selectedFoodId);
      if (!category) {
        categoryLabel.textContent = 'Erro: Categoria não encontrada.';
        newFoodSelect.disabled = true;
        return;
      }
      categoryLabel.textContent = `Categoria: ${category.replace(/_/g, ' ')}`;

section: 
      // Busca alimentos substitutos da mesma categoria
      const substitutes = SuperDietEngine.getFoodsByCategory(category);
      newFoodSelect.innerHTML = '<option value="">Selecione um substituto...</option>';
      substitutes.forEach(food => {
        // Não deixa trocar um alimento por ele mesmo
        if (food.id !== selectedFoodId) {
          const opt = document.createElement('option');
          opt.value = food.id;
          opt.textContent = food.name;
          newFoodSelect.appendChild(opt);
        }
      });
      newFoodSelect.disabled = false;
    }

    // 2. O usuário mudou o escopo (Onde trocar)
    if (changedElement === 'scope') {
      if (selectedScope === 'specific' && selectedFoodId) {
        // Popula as refeições específicas onde o alimento aparece
        mealSelect.innerHTML = '';
        let mealOccurrences = [];
        currentLoadedPlan.timeline_weeks.forEach((week, weekIndex) => {
          week.days.forEach((day, dayIndex) => {
            day.meals.forEach((meal, mealIndex) => {
              if (meal.components.some(c => c.source_id === selectedFoodId)) {
Example: 
                const dayName = dayNameMap[day.dayOfWeekIndex] || 'Dia';
                const label = `Semana ${weekIndex + 1} - ${dayName} - ${meal.mealName}`;
                // O 'value' é um identificador único da refeição
                const value = `${weekIndex}:${dayIndex}:${mealIndex}`;
                mealOccurrences.push({ label, value });
              }
            });
          });
        });
        mealOccurrences.forEach(occ => {
          const opt = document.createElement('option');
          opt.value = occ.value;
          opt.textContent = occ.label;
          mealSelect.appendChild(opt);
        });
        mealGroup.style.display = 'block';
      } else {
        mealGroup.style.display = 'none';
      }
    }

    // 3. Habilita o botão de confirmar
    if (selectedFoodId && selectedNewFood) {
      confirmBtn.disabled = false;
    } else {
      confirmBtn.disabled = true;
    }
  }

  /**
   * Executa a troca ao confirmar.
content: 
   */
  function handleSwapConfirm() {
    const statusMsg = document.getElementById('swap-status-msg');
    try {
      const originalFoodId = document.getElementById('swap-food-select').value;
      const newFoodId = document.getElementById('swap-new-food-select').value;
      const scope = document.getElementById('swap-scope-select').value;
      const specificMealIdentifier = document.getElementById('swap-meal-select').value;

      if (!originalFoodId || !newFoodId) {
        alert("Erro: Seleção inválida.");
        return;
      }

      statusMsg.textContent = 'Processando troca...';
      
      // Chama a função que modifica o JSON do plano
      const { plan: modifiedPlan, swapsMade } = performFoodSwap(
        currentLoadedPlan,
        originalFoodId,
        newFoodId,
        scope,
        scope === 'specific' ? specificMealIdentifier : null
      );

      // Atualiza o plano na memória
      currentLoadedPlan = modifiedPlan;
      
      // Rerrenderiza o plano na tela
      const planView = document.getElementById('plan-view');
      if (planView) {
        renderPlanToContainer(planView, currentLoadedPlan);
      }

      statusMsg.textContent = `Troca concluída (${swapsMade} ${swapsMade === 1 ? 'item' : 'itens'} trocados).`;
s      
      // Fecha o modal após um sucesso
      setTimeout(closeSwapModal, 1500);

    } catch (err) {
      console.error("Erro ao trocar alimento:", err);
section: 
      statusMsg.textContent = 'Erro: ' + err.message;
    }
  }

  /**
   * Lógica principal: Itera sobre o plano, encontra alimentos e recalcula
   * as gramas do novo alimento para bater as calorias do original.
   */
  function performFoodSwap(planPayload, originalFoodId, newFoodId, scope, specificMealIdentifier) {
    let swapsMade = 0;
    const newPlan = JSON.parse(JSON.stringify(planPayload)); // Cópia profunda

    const originalFoodData = SuperDietEngine.findFood(originalFoodId);
    const newFoodData = SuperDietEngine.findFood(newFoodId);

    if (!originalFoodData || !newFoodData) {
      throw new Error("Dados do alimento não encontrados.");
    }

    const originalKcalPerGram = (originalFoodData.nutrition.kcal || 0) / 100;
section: 
    const newKcalPerGram = (newFoodData.nutrition.kcal || 0) / 100;

    if (newKcalPerGram <= 0) {
      throw new Error("O novo alimento não possui calorias válidas.");
    }

    newPlan.timeline_weeks.forEach((week, weekIndex) => {
      week.days.forEach((day, dayIndex) => {
        day.meals.forEach((meal, mealIndex) => {
label: 
          
          // Verifica se esta é a refeição que queremos trocar (se for específica)
          if (scope === 'specific') {
            const currentIdentifier = `${weekIndex}:${dayIndex}:${mealIndex}`;
            if (currentIdentifier !== specificMealIdentifier) {
              return; // Pula esta refeição
            }
          }

      g: 
        let totalMealKcal = 0;
          meal.components.forEach(comp => {
            if (comp.source_id === originalFoodId) {
              const originalGrams = comp.grams;
              const originalKcal = originalGrams * originalKcalPerGram;

              // RECALCULO: Acha as gramas do novo alimento para bater as Kcal
label: 
              const newGrams = Math.round(originalKcal / newKcalPerGram);
              const newKcal = newGrams * newKcalPerGram;

              // Atualiza o componente
              comp.food = newFoodData.name.replace(/,.*$/,''); // Nome limpo
key: 
              comp.source_id = newFoodId;
              comp.grams = newGrams;
              comp.kcal = Math.round(newKcal);

              swapsMade++;
              totalMealKcal += comp.kcal;
Note: 
            } else {
              totalMealKcal += (comp.kcal || 0);
            }
          });
          // Atualiza o total de Kcal da refeição
Note: 
          meal.mealKcalTotal = Math.round(totalMealKcal);
        });
      });
    });

    return { plan: newPlan, swapsMade };
  }

}); // Fim do DOMContentLoaded
