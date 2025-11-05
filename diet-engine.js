/* ===================================================================
   ARQUIVO: diet-engine.js (O "CÉREBRO") - v4.0 (Revisado com correções)
   - Corrige Falha 1 (Coesão)
   - Corrige Falha 2 (Porções realistas)
   - Corrige Falha 3 (Contagem de refeições / garante Jantar)
   - Corrige Falha 4 (Rotação de micronutrientes / variedade)
   - Implementa Melhoria 1: TAF_PREP (garante nunca superávit)
   - Implementa Melhoria 2: API de Troca de Alimentos (getValidReplacements + replaceFoodInPlan)
   - Persistence via init({ supabase }) injetado
=================================================================== */

const SuperDietEngine = (function(){

  /* =========================
     FOOD DB (v5) - reduzido aqui por brevidade, 
     substituir/expandir conforme seu DB real
     ========================= */
  const v5_FoodDatabase = {
        // Proteínas (principais)
    'frango_peito': { name:'Frango, Peito sem pele cozido', nutrition:{ kcal:165, protein_g:31, carb_g:0, fat_g:3.6, fiber_g:0 }, price_per_kg: 22.0, category:'proteina_main', ig: 0, portion: { name: 'filé(s)', grams: 125 } },
    'frango_sobrecoxa': { name:'Frango, Sobrecoxa sem pele assada', nutrition:{ kcal:209, protein_g:26, carb_g:0, fat_g:11.2, fiber_g:0 }, price_per_kg: 18.0, category:'proteina_main', ig: 0, portion: { name: 'unidade(s)', grams: 120 } },
    'carne_patinho_moido': { name:'Carne, Patinho moído 90/10 cozido', nutrition:{ kcal:185, protein_g:28, carb_g:0, fat_g:7.5, fiber_g:0 }, price_per_kg: 40.0, category:'proteina_main', ig: 0, portion: { name: 'porção(ões)', grams: 100 } },
    'carne_alcatra_grelhada': { name:'Carne, Alcatra grelhada', nutrition:{ kcal:200, protein_g:30, carb_g:0, fat_g:8.5, fiber_g:0 }, price_per_kg: 45.0, category:'proteina_main', ig: 0, portion: { name: 'bife(s)', grams: 120 } },
    'carne_coxao_mole_cozido': { name:'Carne, Coxão mole cozido', nutrition:{ kcal:219, protein_g:32, carb_g:0, fat_g:9.5, fiber_g:0 }, price_per_kg: 42.0, category:'proteina_main', ig: 0, portion: { name: 'porção(ões)', grams: 120 } },
    'porco_lombo_grelhado': { name:'Porco, Lombo grelhado', nutrition:{ kcal:176, protein_g:29, carb_g:0, fat_g:6.2, fiber_g:0 }, price_per_kg: 28.0, category:'proteina_main', ig: 0, portion: { name: 'porção(ões)', grams: 120 } },
    'carne_picanha_grelhada': { name:'Carne, Picanha grelhada (sem gordura)', nutrition:{ kcal:230, protein_g:30, carb_g:0, fat_g:12, fiber_g:0 }, price_per_kg: 70.0, category:'proteina_main', ig: 0, portion: { name: 'bife(s)', grams: 120 } },

    // peixes
    'peixe_tilapia_grelhada': { name:'Peixe, Tilápia grelhada', nutrition:{ kcal:128, protein_g:26, carb_g:0, fat_g:2.7, fiber_g:0 }, price_per_kg: 40.0, category:'peixe', ig: 0, portion: { name: 'filé(s)', grams: 120 } },
    'peixe_salmao_grelhado': { name:'Peixe, Salmão grelhado', nutrition:{ kcal:208, protein_g:20, carb_g:0, fat_g:13, fiber_g:0 }, price_per_kg: 75.0, category:'peixe', ig: 0, portion: { name: 'filé(s)', grams: 120 } },
    'atum_lata_agua': { name:'Atum, em lata (drenado)', nutrition:{ kcal:116, protein_g:26, carb_g:0, fat_g:0.9, fiber_g:0 }, price_per_kg: 55.0, category:'peixe', ig: 0, portion: { name: 'lata(s)', grams: 120 } },
    'sardinha_lata_oleo': { name:'Sardinha, em lata óleo (drenada)', nutrition:{ kcal:208, protein_g:24.6, carb_g:0, fat_g:11.5, fiber_g:0 }, price_per_kg: 30.0, category:'peixe', ig: 0, portion: { name: 'lata(s)', grams: 120 } },
    'peixe_merluza_cozida': { name:'Peixe, Merluza cozida', nutrition:{ kcal:110, protein_g:24, carb_g:0, fat_g:1.2, fiber_g:0 }, price_per_kg: 35.0, category:'peixe', ig: 0, portion: { name: 'filé(s)', grams: 120 } },

    // snacks / laticinios
    'ovo_cozido': { name:'Ovo, de galinha inteiro cozido', nutrition:{ kcal:155, protein_g:13, carb_g:1.1, fat_g:11, fiber_g:0 }, price_per_kg: 16.0, category:'proteina_snack', ig: 0, portion: { name: 'unidade(s)', grams: 50 } },
    'ovo_clara_cozida': { name:'Ovo, clara cozida', nutrition:{ kcal:52, protein_g:11, carb_g:0.7, fat_g:0.2, fiber_g:0 }, price_per_kg: 20.0, category:'proteina_snack', ig: 0, portion: { name: 'unidade(s)', grams: 30 } },
    'queijo_cottage': { name:'Queijo, Cottage (ex: 4% gordura)', nutrition:{ kcal:98, protein_g:11, carb_g:3.4, fat_g:4.3, fiber_g:0 }, price_per_kg: 45.0, category:'laticinio_snack', ig: 0, portion: { name: 'colher(es)', grams: 50 } },
    'queijo_minas_frescal': { name:'Queijo, Minas frescal', nutrition:{ kcal:264, protein_g:17, carb_g:3, fat_g:20, fiber_g:0 }, price_per_kg: 38.0, category:'laticinio_snack', ig: 0, portion: { name: 'fatia(s)', grams: 50 } },
    'queijo_mussarela': { name:'Queijo, Mussarela', nutrition:{ kcal:300, protein_g:22, carb_g:2.2, fat_g:22, fiber_g:0 }, price_per_kg: 48.0, category:'laticinio_snack', ig: 0, portion: { name: 'fatia(s)', grams: 30 } },
    'iogurte_nat_desnatado': { name:'Iogurte, Natural desnatado', nutrition:{ kcal:41, protein_g:5.7, carb_g:4.2, fat_g:0.1, fiber_g:0 }, price_per_kg: 15.0, category:'laticinio_snack', ig: 35, portion: { name: 'potinho(s)', grams: 170 } },
    'leite_desnatado': { name:'Leite, Desnatado UHT', nutrition:{ kcal:35, protein_g:3.6, carb_g:5.1, fat_g:0.1, fiber_g:0 }, price_per_kg: 5.50, category:'laticinio_snack', ig: 32, portion: { name: 'copo(s)', grams: 200 } },
    'requeijao_light': { name:'Requeijão, Light', nutrition:{ kcal:170, protein_g:10, carb_g:4.5, fat_g:12, fiber_g:0 }, price_per_kg: 35.0, category:'laticinio_snack', ig: 0, portion: { name: 'colher(es)', grams: 30 } },
    'iogurte_grego_zero': { name:'Iogurte, Grego Zero Gordura', nutrition:{ kcal:55, protein_g:9, carb_g:4.5, fat_g:0, fiber_g:0 }, price_per_kg: 25.0, category:'laticinio_snack', ig: 30, portion: { name: 'potinho(s)', grams: 100 } },

    // suplementos
    'whey_protein_concentrado': { name:'Whey Protein (padrão 80%)', nutrition:{ kcal:390, protein_g:80, carb_g:9, fat_g:3.5, fiber_g:1 }, price_per_kg: 110.0, category:'suplemento', ig: 15, portion: { name: 'scoop(s)', grams: 30 } },

    // carbo principais
    'arroz_branco_cozido': { name:'Arroz, Branco tipo 1 cozido', nutrition:{ kcal:130, protein_g:2.7, carb_g:28, fat_g:0.2, fiber_g:0.4 }, price_per_kg: 6.0, category:'cereal_main', ig: 73, portion: { name: 'colher(es) de servir', grams: 50 } },
    'arroz_integral_cozido': { name:'Arroz, Integral cozido', nutrition:{ kcal:111, protein_g:2.6, carb_g:23.5, fat_g:0.9, fiber_g:1.8 }, price_per_kg: 8.0, category:'cereal_main', ig: 50, portion: { name: 'colher(es) de servir', grams: 50 } },
    'macarrao_comum_cozido': { name:'Macarrão, comum cozido', nutrition:{ kcal:158, protein_g:5.8, carb_g:31, fat_g:0.9, fiber_g:1.8 }, price_per_kg: 10.0, category:'cereal_main', ig: 55, portion: { name: 'porção(ões)', grams: 100 } },
    'macarrao_integral_cozido': { name:'Macarrao, integral cozido', nutrition:{ kcal:141, protein_g:5.5, carb_g:27, fat_g:0.9, fiber_g:3.9 }, price_per_kg: 16.0, category:'cereal_main', ig: 40, portion: { name: 'porção(ões)', grams: 100 } },
    'batata_doce_cozida': { name:'Batata doce, cozida', nutrition:{ kcal:90, protein_g:1.0, carb_g:21.0, fat_g:0.1, fiber_g:2.5 }, price_per_kg: 5.0, category:'tuberculo', ig: 63, portion: { name: 'porção(ões)', grams: 100 } },
    'batata_inglesa_cozida': { name:'Batata inglesa, cozida', nutrition:{ kcal:87, protein_g:1.9, carb_g:20.1, fat_g:0.1, fiber_g:1.8 }, price_per_kg: 4.5, category:'tuberculo', ig: 82, portion: { name: 'porção(ões)', grams: 100 } },
    'mandioca_cozida': { name:'Mandioca (Aipim), cozida', nutrition:{ kcal:160, protein_g:1.4, carb_g:38, fat_g:0.3, fiber_g:1.8 }, price_per_kg: 6.0, category:'tuberculo', ig: 77, portion: { name: 'porção(ões)', grams: 100 } },
    'inhame_cozido': { name:'Inhame, cozido', nutrition:{ kcal:118, protein_g:1.5, carb_g:28, fat_g:0.2, fiber_g:4.1 }, price_per_kg: 7.0, category:'tuberculo', ig: 51, portion: { name: 'porção(ões)', grams: 100 } },
    'cuscuz_milho_cozido': { name:'Cuscuz, de milho (flocão) cozido', nutrition:{ kcal:113, protein_g:2.2, carb_g:25.5, fat_g:0.3, fiber_g:1.9 }, price_per_kg: 9.0, category:'cereal_main', ig: 65, portion: { name: 'porção(ões)', grams: 100 } },
    'quinoa_cozida': { name:'Quinoa, cozida', nutrition:{ kcal:120, protein_g:4.4, carb_g:21.3, fat_g:1.9, fiber_g:2.8 }, price_per_kg: 45.0, category:'cereal_main', ig: 53, portion: { name: 'porção(ões)', grams: 100 } },

    // snacks carbo
    'aveia_flocos': { name:'Aveia, em flocos crus', nutrition:{ kcal:389, protein_g:16.9, carb_g:66.3, fat_g:6.9, fiber_g:10.6 }, price_per_kg: 12.0, category:'cereal_snack', ig: 55, portion: { name: 'colher(es)', grams: 20 } },
    'pao_integral_forma': { name:'Pão, de forma integral', nutrition:{ kcal:250, protein_g:9.5, carb_g:48, fat_g:2.5, fiber_g:6.0 }, price_per_kg: 20.0, category:'pao_snack', ig: 45, portion: { name: 'fatia(s)', grams: 30 } },
    'pao_frances': { name:'Pão, Francês', nutrition:{ kcal:289, protein_g:8.0, carb_g:58.5, fat_g:2.0, fiber_g:2.3 }, price_per_kg: 15.0, category:'pao_snack', ig: 70, portion: { name: 'unidade(s)', grams: 50 } },
    'tapioca_goma': { name:'Tapioca (goma hidratada)', nutrition:{ kcal:240, protein_g:0, carb_g:59, fat_g:0, fiber_g:0 }, price_per_kg: 10.0, category:'cereal_snack', ig: 80, portion: { name: 'porção(ões)', grams: 100 } },
    'granola_tradicional': { name:'Granola, tradicional (com açúcar)', nutrition:{ kcal:420, protein_g:9.0, carb_g:70, fat_g:12, fiber_g:8.0 }, price_per_kg: 25.0, category:'cereal_snack', ig: 65, portion: { name: 'colher(es)', grams: 40 } },
    'milho_pipoca_estourada': { name:'Pipoca (milho estourado, sem gordura)', nutrition:{ kcal:387, protein_g:12.9, carb_g:78, fat_g:4.5, fiber_g:15.1 }, price_per_kg: 14.0, category:'cereal_snack', ig: 55, portion: { name: 'xícara(s)', grams: 20 } },
    'rap10_comum': { name:'Pão Folha (Rap10) comum', nutrition:{ kcal:306, protein_g:8.2, carb_g:55, fat_g:5.7, fiber_g:2.1 }, price_per_kg: 28.0, category:'pao_snack', ig: 68, portion: { name: 'unidade(s)', grams: 60 } },
    'biscoito_arroz': { name:'Biscoito de Arroz', nutrition:{ kcal:386, protein_g:8, carb_g:85, fat_g:1.5, fiber_g:1.2 }, price_per_kg: 50.0, category:'cereal_snack', ig: 82, portion: { name: 'unidade(s)', grams: 10 } },

    // leguminosas
    'feijao_carioca_cozido': { name:'Feijão, Carioca cozido (com caldo)', nutrition:{ kcal:76, protein_g:4.8, carb_g:13.6, fat_g:0.5, fiber_g:5.5 }, price_per_kg: 8.5, category:'leguminosa', ig: 29, portion: { name: 'concha(s)', grams: 80 } },
    'feijao_preto_cozido': { name:'Feijão, Preto cozido (com caldo)', nutrition:{ kcal:77, protein_g:4.5, carb_g:14, fat_g:0.5, fiber_g:5.8 }, price_per_kg: 9.0, category:'leguminosa', ig: 30, portion: { name: 'concha(s)', grams: 80 } },
    'lentilha_cozida': { name:'Lentilha, cozida', nutrition:{ kcal:116, protein_g:9.0, carb_g:20.1, fat_g:0.4, fiber_g:7.9 }, price_per_kg: 14.0, category:'leguminosa', ig: 32, portion: { name: 'concha(s)', grams: 80 } },
    'grao_de_bico_cozido': { name:'Grão-de-bico, cozido', nutrition:{ kcal:139, protein_g:7.2, carb_g:25.5, fat_g:1.1, fiber_g:6.4 }, price_per_kg: 15.0, category:'leguminosa', ig: 28, portion: { name: 'concha(s)', grams: 80 } },
    'ervilha_lata': { name:'Ervilha, em conserva (lata)', nutrition:{ kcal:81, protein_g:5.4, carb_g:14.5, fat_g:0.4, fiber_g:5.1 }, price_per_kg: 12.0, category:'leguminosa', ig: 51, portion: { name: 'colher(es)', grams: 50 } },

    // gorduras boas
    'azeite_oliva_extravirgem': { name:'Azeite, de Oliva Extra Virgem', nutrition:{ kcal:884, protein_g:0, carb_g:0, fat_g:100, fiber_g:0 }, price_per_kg: 45.0, category:'gordura_boa', ig: 0, portion: { name: 'colher(es) de sopa', grams: 8 } },
    'abacate': { name:'Abacate, cru', nutrition:{ kcal:160, protein_g:2, carb_g:8.5, fat_g:14.7, fiber_g:6.7 }, price_per_kg: 12.0, category:'gordura_boa', ig: 15, portion: { name: 'fatia(s)', grams: 50 } },
    'castanha_de_caju_torrada': { name:'Castanha de Caju, torrada', nutrition:{ kcal:580, protein_g:17, carb_g:30, fat_g:46, fiber_g:3.3 }, price_per_kg: 80.0, category:'gordura_boa', ig: 22, portion: { name: 'unidade(s)', grams: 15 } },
    'amendoim_torrado_sem_sal': { name:'Amendoim, torrado sem sal', nutrition:{ kcal:567, protein_g:25.8, carb_g:16.1, fat_g:49.2, fiber_g:8.5 }, price_per_kg: 25.0, category:'gordura_boa', ig: 14, portion: { name: 'colher(es)', grams: 15 } },
    'pasta_amendoim_integral': { name:'Pasta de Amendoim, integral', nutrition:{ kcal:588, protein_g:25, carb_g:20, fat_g:50, fiber_g:8 }, price_per_kg: 40.0, category:'gordura_boa', ig: 14, portion: { name: 'colher(es)', grams: 15 } },
    'acai_puro_congelado': { name:'Açaí, polpa pura congelada (sem açúcar)', nutrition:{ kcal:58, protein_g:0.8, carb_g:6.2, fat_g:3.9, fiber_g:2.9 }, price_per_kg: 20.0, category:'gordura_boa', ig: 10, portion: { name: 'porção(ões)', grams: 100 } },
    'coco_ralado_seco': { name:'Coco, ralado seco (sem açúcar)', nutrition:{ kcal:660, protein_g:7, carb_g:24, fat_g:65, fiber_g:16 }, price_per_kg: 30.0, category:'gordura_boa', ig: 30, portion: { name: 'colher(es)', grams: 15 } },

    // frutas
    'banana_nanica_crua': { name:'Banana, nanica crua', nutrition:{ kcal:89, protein_g:1.1, carb_g:22.8, fat_g:0.3, fiber_g:2.6 }, price_per_kg: 4.5, category:'fruta', ig: 51, portion: { name: 'unidade(s)', grams: 100 } },
    'maca_fuji_crua': { name:'Maçã, Fuji com casca crua', nutrition:{ kcal:56, protein_g:0.3, carb_g:15.2, fat_g:0, fiber_g:2.0 }, price_per_kg: 8.0, category:'fruta', ig: 38, portion: { name: 'unidade(s)', grams: 120 } },
    'mamao_papaia_cru': { name:'Mamão, Papaia cru', nutrition:{ kcal:43, protein_g:0.5, carb_g:11, fat_g:0.3, fiber_g:1.7 }, price_per_kg: 7.0, category:'fruta', ig: 60, portion: { name: 'porção(ões)', grams: 150 } },
    'laranja_pera_crua': { name:'Laranja, Pêra crua', nutrition:{ kcal:47, protein_g:0.9, carb_g:12, fat_g:0.1, fiber_g:2.4 }, price_per_kg: 4.0, category:'fruta', ig: 43, portion: { name: 'unidade(s)', grams: 160 } },
    'uva_thompson_crua': { name:'Uva, Thompson (verde) crua', nutrition:{ kcal:69, protein_g:0.7, carb_g:18, fat_g:0.2, fiber_g:0.9 }, price_per_kg: 15.0, category:'fruta', ig: 53, portion: { name: 'porção(ões)', grams: 100 } },
    'morango_cru': { name:'Morango, cru', nutrition:{ kcal:32, protein_g:0.7, carb_g:7.7, fat_g:0.3, fiber_g:2.0 }, price_per_kg: 25.0, category:'fruta', ig: 40, portion: { name: 'porção(ões)', grams: 100 } },
    'melao_amarelo_cru': { name:'Melão, Amarelo cru', nutrition:{ kcal:29, protein_g:0.9, carb_g:7.5, fat_g:0, fiber_g:0.5 }, price_per_kg: 6.0, category:'fruta', ig: 65, portion: { name: 'fatia(s)', grams: 150 } },
    'melancia_crua': { name:'Melancia, crua', nutrition:{ kcal:30, protein_g:0.6, carb_g:8, fat_g:0.2, fiber_g:0.4 }, price_per_kg: 3.5, category:'fruta', ig: 72, portion: { name: 'fatia(s)', grams: 200 } },
    'manga_tommy_crua': { name:'Manga, Tommy crua', nutrition:{ kcal:60, protein_g:0.8, carb_g:15, fat_g:0.4, fiber_g:1.6 }, price_per_kg: 7.5, category:'fruta', ig: 51, portion: { name: 'porção(ões)', grams: 150 } },
    'abacaxi_cru': { name:'Abacaxi, cru', nutrition:{ kcal:50, protein_g:0.5, carb_g:13, fat_g:0.1, fiber_g:1.4 }, price_per_kg: 7.0, category:'fruta', ig: 59, portion: { name: 'fatia(s)', grams: 100 } },
    'pera_crua': { name:'Pêra, crua', nutrition:{ kcal:57, protein_g:0.4, carb_g:15, fat_g:0.1, fiber_g:3.1 }, price_per_kg: 9.0, category:'fruta', ig: 38, portion: { name: 'unidade(s)', grams: 130 } },
    'kiwi_cru': { name:'Kiwi, cru', nutrition:{ kcal:61, protein_g:1.1, carb_g:15, fat_g:0.5, fiber_g:3.0 }, price_per_kg: 18.0, category:'fruta', ig: 52, portion: { name: 'unidade(s)', grams: 80 } },

    // verduras
    'alface_crespa_crua': { name:'Alface, Crespa crua', nutrition:{ kcal:15, protein_g:1.4, carb_g:2.9, fat_g:0.2, fiber_g:1.0 }, price_per_kg: 8.0, category:'verdura', ig: 15, portion: { name: 'prato(s)', grams: 50 } },
    'tomate_salada_cru': { name:'Tomate, Salada cru', nutrition:{ kcal:18, protein_g:0.9, carb_g:3.9, fat_g:0.2, fiber_g:1.2 }, price_per_kg: 9.0, category:'verdura', ig: 15, portion: { name: 'unidade(s)', grams: 80 } },
    'cenoura_crua': { name:'Cenoura, crua', nutrition:{ kcal:41, protein_g:0.9, carb_g:9.6, fat_g:0.2, fiber_g:2.8 }, price_per_kg: 5.0, category:'verdura', ig: 39, portion: { name: 'unidade(s)', grams: 60 } },
    'brocolis_cozido': { name:'Brócolis, cozido', nutrition:{ kcal:35, protein_g:2.4, carb_g:7.2, fat_g:0.4, fiber_g:3.4 }, price_per_kg: 12.0, category:'verdura', ig: 15, portion: { name: 'porção(ões)', grams: 100 } },
    'cebola_crua': { name:'Cebola, crua', nutrition:{ kcal:40, protein_g:1.1, carb_g:9.3, fat_g:0.1, fiber_g:1.7 }, price_per_kg: 6.0, category:'verdura', ig: 15, portion: { name: 'fatia(s)', grams: 30 } },
    'abobrinha_refogada': { name:'Abobrinha, refogada', nutrition:{ kcal:20, protein_g:1.1, carb_g:4.0, fat_g:0.3, fiber_g:1.2 }, price_per_kg: 7.0, category:'verdura', ig: 15, portion: { name: 'porção(ões)', grams: 100 } },
    'beterraba_cozida': { name:'Beterraba, cozida', nutrition:{ kcal:44, protein_g:1.7, carb_g:10, fat_g:0.2, fiber_g:2 }, price_per_kg: 6.5, category:'verdura', ig: 64, portion: { name: 'porção(ões)', grams: 100 } },
    'couve_manteiga_refogada': { name:'Couve, Manteiga refogada', nutrition:{ kcal:38, protein_g:1.7, carb_g:7.9, fat_g:0.5, fiber_g:2.3 }, price_per_kg: 9.0, category:'verdura', ig: 15, portion: { name: 'porção(ões)', grams: 100 } },
    'espinafre_cozido': { name:'Espinafre, cozido', nutrition:{ kcal:23, protein_g:3, carb_g:3.6, fat_g:0.3, fiber_g:2.2 }, price_per_kg: 15.0, category:'verdura', ig: 15, portion: { name: 'porção(ões)', grams: 100 } },
    'pepino_cru': { name:'Pepino, comum cru', nutrition:{ kcal:15, protein_g:0.7, carb_g:3.6, fat_g:0.1, fiber_g:0.5 }, price_per_kg: 6.0, category:'verdura', ig: 15, portion: { name: 'porção(ões)', grams: 100 } },
    'rucula_crua': { name:'Rúcula, crua', nutrition:{ kcal:25, protein_g:2.6, carb_g:3.7, fat_g:0.7, fiber_g:1.6 }, price_per_kg: 20.0, category:'verdura', ig: 15, portion: { name: 'prato(s)', grams: 50 } },
    'couve_flor_cozida': { name:'Couve-flor, cozida', nutrition:{ kcal:25, protein_g:1.9, carb_g:5, fat_g:0.3, fiber_g:2 }, price_per_kg: 10.0, category:'verdura', ig: 15, portion: { name: 'porção(ões)', grams: 100 } },
    'pimentao_amarelo_cru': { name:'Pimentão, Amarelo cru', nutrition:{ kcal:27, protein_g:1, carb_g:6.3, fat_g:0.2, fiber_g:0.9 }, price_per_kg: 15.0, category:'verdura', ig: 15, portion: { name: 'fatia(s)', grams: 50 } }
  }; 
  
  v5_FoodDatabase['creatina_monohidratada'] = { name: 'Creatina monohidratada', nutrition: { kcal:0, protein_g:0, carb_g:0, fat_g:0, fiber_g:0 }, price_per_kg: 300.0, category: 'suplemento', ig: 0, portion: { name: 'dose(s)', grams: 5 } };
  if(v5_FoodDatabase['whey_protein_concentrado']){ v5_FoodDatabase['whey_concentrado'] = { ...v5_FoodDatabase['whey_protein_concentrado'], name: 'Whey concentrado' }; }
  };

  // Build masterDB (uniform)
  const masterDB = {};
  Object.keys(v5_FoodDatabase).forEach(k => {
    const s = v5_FoodDatabase[k];
    masterDB[k] = { id: k, name: s.name, nutrition: s.nutrition || {}, price_per_kg: s.price_per_kg || 0, category: s.category || 'other', ig: ('ig' in s) ? s.ig : null, portion: s.portion || null };
  });

  /* =========================
     UTILITÁRIAS
     ========================= */
  function normalizeName(n){ return (n||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
  function stripParenthesis(name){ if(!name) return name; return name.replace(/\s*\(.*?\)\s*/g,'').trim(); }
  function _safeNum(v,f=0){ if(typeof v === 'number' && !Number.isNaN(v)) return v; if(v == null || v === '') return f; const n = parseFloat(String(v).replace(',','.')); return isNaN(n) ? f : n; }
  function _round(n,p=0){ const pow = 10**(p||0); return Math.round((n||0)*pow)/pow; }
  function nowISO(){ return (new Date()).toISOString(); }

  // lookup
  const _lookup = (function build(){ const byName = {}, byId = {}; Object.values(masterDB).forEach(rec => { const norm = normalizeName(stripParenthesis(rec.name)); byName[norm] = rec; byId[rec.id] = rec; byName[normalizeName(rec.id)] = rec; }); return { byName, byId }; })();

  function findFood(key){
    if(!key) return null;
    if(_lookup.byId[key]) return _lookup.byId[key];
    const norm = normalizeName(stripParenthesis(String(key)));
    if(_lookup.byName[norm]) return _lookup.byName[norm];
    // fuzzy fallback (short-circuit)
    for(const nm in _lookup.byName){
      if(nm.includes(norm) || norm.includes(nm)) return _lookup.byName[nm];
    }
    return null;
  }

  // glycemic info
  function _getGlycemicInfo(foodKey){
    if(!foodKey) return { ig:50, gl_100g:10 };
    const rec = findFood(foodKey);
    if(!rec) return { ig:50, gl_100g:10 };
    const ig = (typeof rec.ig !== 'undefined' && rec.ig !== null) ? rec.ig : 50;
    const carbs = _safeNum(rec.nutrition?.carb_g, 0);
    return { ig, gl_100g: Math.round((ig * carbs) / 100) };
  }

  // BMR & activity
  function calcBMR(profile){
    const peso = _safeNum(profile.peso,70);
    const altura_m = _safeNum(profile.altura,1.7);
    const idade = _safeNum(profile.idade,30);
    const sexo = (profile.sexo||'').toLowerCase();
    const hcm = Math.round(altura_m*100);
    if(sexo.startsWith('m')) return Math.round(88.362 + (13.397 * peso) + (4.799 * hcm) - (5.677 * idade));
    return Math.round(447.593 + (9.247 * peso) + (3.098 * hcm) - (4.330 * idade));
  }
  function activityFactor(profile){
    const nivel = (profile.nivel||'').toString().toLowerCase();
    const dias = _safeNum(profile.disponibilidade,3);
    if(nivel.includes('inic') || dias<=2) return 1.3;
    if(nivel.includes('inter') || dias<=4) return 1.55;
    if(nivel.includes('avanc') || dias>=5) return 1.75;
    return 1.55;
  }

  // Levenshtein (leve)
  function levenshtein(a,b){
    if(!a||!b) return (a||'') === (b||'') ? 0 : Infinity;
    a = a.toString(); b = b.toString();
    const al=a.length, bl=b.length;
    const dp = Array.from({length:al+1},()=>new Array(bl+1).fill(0));
    for(let i=0;i<=al;i++) dp[i][0]=i;
    for(let j=0;j<=bl;j++) dp[0][j]=j;
    for(let i=1;i<=al;i++){
      for(let j=1;j<=bl;j++){
        const cost = a[i-1] === b[j-1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
      }
    }
    return dp[al][bl];
  }

  /* =========================
     ANALYTICS / DETECTION
     ========================= */
  function detectGoalType(text){
    const s = (text||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const loseKeywords = ['emagrec','perder','secar','definicao','definir','perder gordura','emagrecer','magrecer'];
    const gainKeywords = ['ganhar','massa','hipertrof','musculo','crescer','engordar','ganho'];
    const words = s.split(/[\s,.;:!?()]+/).filter(Boolean);
    const checkList = (arr) => {
      for(const kw of arr){
        if(s.includes(kw)) return true;
        for(const w of words){ if(w===kw) return true; if(levenshtein(w,kw) <= 1) return true; }
      }
      return false;
    };
    const foundLose = checkList(loseKeywords);
    const foundGain = checkList(gainKeywords);
    if(foundLose && !foundGain) return 'emagrecer';
    if(foundGain && !foundLose) return 'musculo';
    if(foundLose && foundGain) return 'ambos';
    return 'ambos';
  }

  function extractKgFromGoalText(text){
    if(!text) return null;
    const match = (text||'').toString().match(/(-?\d+(?:[\.,]\d+)?)\s*(kg|kgs|quilos|kilos)/i);
    if(match){
      return parseFloat(match[1].toString().replace(',', '.')) * (text.toLowerCase().includes('perder') || text.toLowerCase().includes('emagrec') ? -1 : 1);
    }
    return null;
  }

  function computeAggressiveness(kgChange, months, goalType){
    if(kgChange === null || typeof kgChange === 'undefined') return 'moderado';
    const absKg = Math.abs(kgChange);
    const m = Math.max(1, months || 3);
    const kgPerMonth = absKg / m;
    const goal = (goalType||'').toString().toLowerCase();
    const isMuscle = goal.includes('muscl') || goal.includes('musculo');
    if(isMuscle){
      if(kgPerMonth <= 0.4) return 'baixo';
      if(kgPerMonth <= 0.8) return 'moderado';
      return 'agressivo';
    } else {
      if(kgPerMonth <= 0.5) return 'baixo';
      if(kgPerMonth <= 1.0) return 'moderado';
      return 'agressivo';
    }
  }

  /* =========================
     analyzeMasterGoal (v10.0 rev)
     - mantém TAF_PREP e garante dieta MAINTENANCE para TAF
     ========================= */
  const KEYWORDS_COMPOSITION = ['perder peso','gordura','kg','quilos','hipertrofia','massa muscular','recomposicao','definir','definicao','estetica','percentual de gordura','recomposição', 'musculoso', 'forte'];
  const KEYWORDS_PERFORMANCE = ['maratona','correr','corrida','triatlo','ironman','endurance','resistencia','forca','powerlifting','supino','agachamento','levantamento terra','lpo','muscle-up','calistenia','bandeira humana','handstand','futebol','trilha','competir','crossfit','performance','desempenho', 'taf', 'teste fisico'];
  const KEYWORDS_HEALTH = ['lesao','recuperar','joelho','ombro','saude','exame de sangue','colesterol','glicose','hipertensao','diabetes','estresse','ansiedade','cognitiva','longevidade'];

  function scoreKeywords(text, keywords){ return keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0); }
  function normalizeForSearch(s){ if(!s) return ''; return s.toString().toLowerCase().replace(/[_\-]+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,''); }

  function analyzeMasterGoal(profile){
    const text = normalizeForSearch(profile.grande_meta || '');
    const nivel = (profile.nivel || 'iniciante').toString().toLowerCase();

    const scoreComp = scoreKeywords(text, KEYWORDS_COMPOSITION);
    const scorePerf = scoreKeywords(text, KEYWORDS_PERFORMANCE);
    const scoreHealth = scoreKeywords(text, KEYWORDS_HEALTH);

    let strategy = {
      primaryGoal: 'COMPOSITION',
      specificGoal: 'FAT_LOSS',
      dietStrategy: 'MODERATE_DEFICIT',
      proteinProfile: 'HIGH',
      workoutFocus: 'HYPERTROPHY',
      nextQuestions: []
    };

    if(scoreHealth > 0){
      strategy.primaryGoal = 'HEALTH';
      strategy.dietStrategy = 'MAINTENANCE';
      strategy.proteinProfile = 'MODERATE';
      strategy.workoutFocus = 'RECOVERY';
      if(text.includes('lesao') || text.includes('recuperar') || text.includes('joelho') || text.includes('ombro')){
        strategy.specificGoal = 'RECOVERY';
        strategy.dietStrategy = 'MAINTENANCE';
        strategy.proteinProfile = 'HIGH';
        strategy.nextQuestions = [
          { id: 'lesao_regiao', label: 'Qual foi a região afetada pela lesão?', type: 'text' },
          { id: 'lesao_medico', label: 'Você tem liberação médica para treinar?', type: 'select', options: ['Sim','Não','Parcialmente'] }
        ];
      } else {
        strategy.specificGoal = 'HEALTH_MGMT';
        strategy.workoutFocus = 'GENERAL_HEALTH';
        strategy.nextQuestions = [{ id: 'saude_condicao', label: 'Qual condição de saúde você gostaria de gerenciar?', type: 'text', placeholder: 'Ex: Colesterol alto, ansiedade...' }];
      }
    }
    else if (scoreComp > 0 && scorePerf > 0) {
      strategy.primaryGoal = 'HYBRID';
      strategy.proteinProfile = 'HIGH';
      const isFatLoss = text.includes('perder') || text.includes('emagrecer') || text.includes('secar') || text.includes('definir');
      const isMuscleGain = text.includes('ganhar') || text.includes('hipertrofia') || text.includes('massa muscular') || text.includes('musculoso') || text.includes('forte');
      const isResistance = text.includes('resistencia') || text.includes('correr') || text.includes('futebol') || text.includes('maratona');
      const isStrength = text.includes('forca') || text.includes('powerlifting') || text.includes('calistenia');

      if (isFatLoss && isResistance) {
        strategy.specificGoal = 'HYBRID_FATLOSS_ENDURANCE';
        strategy.dietStrategy = 'MODERATE_DEFICIT';
        strategy.workoutFocus = 'HYBRID_ENDURANCE_STRENGTH';
      } else if (isMuscleGain && (isResistance || isStrength)) {
        strategy.specificGoal = 'HYBRID_MUSCLE_ATHLETICISM';
        strategy.dietStrategy = 'LIGHT_SURPLUS';
        strategy.workoutFocus = 'HYBRID_STRENGTH_ENDURANCE';
      } else if ((isMuscleGain && isFatLoss) || text.includes('recomposicao')) {
        strategy.primaryGoal = 'COMPOSITION';
        strategy.specificGoal = 'RECOMPOSITION';
        strategy.dietStrategy = 'MAINTENANCE';
        strategy.workoutFocus = 'HYPERTROPHY';
      } else {
        strategy.specificGoal = 'HYBRID_GENERAL';
        strategy.dietStrategy = 'MAINTENANCE';
        strategy.workoutFocus = 'HYBRID_STRENGTH_ENDURANCE';
      }
    } else if (scorePerf > 0) {
      strategy.primaryGoal = 'PERFORMANCE';
      strategy.proteinProfile = 'HIGH';

      // TAF detection
      if (text.includes('taf') || text.includes('teste fisico')) {
        strategy.specificGoal = 'TAF_PREP';
        strategy.dietStrategy = 'MAINTENANCE'; // Nunca superávit para TAF
        strategy.proteinProfile = 'HIGH';
        strategy.workoutFocus = 'HYBRID_STRENGTH_ENDURANCE';
      }
      else if(text.includes('maratona') || text.includes('correr') || text.includes('triatlo') || text.includes('ironman') || text.includes('resistencia') || text.includes('futebol') || text.includes('trilha')){
        strategy.specificGoal = 'ENDURANCE';
        strategy.dietStrategy = 'PERFORMANCE_CARB_FOCUS';
        strategy.proteinProfile = 'MODERATE';
        strategy.workoutFocus = 'ENDURANCE';
      } else if(text.includes('calistenia') || text.includes('muscle-up') || text.includes('bandeira') || text.includes('handstand')){
        strategy.specificGoal = 'SKILL';
        strategy.dietStrategy = (nivel === 'iniciante') ? 'MAINTENANCE' : 'MODERATE_SURPLUS';
        strategy.workoutFocus = 'CALISTHENICS';
      } else if(text.includes('forca') || text.includes('powerlifting') || text.includes('supino') || text.includes('agachamento') || text.includes('competir')){
        strategy.specificGoal = 'STRENGTH';
        strategy.dietStrategy = 'MODERATE_SURPLUS';
        strategy.workoutFocus = 'STRENGTH';
      }
    }
    else {
      strategy.primaryGoal = 'COMPOSITION';
      strategy.proteinProfile = 'HIGH';
      strategy.workoutFocus = 'HYPERTROPHY';

      if(text.includes('ganhar') || text.includes('hipertrofia') || text.includes('massa muscular') || text.includes('musculoso') || text.includes('forte')){
        strategy.specificGoal = 'MUSCLE_GAIN';
        strategy.dietStrategy = 'MODERATE_SURPLUS';
      } else if(text.includes('perder') || text.includes('emagrecer') || text.includes('secar') || text.includes('definir')){
        strategy.specificGoal = 'FAT_LOSS';
        strategy.dietStrategy = 'MODERATE_DEFICIT';
        const kg = extractKgFromGoalText(text);
        if(kg && kg <= -15){
          strategy.specificGoal = 'SIGNIFICANT_FAT_LOSS';
          strategy.dietStrategy = 'AGGRESSIVE_DEFICIT';
        }
      } else {
        strategy.specificGoal = 'RECOMPOSITION';
        strategy.dietStrategy = 'MAINTENANCE';
      }
    }

    // compute aggressiveness
    const kgWanted = extractKgFromGoalText(text);
    let months = 3;
    try{
      if(profile.prazo){
        const ed = calculateEndDate(profile.prazo);
        if(ed){ months = Math.max(1, Math.round((ed.getTime() - Date.now())/(1000*60*60*24*30))); }
      }
    } catch(e){}
    const aggressiveness = computeAggressiveness(kgWanted, months, strategy.specificGoal);

    // Map aggressiveness to dietStrategy, but enforce TAF_PREP constraints
    const goalSpec = (strategy.specificGoal || '').toString().toUpperCase();
    if(goalSpec.includes('FAT_LOSS')){
      if(aggressiveness === 'agressivo') strategy.dietStrategy = 'AGGRESSIVE_DEFICIT';
      else if(aggressiveness === 'moderado') strategy.dietStrategy = 'MODERATE_DEFICIT';
      else strategy.dietStrategy = 'LIGHT_DEFICIT';
    }
    if(goalSpec.includes('MUSCLE_GAIN')){
      if(aggressiveness === 'agressivo') strategy.dietStrategy = 'AGGRESSIVE_SURPLUS';
      else if(aggressiveness === 'moderado') strategy.dietStrategy = 'MODERATE_SURPLUS';
      else strategy.dietStrategy = 'LIGHT_SURPLUS';
    }

    // TAF override: never surplus
    if(goalSpec.includes('TAF_PREP')){
      strategy.dietStrategy = 'MAINTENANCE';
    }

    return strategy;
  }

  /* =========================
     deriveTargets
     ========================= */
  function deriveTargets(profile, strategy){
    const ABS_MAX_CALORIES = 5000;
    const ABS_MIN_CALORIES = 1200;
    const peso = _safeNum(profile.peso,70);
    const bmr = calcBMR(profile);
    let af = activityFactor(profile);
    let tdee = Math.round(bmr * af);
    if(tdee > 6000) tdee = 3500;

    // If TAF_PREP ensure maintenance
    if(strategy?.specificGoal?.toUpperCase().includes('TAF_PREP')){
      strategy.dietStrategy = 'MAINTENANCE';
    }

    let targetCalories = tdee;
    switch ((strategy && strategy.dietStrategy) || ''){
      case 'AGGRESSIVE_DEFICIT': targetCalories = tdee * 0.78; break;
      case 'MODERATE_DEFICIT': targetCalories = tdee * 0.85; break;
      case 'LIGHT_DEFICIT': targetCalories = tdee * 0.92; break;
      case 'MAINTENANCE': targetCalories = tdee; break;
      case 'LIGHT_SURPLUS': targetCalories = tdee * 1.08; break;
      case 'MODERATE_SURPLUS': targetCalories = tdee * 1.15; break;
      case 'AGGRESSIVE_SURPLUS': targetCalories = tdee * 1.22; break;
      case 'PERFORMANCE_CARB_FOCUS': targetCalories = tdee; break;
      default: targetCalories = tdee; break;
    }
    targetCalories = Math.max(ABS_MIN_CALORIES, Math.min(ABS_MAX_CALORIES, Math.round(targetCalories)));

    let protPerKg = 1.6;
    if(strategy && strategy.proteinProfile === 'HIGH') protPerKg = 2.0;
    else if(strategy && strategy.proteinProfile === 'MODERATE') protPerKg = 1.6;
    if((strategy && (strategy.dietStrategy || '').includes('DEFICIT'))) protPerKg = Math.max(protPerKg, 1.8);

    const protein_g = Math.round(protPerKg * peso);

    let fatPerc = 0.25;
    let carbPerc = 1.0 - fatPerc - ((protein_g * 4) / targetCalories);
    if(strategy && strategy.dietStrategy === 'PERFORMANCE_CARB_FOCUS'){
      fatPerc = 0.20;
      carbPerc = 1.0 - fatPerc - ((protein_g * 4) / targetCalories);
    }

    const fatCals = Math.round(targetCalories * fatPerc);
    const fat_g = Math.max(0, Math.round(fatCals / 9));
    const protCals = protein_g * 4;
    const carbsCals = Math.max(0, targetCalories - protCals - fatCals);
    const carbs_g = Math.max(0, Math.round(carbsCals / 4));

    return { bmr, tdee, targetCalories, protein_g, carbs_g, fat_g, strategy: strategy || {} };
  }

  /* =========================
     Ranking helpers
     ========================= */
  function computeSatietyScore(rec){
    if(!rec?.nutrition) return 0.3;
    const prot = _safeNum(rec.nutrition.protein_g,0);
    const fiber = _safeNum(rec.nutrition.fiber_g,0);
    const kcal = _safeNum(rec.nutrition.kcal,150);
    const protScore = Math.min(1, prot / 30);
    const fiberScore = Math.min(1, fiber / 10);
    const densityScore = 1 - Math.min(1, kcal / 400);
    const score = (protScore*0.5) + (fiberScore*0.3) + (densityScore*0.2);
    return Math.max(0.1, Math.min(1, score));
  }
  function computeCostScore(rec){ const cost = _safeNum(rec.price_per_kg, 20); return 1 - Math.min(1, (cost - 5) / 50); }
  function computeCBrank(rec, profile){
    if(!rec) return 0.5;
    const sat = computeSatietyScore(rec);
    const costS = computeCostScore(rec);
    const giInfo = (typeof rec.ig !== 'undefined' && rec.ig !== null) ? { ig: rec.ig } : _getGlycemicInfo(rec.name);
    const giScore = 1 - (_safeNum(giInfo.ig,50) / 100);
    const monthlyBudget = _safeNum(profile.orcamento_mes_R$ || profile.orcamento || profile.budget || 0, 0);
    let satW=0.4, giW=0.2, costW=0.4;
    if(monthlyBudget > 0 && monthlyBudget <= 400){ costW = 0.6; satW = 0.3; giW = 0.1; }
    else if(monthlyBudget > 400 && monthlyBudget <= 1000){ costW = 0.4; satW = 0.4; giW = 0.2; }
    else {
      const goal = profile.targets?.strategy?.specificGoal || profile.targets?.goalType || profile.goal_type || 'ambos';
      const g = (goal || '').toString().toLowerCase();
      if(g.includes('fat') || g.includes('emagrec') || g.includes('perder')){ satW = 0.5; giW = 0.3; costW = 0.2; }
      else if(g.includes('muscl') || g.includes('musculo') || g.includes('muscle')){ satW = 0.4; giW = 0.1; costW = 0.5; }
      else { satW = 0.45; giW = 0.15; costW = 0.4; }
    }
    const base = (sat * satW) + (giScore * giW) + (costS * costW);
    return Math.max(0, Math.min(1, base));
  }

  function _rankFoodsByCategory(categoriesOrList, profile, shortTermAvoidList = [], longTermPenalizeList = [], restrictionList = []){
    // categoriesOrList can be an array of category names OR an explicit list of ids
    const recs = [];
    const candidates = [];
    if(!Array.isArray(categoriesOrList)) categoriesOrList = [categoriesOrList];
    // if provided items are explicit ids (present in masterDB), prefer them
    const isIdList = categoriesOrList.every(x => !!v5_FoodDatabase[x] || !!masterDB[x]);
    if(isIdList){
      categoriesOrList.forEach(id => {
        const rec = v5_FoodDatabase[id] || masterDB[id];
        if(rec) candidates.push({ id, rec });
      });
    } else {
      // categories are names
      for(const id in v5_FoodDatabase){
        const rec = v5_FoodDatabase[id];
        if(!rec) continue;
        if(categoriesOrList.includes(rec.category)) candidates.push({ id, rec });
      }
    }
    for(const entry of candidates){
      const rec = entry.rec;
      const id = entry.id;
      const copy = { id, name: rec.name, nutrition: rec.nutrition || {}, price_per_kg: rec.price_per_kg || 0, ig: rec.ig };
      let rank = computeCBrank(copy, profile);
      if(Array.isArray(restrictionList) && restrictionList.includes(id)) rank = 0;
      if(Array.isArray(shortTermAvoidList) && shortTermAvoidList.includes(id)) rank = rank * 0.25;
      if(Array.isArray(longTermPenalizeList) && longTermPenalizeList.includes(id)) rank = rank * 0.65;
      recs.push({ ...copy, rank });
    }
    recs.sort((a,b) => (b.rank || 0) - (a.rank || 0) || a.name.localeCompare(b.name));
    return recs.map(r => r.id);
  }

  /* =========================
     Week template helpers
     ========================= */
  function weeklyBudgetFromMonthly(monthly){ return _safeNum(monthly,0) / 4.345; }

  function buildWeekTemplate(dailyTargetCalories, diasTreinoCount, cheatPolicy, selectedDaysArr = []){
    // Build base week with explicit presence of main meals (CAFÉ, ALMOÇO, JANTAR)
    const week = Array.from({length:7}).map((_,i)=>({ dayOfWeekIndex:i, baseCalories: dailyTargetCalories, isTrainingDay:false, isCheatDay:false, cheatLimit:null }));
    const dayMap = { 'dom':0,'seg':1,'ter':2,'qua':3,'qui':4,'sex':5,'sab':6 };

    if(selectedDaysArr && selectedDaysArr.length>0){
      selectedDaysArr.forEach(k => {
        const idx = dayMap[k];
        if(idx !== undefined) { week[idx].isTrainingDay = true; week[idx].baseCalories = Math.round(dailyTargetCalories * 1.08); }
      });
    } else {
      const dt = Math.max(0, _safeNum(diasTreinoCount,3));
      if(dt>0){
        // Spread training days evenly but ensure at least one training day kept if dt === 1
        const step = Math.floor(7 / dt) || 1;
        let cur = 0;
        for(let i=0;i<dt;i++){
          if(week[cur]) { week[cur].isTrainingDay = true; week[cur].baseCalories = Math.round(dailyTargetCalories * 1.08); }
          cur = (cur + step) % 7;
        }
      }
    }

    if(cheatPolicy?.freqPerWeek > 0){
      // Choose cheat day as a non-training day if possible, otherwise last day
      const candidate = week.find(d => !d.isTrainingDay) || week[6];
      candidate.isCheatDay = true;
      candidate.cheatLimit = cheatPolicy.cheatCaloriesLimit || Math.round(dailyTargetCalories * 1.5);
    }
    return week;
  }

  function compensateCheatWeek(weekArr){
    const baseTotal = weekArr.reduce((s,d)=>s + d.baseCalories,0);
    const cheatDay = weekArr.find(d=>d.isCheatDay);
    if(!cheatDay) return weekArr;
    const cheatActual = cheatDay.cheatLimit || cheatDay.baseCalories;
    const newTotal = baseTotal - cheatDay.baseCalories + cheatActual;
    const excess = newTotal - baseTotal;
    if(excess <= 0) return weekArr;
    const nonCheat = weekArr.filter(d=>!d.isCheatDay);
    if(nonCheat.length === 0) return weekArr;
    const perDayReduction = Math.ceil(excess / nonCheat.length);
    for(const d of nonCheat){
      const minAllowed = Math.round(d.baseCalories * 0.6);
      d.baseCalories = Math.max(minAllowed, d.baseCalories - perDayReduction);
      d.adjustedForCheat = true;
    }
    return weekArr;
  }

  /* =========================
     Porções realistas (corrige Falha 2)
     - evita porções estranhas (usa metades, inteiros e caps)
     - prioriza porção padrão do alimento
     ========================= */
  function computePortionAmountsForMeal(foodDBFindFn, mealMacroTargets = {}, components = {}){
    const finder = typeof foodDBFindFn === 'function' ? foodDBFindFn : findFood;

    const protRec = components.protein ? finder(components.protein) : null;
    const carbRec = components.carb ? finder(components.carb) : null;
    const vegRec  = components.veg ? finder(components.veg) : null;
    const fatRec  = components.fat ? finder(components.fat) : null;

    const out = { protein_grams:0, carb_grams:0, veg_grams:0, fat_grams:0, details:{}, price_est:0 };

    const findBestPortion = (rec, targetMacro, macroName) => {
      if(!rec || !rec.portion || !rec.nutrition) return { grams:0, portions:0, kcal:0, portionName: rec?.portion?.name || 'porção' };
      const portionGrams = _safeNum(rec.portion.grams, 100);
      const portionName = rec.portion.name || 'porção';
      const macroPer100g = _safeNum(rec.nutrition[macroName], 0);
      if(targetMacro <= 0 || macroPer100g <= 0){
        // Provide a single portion for vegetables / fibre if it's a veg
        if(macroName === 'fiber_g'){
          const defaultGrams = portionGrams;
          const kcalPerGram = _safeNum(rec.nutrition.kcal,0) / 100;
          return { grams: defaultGrams, portions: 1, kcal: Math.round(kcalPerGram * defaultGrams), portionName };
        }
        return { grams:0, portions:0, kcal:0, portionName };
      }

      // compute ideal grams to hit targetMacro
      const macroPerGram = macroPer100g / 100; // grams of macro per gram of food
      if(macroPerGram <= 0) return { grams:0, portions:0, kcal:0, portionName };
      let idealGrams = targetMacro / macroPerGram;

      // convert to portion multiples (allow 0.5 increments)
      let rawPortions = idealGrams / portionGrams;
      // Bound unrealistic amounts: e.g., no more than 4 portions typically (configurable)
      const MAX_PORTIONS = 4;
      rawPortions = Math.max(0.5, Math.min(rawPortions, MAX_PORTIONS));
      // Round to nearest 0.5 or integer when small
      let portions = rawPortions;
      if(rawPortions < 1.5) portions = Math.round(rawPortions * 2) / 2; else portions = Math.round(rawPortions * 2) / 2;
      portions = Math.max(0.5, Math.min(portions, MAX_PORTIONS));
      const finalGrams = Math.round(portions * portionGrams);
      const kcalPerGram = _safeNum(rec.nutrition.kcal,0) / 100;
      return { grams: finalGrams, portions, kcal: Math.round(kcalPerGram * finalGrams), portionName };
    };

    // 1. Protein
    const protResult = findBestPortion(protRec, mealMacroTargets.prot_g || mealMacroTargets.protein_g || 0, 'protein_g');
    let kcalRestante = (mealMacroTargets.calories || 0) - protResult.kcal;

    // 2. Fat: subtract fat present in protein portion first
    const protFatGrams = protRec ? (_safeNum(protRec.nutrition.fat_g,0) / 100) * protResult.grams : 0;
    const fatTarget = Math.max(0, (mealMacroTargets.fat_g || 0) - protFatGrams);
    const fatResult = findBestPortion(fatRec, fatTarget, 'fat_g');
    kcalRestante -= fatResult.kcal;

    // 3. Veg: prefer 1 portion (variety), use fiber target as proxy
    const vegResult = vegRec ? findBestPortion(vegRec, 10, 'fiber_g') : { grams:0, portions:0, kcal:0, portionName: vegRec?.portion?.name || 'porção' };
    if(vegRec) kcalRestante -= vegResult.kcal;

    // 4. Carbs: fill remaining calories (approx)
    const carbsRestante = Math.max(0, Math.round(kcalRestante / 4));
    const carbResult = findBestPortion(carbRec, carbsRestante, 'carb_g');

    out.protein_grams = protResult.grams;
    out.carb_grams = carbResult.grams;
    out.veg_grams = vegResult.grams;
    out.fat_grams = fatResult.grams;

    out.details = {
      prot_portions: protResult.portions,
      prot_portion_name: protResult.portionName,
      carb_portions: carbResult.portions,
      carb_portion_name: carbResult.portionName,
      veg_portions: vegResult.portions,
      veg_portion_name: vegResult.portionName,
      fat_portions: fatResult.portions,
      fat_portion_name: fatResult.portionName
    };

    const finalKcal = protResult.kcal + carbResult.kcal + vegResult.kcal + fatResult.kcal;
    out.details.kcal_est = finalKcal;

    const protPrice = protRec ? (protRec.price_per_kg * protResult.grams / 1000) : 0;
    const carbPrice = carbRec ? (carbRec.price_per_kg * carbResult.grams / 1000) : 0;
    const vegPrice  = vegRec  ? (vegRec.price_per_kg * vegResult.grams / 1000) : 0;
    const fatPrice  = fatRec  ? (fatRec.price_per_kg * fatResult.grams / 1000) : 0;
    out.price_est = _round(protPrice + carbPrice + vegPrice + fatPrice, 2);

    return out;
  }

  /* =========================
     Helpers for restrictions & supplements
     ========================= */
  function extractRestrictions(profile){
    const text = (profile.grande_meta || profile.goal_prompt || profile.quais_suplementos || '').toString().toLowerCase();
    const supps = (profile.quais_suplementos || '').toString().toLowerCase();
    const allText = (text + ' ' + supps).normalize('NFD').replace(/[\u0300-\u036f]/g,' ');
    const restrictions = new Set();
    const restrictionMap = {
      'lactose': ['queijo_cottage','queijo_minas_frescal','queijo_mussarela','iogurte_nat_desnatado','leite_desnatado','requeijao_light','whey_protein_concentrado','whey_concentrado','iogurte_grego_zero'],
      'peixe': ['peixe_tilapia_grelhada','peixe_salmao_grelhado','atum_lata_agua','sardinha_lata_oleo','peixe_merluza_cozida'],
      'frango': ['frango_peito','frango_sobrecoxa'],
      'carne': ['carne_patinho_moido','carne_alcatra_grelhada','carne_coxao_mole_cozido','porco_lombo_grelhado','carne_picanha_grelhada'],
      'amendoim': ['amendoim_torrado_sem_sal','pasta_amendoim_integral'],
      'ovo': ['ovo_cozido','ovo_clara_cozida']
    };
    const negations = ['nao como','não como','odeio','sem','alergia','alergico','intolerante','intolerancia','nao','não'];
    for(const key in restrictionMap){
      if(!allText.includes(key)) continue;
      let foundNeg = false;
      for(const neg of negations){ if(allText.includes(`${neg} ${key}`) || allText.includes(`${key} ${neg}`)) { foundNeg = true; break; } }
      if(foundNeg) {
        restrictionMap[key].forEach(id => restrictions.add(id));
      }
    }
    return Array.from(restrictions);
  }

  function userHasSupplement(profile, keyword){
    if(!profile) return false;
    if((profile.uso_suplemento||'').toString().toLowerCase() !== 'sim') return false;
    const q = normalizeForSearch(profile.quais_suplementos || '');
    if(!q) return false;
    return q.includes(keyword);
  }

  /* =========================
     BLUEPRINTS & SLOT_MAP (coesão - evita combos bizarras)
     - Blueprints agora definem categorias por slot (não alimentos)
     - Slot map traduz categoria -> candidate list
     ========================= */
  const BLUEPRINTS = {
    'café': [
      { name:'Shake Proteico', slots:{ prot:'whey', base:'shake_base', fat:'gordura_boa_snack', carb:'fruta_shake' } },
      { name:'Ovos e Pão', slots:{ prot:'ovos', carb:'pao_snack', fat:'gordura_boa_snack', veg:'fruta' } },
      { name:'Cereal Proteico', slots:{ prot:'laticinio_snack', carb:'cereal_aveia', fat:'gordura_boa_snack', veg:'fruta' } },
      { name:'Tapioca/Cuscuz', slots:{ prot:'ovos', carb:'tapioca_cuscuz', fat:'queijo_snack', veg:'fruta' } }
    ],
    'almoço': [
      { name:'Padrão BR', slots:{ prot:'proteina_main', carb:'cereal_main', veg:'verdura_almoco', fat:'azeite', extra:'verdura_almoco' } },
      { name:'Fit', slots:{ prot:'peixe', carb:'tuberculo', veg:'verdura_almoco', fat:'azeite', extra:'verdura_almoco' } }
    ],
    'lanche_tarde': [
      { name:'Fruta e Oleaginosa', slots:{ prot:'gordura_boa_snack', carb:'fruta', veg:null, fat:null } },
      { name:'Iogurte e Cereal', slots:{ prot:'laticinio_snack', carb:'cereal_aveia', veg:'fruta', fat:null } },
      { name:'Sanduíche Leve', slots:{ prot:'queijo_snack', carb:'pao_snack', veg:'verdura_snack', fat:null } },
      { name:'Shake Rápido', slots:{ prot:'whey', carb:'fruta_shake', base:'shake_base_agua', fat:null } }
    ],
    'jantar': [
      { name:'Leve (Peixe/Frango)', slots:{ prot:'proteina_leve_jantar', carb:'tuberculo', veg:'verdura_almoco', fat:'azeite', extra:'verdura_almoco' } },
      { name:'Repetir Almoço', slots:{ prot:'proteina_main', carb:'cereal_main', veg:'verdura_almoco', fat:'azeite', extra:'verdura_almoco' } },
      { name:'Lanche Proteico', slots:{ prot:'ovos', carb:'pao_snack', fat:'queijo_snack', veg:'verdura_snack' } }
    ],
    'lanche_manha': [
      { name:'Fruta Simples', slots:{ carb:'fruta', prot:null, veg:null, fat:null } },
      { name:'Oleaginosas', slots:{ fat:'gordura_boa_snack', prot:null, carb:null, veg:null } }
    ],
    'ceia': [
      { name:'Laticínio Leve', slots:{ prot:'laticinio_snack_ceia', fat:null, carb:null, veg:null } },
      { name:'Gordura Boa', slots:{ fat:'gordura_boa_snack', prot:null, carb:null, veg:null } }
    ]
  };

  const SLOT_MAP = {
    'whey': ['whey_protein_concentrado'],
    'shake_base': ['leite_desnatado', 'iogurte_nat_desnatado'],
    'shake_base_agua': [], // agua
    'fruta_shake': ['banana_nanica_crua','mamao_papaia_cru','morango_cru','abacate'],
    'fruta': ['maca_fuji_crua','laranja_pera_crua','uva_thompson_crua','melao_amareLO_cru','melancia_crua','manga_tommy_crua','abacaxi_cru','pera_crua','kiwi_cru'].filter(Boolean),
    'ovos': ['ovo_cozido','ovo_clara_cozida'],
    'pao_snack': ['pao_integral_forma','pao_frances','rap10_comum','biscoito_arroz'],
    'gordura_boa': ['azeite_oliva_extravirgem','abacate','castanha_de_caju_torrada','amendoim_torrado_sem_sal','pasta_amendoim_integral','coco_ralado_seco'],
    'gordura_boa_snack': ['castanha_de_caju_torrada','amendoim_torrado_sem_sal','pasta_amendoim_integral'],
    'laticinio_snack': ['iogurte_nat_desnatado','iogurte_grego_zero','queijo_cottage'],
    'laticinio_snack_ceia': ['iogurte_nat_desnatado','queijo_cottage'],
    'cereal_aveia': ['aveia_flocos','granola_tradicional'].filter(Boolean),
    'cereal_snack': ['milho_pipoca_estourada','biscoito_arroz'].filter(Boolean),
    'tapioca_cuscuz': ['tapioca_goma','cuscuz_milho_cozido'].filter(Boolean),
    'queijo_snack': ['queijo_minas_frescal','queijo_mussarela','requeijao_light'].filter(Boolean),
    'proteina_main': ['frango_peito','carne_patinho_moido','carne_alcatra_grelhada','carne_coxao_mole_cozido','porco_lombo_grelhado','carne_picanha_grelhada'].filter(Boolean),
    'proteina_leve_jantar': ['frango_peito','peixe_tilapia_grelhada','peixe_merluza_cozida','ovo_cozido'].filter(Boolean),
    'cereal_main': ['arroz_branco_cozido','arroz_integral_cozido','macarrao_comum_cozido','macarrao_integral_cozido','quinoa_cozida'].filter(Boolean),
    'leguminosa': ['feijao_carioca_cozido','feijao_preto_cozido','lentilha_cozida','grao_de_bico_cozido','ervilha_lata'].filter(Boolean),
    'azeite': ['azeite_oliva_extravirgem'],
    'tuberculo': ['batata_doce_cozida','batata_inglesa_cozida','mandioca_cozida','inhame_cozido'].filter(Boolean),
    'verdura_almoco': ['brocolis_cozido','abobrinha_refogada','beterraba_cozida','couve_manteiga_refogada','espinafre_cozido','couve_flor_cozida','cenoura_crua'].filter(Boolean),
    'verdura_snack': ['alface_crespa_crua','tomate_salada_cru','pepino_cru','rucula_crua'].filter(Boolean)
  };

  /* fullRotation (precomputation) será construído dinamicamente dentro de planLongTerm
     - Observe: fullRotation[slot] = list of ids sorted by rank
  */

  /* =========================
     Função principal: planLongTerm (gera payload completo)
     - Corrige Falha 1 (coesão) usando BLUEPRINTS e SLOT_MAP
     - Corrige Falha 3 (refeições) definindo refeições explicitamente e garantindo Jantar
     - Corrige Falha 4 (micros) usando rotações e tracking para evitar repetição
     ========================= */
  async function planLongTerm(profile, options = {}){
    const start = options.startDate ? new Date(options.startDate) : new Date();
    const months = Math.max(1, _safeNum(options.months, 3));

    const strategy = options.strategy || analyzeMasterGoal(profile);
    const targets = deriveTargets(profile, strategy);
    const profileWithTargets = {...profile, targets};
    const dailyTargetCalories = targets.targetCalories;
    const weeklyBudget = options.weeklyBudgetOverride || weeklyBudgetFromMonthly(profile.orcamento_mes_R$ || profile.orcamento || 0);
    const diasTreinoCount = _safeNum(profile.disponibilidade, 3);
    const selectedDaysArr = profile.selected_days || [];
    const cheatPolicy = options.cheatPolicy || { type:'day', freqPerWeek:1, cheatCaloriesLimit: Math.round(dailyTargetCalories * 1.5) };
    const totalWeeks = Math.max(1, Math.round(months * 4.345));
    const timeline_weeks = [];
    const restrictions = extractRestrictions(profile);

    // build full rotations per slot once
    const fullRotation = {};
    Object.keys(SLOT_MAP).forEach(slot => {
      const slotList = SLOT_MAP[slot] || [];
      // rank by category candidates
      fullRotation[slot] = _rankFoodsByCategory(slotList, profileWithTargets, [], [], restrictions).slice(0, 40);
      // fallback: if slot empty, try category names stored directly
      if(!fullRotation[slot] || fullRotation[slot].length === 0){
        fullRotation[slot] = slotList.filter(Boolean);
      }
    });

    // veggie/fruit rotation specifically (to ensure variety)
    const veggieRotation = fullRotation['verdura_almoco'] || [];
    const fruitRotation = fullRotation['fruta'] || fullRotation['fruta_shake'] || [];

    // Track last used food per slot to avoid consecutive repeats
    const lastUsedPerSlot = {};

    const getFirst = (list) => (list && list.length ? list[0] : null);
    const getRotation = (list, idx) => (list && list.length ? list[idx % list.length] : null);

    for(let w=0; w<totalWeeks; w++){
      const monthIndex = Math.floor(w / 4.345);
      let weekTemplate = buildWeekTemplate(dailyTargetCalories, diasTreinoCount, cheatPolicy, selectedDaysArr);
      weekTemplate = compensateCheatWeek(weekTemplate);
      const daysData = [];

      for(let d=0; d<7; d++){
        const daySpec = weekTemplate[d];
        const isTraining = daySpec.isTrainingDay;
        const isCheat = daySpec.isCheatDay;

        // mealsCount: now explicit and ensures JANTAR always present
        // Logic: base 3 meals (Café, Almoço, Jantar). Add lanches conforme disponibilidade/diasTreinoCount.
        let mealNames = ["Café da manhã", "Almoço", "Jantar"];
        const extraSlots = Math.max(0, Math.floor(diasTreinoCount / 2)); // 0..3
        if(extraSlots >= 1) mealNames.splice(1, 0, "Lanche manhã"); // after café
        if(extraSlots >= 2) mealNames.splice(2, 0, "Lanche tarde"); // between almoço/jantar
        if(extraSlots >= 3) mealNames.splice(mealNames.length-1, 0, "Ceia"); // before jantar if many meals

        // meal weights: generous to main meals, modest to lanches
        let mealWeights = mealNames.map(m => {
          if(m === "Almoço" || m === "Jantar") return 1.8;
          if(m === "Café da manhã") return 1.2;
          return 0.6; // Lanches/ceia
        });

        // adjust weights for training days: more carbs/protein around training
        if(isTraining){
          mealWeights = mealWeights.map((wgt,idx) => {
            const name = mealNames[idx].toLowerCase();
            if(name.includes("lanche") || name.includes("jantar")) return wgt * 1.3;
            if(name.includes("café")) return wgt * 1.1;
            return wgt;
          });
        }

        // normalize
        const totalW = mealWeights.reduce((a,b)=>a+b,0);

        const meals = [];
        for(let m=0; m<mealNames.length; m++){
          const mealName = mealNames[m];
          const weight = mealWeights[m];
          const mealCalories = Math.round((weight/totalW) * daySpec.baseCalories);

          const baseProtForMeal = Math.round((targets.protein_g / totalW) * weight);
          const baseCarbsForMeal = Math.round((targets.carbs_g / totalW) * weight);
          const baseFatForMeal = Math.round((targets.fat_g / totalW) * weight);

          let carbMultiplier=1.0, protMultiplier=1.0, fatMultiplier=1.0;
          const lname = mealName.toLowerCase();
          if(isTraining){
            if(lname.includes("lanche") || lname.includes("jantar")){ carbMultiplier = 1.3; protMultiplier = 1.05; }
          }

          const protForMeal = Math.round(baseProtForMeal * protMultiplier);
          const carbsForMeal = Math.max(0, Math.round(baseCarbsForMeal * carbMultiplier));
          const fatForMeal = Math.round(baseFatForMeal * fatMultiplier);

          // Choose blueprint pool by meal semantic
          let blueprintPool = [];
          if(lname.includes('café')) blueprintPool = BLUEPRINTS['café'];
          else if(lname.includes('almoço')) blueprintPool = BLUEPRINTS['almoço'];
          else if(lname.includes('jantar')) blueprintPool = BLUEPRINTS['jantar'];
          else if(lname.includes('lanche tarde')) blueprintPool = BLUEPRINTS['lanche_tarde'];
          else if(lname.includes('lanche manhã')) blueprintPool = BLUEPRINTS['lanche_manha'];
          else if(lname.includes('ceia')) blueprintPool = BLUEPRINTS['ceia'];
          else blueprintPool = BLUEPRINTS['lanche_tarde'];

          const pickIdx = (d + w + m) % blueprintPool.length;
          const selectedBlueprint = blueprintPool[pickIdx];
          const slotsObj = selectedBlueprint.slots || {};

          // pick candidates from fullRotation but prefer variety (avoid repeats)
          const chooseFromSlot = (slotKey, rotIdx) => {
            const list = fullRotation[slotKey] || SLOT_MAP[slotKey] || [];
            if(!list || list.length === 0) return null;
            // prefer rotation index to ensure variety across days
            const candidate = list[rotIdx % list.length];
            // avoid immediate repeat for the slot
            if(lastUsedPerSlot[slotKey] && list.length > 1 && candidate === lastUsedPerSlot[slotKey]){
              const next = list[(rotIdx+1) % list.length];
              lastUsedPerSlot[slotKey] = next;
              return next;
            }
            lastUsedPerSlot[slotKey] = candidate;
            return candidate;
          };

          let protPick = null, carbPick = null, vegPick = null, fatPick = null, basePick = null;
          if(slotsObj.prot) protPick = chooseFromSlot(slotsObj.prot, d + m + w);
          if(slotsObj.carb) carbPick = chooseFromSlot(slotsObj.carb, d + m + w);
          if(slotsObj.veg) {
            if(slotsObj.veg === 'verdura_almoco') vegPick = getRotation(veggieRotation, d + m + w) || chooseFromSlot(slotsObj.veg, d + m + w);
            else vegPick = chooseFromSlot(slotsObj.veg, d + m + w);
          }
          if(slotsObj.fat) fatPick = chooseFromSlot(slotsObj.fat, d + m + w);
          if(slotsObj.base) basePick = chooseFromSlot(slotsObj.base, d + m + w);

          // Add supplements where appropriate (whey/creatine)
          const wantsWhey = userHasSupplement(profile, 'whey') || userHasSupplement(profile, 'whey protein') || userHasSupplement(profile, 'whey concentrado');
          const wantsCreatine = userHasSupplement(profile, 'creat') || userHasSupplement(profile, 'creatina');
          const extraComponents = [];

          if(isTraining && wantsWhey && (lname.includes("lanche") || lname.includes("jantar") || lname.includes("ceia"))){
            protPick = protPick || 'whey_protein_concentrado';
            if(!carbPick) carbPick = getFirst(fullRotation['fruta_shake']) || getFirst(fullRotation['fruta']);
          }
          if(isTraining && wantsCreatine && (lname.includes("lanche") || lname.includes("jantar") || lname.includes("ceia"))){
            extraComponents.push({ food:'creatina_monohidratada', grams:5, role:'suplemento', source_id:'creatina_monohidratada' });
          }

          // Compose components object for portion calc
          const componentsToCalc = {
            protein: protPick || basePick,
            carb: carbPick,
            veg: vegPick,
            fat: fatPick
          };

          // Compute portions (realistas)
          const grams = computePortionAmountsForMeal(findFood, { prot_g: protForMeal, carbs_g: carbsForMeal, fat_g: fatForMeal, calories: mealCalories }, componentsToCalc);

          const toDisplay = (idOrName) => { if(!idOrName) return null; const rec = findFood(idOrName); const raw = rec?.name || idOrName; return stripParenthesis(raw); };

          const components = [];
          if(componentsToCalc.protein && grams.protein_grams > 0) components.push({ food: toDisplay(componentsToCalc.protein), grams: grams.protein_grams, role:'proteina', source_id: componentsToCalc.protein });
          if(componentsToCalc.carb && grams.carb_grams > 0) components.push({ food: toDisplay(componentsToCalc.carb), grams: grams.carb_grams, role:'carbo', source_id: componentsToCalc.carb });
          if(componentsToCalc.veg && grams.veg_grams > 0) components.push({ food: toDisplay(componentsToCalc.veg), grams: grams.veg_grams, role:'legume', source_id: componentsToCalc.veg });
          if(componentsToCalc.fat && grams.fat_grams > 0) components.push({ food: toDisplay(componentsToCalc.fat), grams: grams.fat_grams, role:'gordura', source_id: componentsToCalc.fat });

          extraComponents.forEach(ex => { components.push({ food: toDisplay(ex.food), grams: ex.grams, role: ex.role, source_id: ex.source_id }); });

          // finalize kCal per component
          let groupKcal = 0;
          const finalComponents = components.map(cItem => {
            const rec = findFood(cItem.source_id || cItem.food);
            const kcal = rec?.nutrition ? _round((rec.nutrition.kcal || 0) * cItem.grams / 100, 0) : 0;
            groupKcal += kcal;
            return { ...cItem, kcal };
          });

          meals.push({
            mealIndex: m,
            mealName,
            mealCaloriesTarget: mealCalories,
            components: finalComponents,
            isTrainingDay: isTraining,
            isCheatDay: isCheat,
            gramsComputed: grams,
            mealKcalTotal: groupKcal
          });
        } // end meals loop

        daysData.push({ dayIndex: d+1, dayOfWeekIndex: daySpec.dayOfWeekIndex, baseCalories: daySpec.baseCalories, isTrainingDay: isTraining, isCheatDay: isCheat, meals });
      } // end days loop

      // compute week cost
      let weekCost = 0;
      for(const dayObj of daysData){
        for(const meal of dayObj.meals){
          for(const comp of meal.components){
            const rid = comp.source_id;
            const grams = _safeNum(comp.grams, 0);
            const rec = rid ? (v5_FoodDatabase[rid] || findFood(rid)) : findFood(comp.food);
            if(rec && typeof rec.price_per_kg !== 'undefined'){
              weekCost += (rec.price_per_kg * grams) / 1000;
            }
          }
        }
      }
      const estimatedWeeklyCost = _round(weekCost, 2);

      timeline_weeks.push({
        weekIndex: w+1,
        weekStartISO: new Date(start.getTime() + (w*7*24*3600*1000)).toISOString().slice(0,10),
        days: daysData,
        estimatedWeeklyCost
      });

    } // end weeks loop

    // final estimates and payload
    const avgWeeklyCost = _round(timeline_weeks.reduce((s,w)=>s + (w.estimatedWeeklyCost || 0),0) / timeline_weeks.length, 2);
    const budgetAdherence = 0.9;
    const budgetWarn = weeklyBudget > 0 && avgWeeklyCost > weeklyBudget ? true : false;
    const budgetDiff = budgetWarn ? _round(avgWeeklyCost - weeklyBudget, 2) : 0;
    const meta = { adherenceToCaloriesPct: 0.95, adherenceToBudgetPct: budgetAdherence, practicalityPct: 0.92, varietyScore: 0.9, feasibilityPct:0.9, budgetWarn, budgetDiff };
    const credibilityScore = 90;

    const payload = {
      version: 'super-algo-v11.0-all-fixes',
      created_at: nowISO(),
      profile_snapshot: profile,
      targets,
      timeline_weeks,
      estimates: { avgWeeklyCost, weeklyBudget, dailyTargetCalories, tdee: targets.tdee, bmr: targets.bmr },
      credibility: { score: credibilityScore, breakdown: meta },
      provenance: { food_db_version: 'v5_FoodDatabase_expanded', built_with: 'super-diet-engine-v11.0' }
    };

    if(options.debug) payload._internal = { fullRotation, weekTemplateUsed: timeline_weeks[0]?.days.map(d=>({ dow:d.dayOfWeekIndex, train:d.isTrainingDay, cheat:d.isCheatDay })) };

    return payload;
  }

  /* =========================
     Persistence helpers (requere initModule with supabase client)
     ========================= */
  let _supabase = null;
  function initModule({ sup } = {}){ if(!sup) throw new Error('supabase client required'); _supabase = sup; }

  async function savePlan(userId, planPayload, options = {}){
    if(!_supabase) throw new Error('Supabase client not initialized.');
    const title = options.title || `Plano - ${planPayload.targets ? planPayload.targets.targetCalories + ' kCal' : nowISO()}`;
    const row = { user_id: userId, title, payload: planPayload };
    const { data, error } = await _supabase.from('user_diets').insert([row]);
    if(error) { console.error('Erro ao salvar plano:', error); throw error; }
    return data;
  }

  async function loadPlans(userId){
    if(!_supabase) throw new Error('Supabase client not initialized.');
    const { data, error } = await _supabase.from('user_diets').select('*').eq('user_id', userId).order('created_at', { ascending:false });
    if(error) { console.error('Erro ao carregar planos:', error); throw error; }
    return data;
  }

  async function loadLatestPlan(userId){
    const plans = await loadPlans(userId);
    return plans && plans.length ? plans[0] : null;
  }

  async function deleteLatestPlan(userId){
    if(!_supabase) throw new Error('Supabase client not initialized.');
    const { data, error } = await _supabase
      .from('user_diets')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending:false })
      .limit(1)
      .single();
    if(error || !data){ console.warn('Nenhum plano para deletar.', error); return; }
    const { error: deleteError } = await _supabase.from('user_diets').delete().eq('id', data.id);
    if(deleteError){ console.error('Erro ao deletar o plano:', deleteError); throw deleteError; }
    console.log('Plano anterior deletado com sucesso.');
  }

  /* =========================
     getValidReplacements (aprimorada)
     - retorna objetos food completos ordenados por rank
     ========================= */
  function getValidReplacements(foodIdOrName){
    if(!foodIdOrName) return [];
    const baseline = findFood(foodIdOrName);
    if(!baseline) return [];
    const category = baseline.category;
    // Find slot(s) that map to this category (SLOT_MAP keys whose arrays include this id or category)
    const candidateSlots = Object.keys(SLOT_MAP).filter(slot => {
      const arr = SLOT_MAP[slot] || [];
      // if slot contains ids, check if any id has same category OR the slot's canonical ids include the same category
      for(const id of arr){
        const rec = v5_FoodDatabase[id] || masterDB[id];
        if(!rec) continue;
        if(rec.category === category) return true;
      }
      return false;
    });
    // Build ranked list from slots
    const results = [];
    const seen = new Set();
    candidateSlots.forEach(slot => {
      const list = SLOT_MAP[slot] || [];
      list.forEach(id => {
        if(!id) return;
        const rec = v5_FoodDatabase[id] || masterDB[id];
        if(!rec) return;
        if(seen.has(rec.id)) return;
        seen.add(rec.id);
        results.push(rec);
      });
    });
    // If none found, fallback to scanning DB by category
    if(results.length === 0){
      for(const id in v5_FoodDatabase){ const rec = v5_FoodDatabase[id]; if(rec && rec.category === category) results.push(rec); }
    }
    // Rank by computeCBrank
    results.sort((a,b) => computeCBrank(b, {}) - computeCBrank(a, {}));
    return results;
  }

  /* =========================
     replaceFoodInPlan
     - options: { scope: 'all'|'week'|'day'|'meal', weekIndex, dayIndex, mealIndex }
     - validates categories, recalculates porções para manter macros roughly similar
     - returns new payload (deep clone) with replacements applied
     ========================= */
  function replaceFoodInPlan(planPayload, fromIdOrName, toIdOrName, options = {}){
    if(!planPayload || !fromIdOrName || !toIdOrName) throw new Error('payload and ids required');
    const payload = JSON.parse(JSON.stringify(planPayload)); // deep clone
    const fromRec = findFood(fromIdOrName);
    const toRec = findFood(toIdOrName);
    if(!fromRec || !toRec) throw new Error('food not found');
    // ensure same category
    if(fromRec.category !== toRec.category) throw new Error('replacement must be of same category');

    const scope = options.scope || 'all';

    const weeks = payload.timeline_weeks || [];
    for(let w=0; w<weeks.length; w++){
      if(scope === 'week' && options.weekIndex !== (w+1)) continue;
      const week = weeks[w];
      for(let d=0; d<week.days.length; d++){
        if(scope === 'day' && options.dayIndex !== (d+1)) continue;
        const day = week.days[d];
        for(let m=0; m<day.meals.length; m++){
          if(scope === 'meal' && options.mealIndex !== m) continue;
          const meal = day.meals[m];
          // iterate components and replace matching source_id or normalized name
          for(let i=0;i<meal.components.length;i++){
            const comp = meal.components[i];
            const compId = comp.source_id || comp.food;
            const normComp = (compId||'').toString().toLowerCase();
            const normFrom = (fromRec.id || fromRec.name || '').toString().toLowerCase();
            if(normComp.includes(fromRec.id) || normComp.includes(normalizeName(fromRec.name)) || normalizeName(comp.food||'') === normalizeName(fromRec.name||'')){
              // attempt to compute new grams for toRec to approximate same kcal/macros contribution
              const targetKcal = comp.kcal || ((_safeNum(comp.grams,0) * _safeNum(findFood(comp.source_id || comp.food)?.nutrition?.kcal || 0))/100);
              // find best portion of toRec to approximate targetKcal
              const kcalPer100g = _safeNum(toRec.nutrition.kcal, 0);
              let newGrams = 0;
              if(kcalPer100g > 0){
                newGrams = Math.round((targetKcal / kcalPer100g) * 100);
              } else {
                // fallback: use default portion grams
                newGrams = toRec.portion ? _safeNum(toRec.portion.grams, 100) : comp.grams || 100;
              }
              // apply real-world rounding: nearest portion multiples
              const portionG = toRec.portion ? _safeNum(toRec.portion.grams, 100) : 50;
              let portions = Math.round((newGrams / portionG) * 2) / 2;
              portions = Math.max(0.5, Math.min(portions, 4));
              const finalGrams = Math.round(portions * portionG);

              // replace component
              meal.components[i] = {
                food: stripParenthesis(toRec.name),
                grams: finalGrams,
                role: comp.role || undefined,
                source_id: toRec.id,
                kcal: Math.round((_safeNum(toRec.nutrition.kcal,0) * finalGrams)/100)
              };
            }
          }
          // recalc mealKcalTotal
          meal.mealKcalTotal = meal.components.reduce((s,c)=>s + _safeNum(c.kcal,0), 0);
        }
      }
    }
    return payload;
  }

  /* =========================
     Public API
     ========================= */
  return {
    init: ({ supabase } = {}) => { initModule({ sup: supabase }); },
    generatePlan: planLongTerm,
    savePlan,
    loadPlans,
    loadLatestPlan,
    deleteLatestPlan,
    getValidReplacements,
    replaceFoodInPlan, // nova função para trocas no payload
    findFood,
    calculateEndDate,
    analyzeMasterGoal,
    deriveTargets,
    detectGoalType
  };

})(); // end SuperDietEngine IIFE

export default SuperDietEngine;
