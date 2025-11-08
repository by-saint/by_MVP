/* ===========================================================
   ARQUIVO: diet-engine.js (SuperDietEngine) - v11.1 (integrado)
   Contém DB de alimentos v6, gerador de plano e helpers
   Inclui: getFoodsByCategory, getFoodCategory, calculateEquivalentPortion
   =========================================================== */

const SuperDietEngine = (function(){

  /* ========== FOOD DB (v6) - RE-CATEGORIZADA ========== */
  const v6_FoodDatabase = {
    // === PROTEÍNAS PRINCIPAIS ===
    'frango_peito': {
      name:'Frango, Peito sem pele cozido',
      nutrition:{ kcal:165, protein_g:31, carb_g:0, fat_g:3.6, fiber_g:0 },
      price_per_kg: 22.0, category:'proteina_main', ig: 0,
      portion: { name: 'filé(s)', grams: 125 }
    },
    'frango_sobrecoxa': {
      name:'Frango, Sobrecoxa sem pele assada',
      nutrition:{ kcal:209, protein_g:26, carb_g:0, fat_g:11.2, fiber_g:0 },
      price_per_kg: 18.0, category:'proteina_main', ig: 0,
      portion: { name: 'porção(ões)', grams: 120 }
    },
    'carne_patinho_moido': {
      name:'Carne, Patinho moído 90/10 cozido',
      nutrition:{ kcal:185, protein_g:28, carb_g:0, fat_g:7.5, fiber_g:0 },
      price_per_kg: 40.0, category:'proteina_main', ig: 0,
      portion: { name: 'porção(ões)', grams: 100 }
    },
    'carne_alcatra_grelhada': {
      name:'Carne, Alcatra grelhada',
      nutrition:{ kcal:200, protein_g:30, carb_g:0, fat_g:8.5, fiber_g:0 },
      price_per_kg: 45.0, category:'proteina_main', ig: 0,
      portion: { name: 'bife(s)', grams: 120 }
    },
    'carne_coxao_mole_cozido': {
      name:'Carne, Coxão mole cozido',
      nutrition:{ kcal:219, protein_g:32, carb_g:0, fat_g:9.5, fiber_g:0 },
      price_per_kg: 42.0, category:'proteina_main', ig: 0,
      portion: { name: 'porção(ões)', grams: 120 }
    },
    'porco_lombo_grelhado': {
      name:'Porco, Lombo grelhado',
      nutrition:{ kcal:176, protein_g:29, carb_g:0, fat_g:6.2, fiber_g:0 },
      price_per_kg: 28.0, category:'proteina_main', ig: 0,
      portion: { name: 'porção(ões)', grams: 120 }
    },

    // === PEIXES ===
    'peixe_tilapia_grelhada': {
      name:'Peixe, Tilápia grelhada',
      nutrition:{ kcal:128, protein_g:26, carb_g:0, fat_g:2.7, fiber_g:0 },
      price_per_kg: 40.0, category:'peixe', ig: 0,
      portion: { name: 'filé(s)', grams: 120 }
    },
    'peixe_salmao_grelhado': {
      name:'Peixe, Salmão grelhado',
      nutrition:{ kcal:208, protein_g:20, carb_g:0, fat_g:13, fiber_g:0 },
      price_per_kg: 75.0, category:'peixe', ig: 0,
      portion: { name: 'filé(s)', grams: 120 }
    },
    'atum_lata_agua': {
      name:'Atum, em lata (drenado)',
      nutrition:{ kcal:116, protein_g:26, carb_g:0, fat_g:0.9, fiber_g:0 },
      price_per_kg: 55.0, category:'peixe', ig: 0,
      portion: { name: 'lata(s)', grams: 120 }
    },
    'sardinha_lata_oleo': {
      name:'Sardinha, em lata óleo (drenada)',
      nutrition:{ kcal:208, protein_g:24.6, carb_g:0, fat_g:11.5, fiber_g:0 },
      price_per_kg: 30.0, category:'peixe', ig: 0,
      portion: { name: 'lata(s)', grams: 120 }
    },

    // === PROTEÍNAS SNACK (OVOS) ===
    'ovo_cozido': {
      name:'Ovo, de galinha inteiro cozido',
      nutrition:{ kcal:155, protein_g:13, carb_g:1.1, fat_g:11, fiber_g:0 },
      price_per_kg: 16.0, category:'snack_prot_ovo', ig: 0,
      portion: { name: 'unidade(s)', grams: 50 }
    },
    'ovo_clara_cozida': {
      name:'Ovo, clara cozida',
      nutrition:{ kcal:52, protein_g:11, carb_g:0.7, fat_g:0.2, fiber_g:0 },
      price_per_kg: 20.0, category:'snack_prot_ovo', ig: 0,
      portion: { name: 'unidade(s)', grams: 30 }
    },

    // === LATICÍNIOS (NOVAS CATEGORIAS) ===
    'leite_desnatado': {
      name:'Leite, Desnatado UHT',
      nutrition:{ kcal:35, protein_g:3.6, carb_g:5.1, fat_g:0.1, fiber_g:0 },
      price_per_kg: 5.50, category:'laticinio_liquido', ig: 32,
      portion: { name: 'copo(s)', grams: 200 }
    },
    'iogurte_nat_desnatado': {
      name:'Iogurte, Natural desnatado',
      nutrition:{ kcal:41, protein_g:5.7, carb_g:4.2, fat_g:0.1, fiber_g:0 },
      price_per_kg: 15.0, category:'laticinio_liquido', ig: 35,
      portion: { name: 'potinho(s)', grams: 170 }
    },
    'queijo_cottage': {
      name:'Queijo, Cottage (ex: 4% gordura)',
      nutrition:{ kcal:98, protein_g:11, carb_g:3.4, fat_g:4.3, fiber_g:0 },
      price_per_kg: 45.0, category:'laticinio_cremoso', ig: 0,
      portion: { name: 'colher(es)', grams: 80 }
    },
    'requeijao_light': {
      name:'Requeijão, Light',
      nutrition:{ kcal:170, protein_g:10, carb_g:4.5, fat_g:12, fiber_g:0 },
      price_per_kg: 35.0, category:'laticinio_cremoso', ig: 0,
      portion: { name: 'colher(es)', grams: 20 }
    },
    'queijo_minas_frescal': {
      name:'Queijo, Minas frescal',
      nutrition:{ kcal:264, protein_g:17, carb_g:3, fat_g:20, fiber_g:0 },
      price_per_kg: 38.0, category:'laticinio_solido', ig: 0,
      portion: { name: 'fatia(s)', grams: 50 }
    },
    'queijo_mussarela': {
      name:'Queijo, Mussarela',
      nutrition:{ kcal:300, protein_g:22, carb_g:2.2, fat_g:22, fiber_g:0 },
      price_per_kg: 48.0, category:'laticinio_solido', ig: 0,
      portion: { name: 'fatia(s)', grams: 30 }
    },

    // === SUPLEMENTOS ===
    'whey_protein_concentrado': {
      name:'Whey Protein (padrão 80%)',
      nutrition:{ kcal:390, protein_g:80, carb_g:9, fat_g:3.5, fiber_g:1 },
      price_per_kg: 110.0, category:'suplemento', ig: 15,
      portion: { name: 'scoop(s)', grams: 30 }
    },

    // === CARBOIDRATOS PRINCIPAIS ===
    'arroz_branco_cozido': {
      name:'Arroz, Branco tipo 1 cozido',
      nutrition:{ kcal:130, protein_g:2.7, carb_g:28, fat_g:0.2, fiber_g:0.4 },
      price_per_kg: 6.0, category:'cereal_main', ig: 73,
      portion: { name: 'colher(es) de servir', grams: 50 }
    },
    'arroz_integral_cozido': {
      name:'Arroz, Integral cozido',
      nutrition:{ kcal:111, protein_g:2.6, carb_g:23.5, fat_g:0.9, fiber_g:1.8 },
      price_per_kg: 8.0, category:'cereal_main', ig: 50,
      portion: { name: 'colher(es) de servir', grams: 50 }
    },
    'macarrao_comum_cozido': {
      name:'Macarrão, comum cozido',
      nutrition:{ kcal:158, protein_g:5.8, carb_g:31, fat_g:0.9, fiber_g:1.8 },
      price_per_kg: 10.0, category:'cereal_main', ig: 55,
      portion: { name: 'porção(ões)', grams: 100 }
    },
    'macarrao_integral_cozido': {
      name:'Macarrao, integral cozido',
      nutrition:{ kcal:141, protein_g:5.5, carb_g:27, fat_g:0.9, fiber_g:3.9 },
      price_per_kg: 16.0, category:'cereal_main', ig: 40,
      portion: { name: 'porção(ões)', grams: 100 }
    },
    'batata_doce_cozida': {
      name:'Batata doce, cozida',
      nutrition:{ kcal:90, protein_g:1.0, carb_g:21.0, fat_g:0.1, fiber_g:2.5 },
      price_per_kg: 5.0, category:'tuberculo', ig: 63,
      portion: { name: 'porção(ões)', grams: 100 }
    },
    'batata_inglesa_cozida': {
      name:'Batata inglesa, cozida',
      nutrition:{ kcal:87, protein_g:1.9, carb_g:20.1, fat_g:0.1, fiber_g:1.8 },
      price_per_kg: 4.5, category:'tuberculo', ig: 82,
      portion: { name: 'porção(ões)', grams: 100 }
    },
    'mandioca_cozida': {
      name:'Mandioca (Aipim), cozida',
      nutrition:{ kcal:160, protein_g:1.4, carb_g:38, fat_g:0.3, fiber_g:1.8 },
      price_per_kg: 6.0, category:'tuberculo', ig: 77,
      portion: { name: 'porção(ões)', grams: 100 }
    },
    'inhame_cozido': {
      name:'Inhame, cozido',
      nutrition:{ kcal:118, protein_g:1.5, carb_g:28, fat_g:0.2, fiber_g:4.1 },
      price_per_kg: 7.0, category:'tuberculo', ig: 51,
      portion: { name: 'porção(ões)', grams: 100 }
    },
    'cuscuz_milho_cozido': {
      name:'Cuscuz, de milho (flocão) cozido',
      nutrition:{ kcal:113, protein_g:2.2, carb_g:25.5, fat_g:0.3, fiber_g:1.9 },
      price_per_kg: 9.0, category:'cereal_main', ig: 65,
      portion: { name: 'porção(ões)', grams: 100 }
    },

    // === CARBOIDRATOS SNACK (NOVAS CATEGORIAS) ===
    'aveia_flocos': {
      name:'Aveia, em flocos crus',
      nutrition:{ kcal:389, protein_g:16.9, carb_g:66.3, fat_g:6.9, fiber_g:10.6 },
      price_per_kg: 12.0, category:'snack_carb_cereal', ig: 55,
      portion: { name: 'colher(es)', grams: 30 }
    },
    'granola_tradicional': {
      name:'Granola, tradicional (com açúcar)',
      nutrition:{ kcal:420, protein_g:9.0, carb_g:70, fat_g:12, fiber_g:8.0 },
      price_per_kg: 25.0, category:'snack_carb_cereal', ig: 65,
      portion: { name: 'colher(es)', grams: 40 }
    },
    'pao_integral_forma': {
      name:'Pão, de forma integral',
      nutrition:{ kcal:250, protein_g:9.5, carb_g:48, fat_g:2.5, fiber_g:6.0 },
      price_per_kg: 20.0, category:'snack_carb_pao', ig: 45,
      portion: { name: 'fatia(s)', grams: 30 }
    },
    'pao_frances': {
      name:'Pão, Francês',
      nutrition:{ kcal:289, protein_g:8.0, carb_g:58.5, fat_g:2.0, fiber_g:2.3 },
      price_per_kg: 15.0, category:'snack_carb_pao', ig: 70,
      portion: { name: 'unidade(s)', grams: 50 }
    },
    'rap10_comum': {
      name:'Pão Folha (Rap10) comum',
      nutrition:{ kcal:306, protein_g:8.2, carb_g:55, fat_g:5.7, fiber_g:2.1 },
      price_per_kg: 28.0, category:'snack_carb_pao', ig: 68,
      portion: { name: 'unidade(s)', grams: 60 }
    },
    'tapioca_goma': {
      name:'Tapioca (goma hidratada)',
      nutrition:{ kcal:240, protein_g:0, carb_g:59, fat_g:0, fiber_g:0 },
      price_per_kg: 10.0, category:'snack_carb_outro', ig: 80,
      portion: { name: 'porção(ões)', grams: 100 }
    },
    'milho_pipoca_estourada': {
      name:'Pipoca (milho estourado, sem gordura)',
      nutrition:{ kcal:387, protein_g:12.9, carb_g:78, fat_g:4.5, fiber_g:15.1 },
      price_per_kg: 14.0, category:'snack_carb_outro', ig: 55,
      portion: { name: 'xícara(s)', grams: 30 }
    },

    // === LEGUMINOSAS ===
    'feijao_carioca_cozido': {
      name:'Feijão, Carioca cozido (com caldo)',
      nutrition:{ kcal:76, protein_g:4.8, carb_g:13.6, fat_g:0.5, fiber_g:5.5 },
      price_per_kg: 8.5, category:'leguminosa', ig: 29,
      portion: { name: 'concha(s)', grams: 60 }
    },
    'feijao_preto_cozido': {
      name:'Feijão, Preto cozido (com caldo)',
      nutrition:{ kcal:77, protein_g:4.5, carb_g:14, fat_g:0.5, fiber_g:5.8 },
      price_per_kg: 9.0, category:'leguminosa', ig: 30,
      portion: { name: 'concha(s)', grams: 60 }
    },
    'lentilha_cozida': {
      name:'Lentilha, cozida',
      nutrition:{ kcal:116, protein_g:9.0, carb_g:20.1, fat_g:0.4, fiber_g:7.9 },
      price_per_kg: 14.0, category:'leguminosa', ig: 32,
      portion: { name: 'concha(s)', grams: 80 }
    },
    'grao_de_bico_cozido': {
      name:'Grão-de-bico, cozido',
      nutrition:{ kcal:139, protein_g:7.2, carb_g:25.5, fat_g:1.1, fiber_g:6.4 },
      price_per_kg: 15.0, category:'leguminosa', ig: 28,
      portion: { name: 'concha(s)', grams: 80 }
    },

    // === GORDURAS BOAS ===
    'azeite_oliva_extravirgem': {
      name:'Azeite, de Oliva Extra Virgem',
      nutrition:{ kcal:884, protein_g:0, carb_g:0, fat_g:100, fiber_g:0 },
      price_per_kg: 45.0, category:'gordura_boa', ig: 0,
      portion: { name: 'colher(es) de sopa', grams: 10 }
    },
    'abacate': {
      name:'Abacate, cru',
      nutrition:{ kcal:160, protein_g:2, carb_g:8.5, fat_g:14.7, fiber_g:6.7 },
      price_per_kg: 12.0, category:'gordura_boa', ig: 15,
      portion: { name: 'metade(s)', grams: 100 }
    },
    'castanha_de_caju_torrada': {
      name:'Castanha de Caju, torrada',
      nutrition:{ kcal:580, protein_g:17, carb_g:30, fat_g:46, fiber_g:3.3 },
      price_per_kg: 80.0, category:'gordura_boa', ig: 22,
      portion: { name: 'colher(es)', grams: 20 }
    },
    'amendoim_torrado_sem_sal': {
      name:'Amendoim, torrado sem sal',
      nutrition:{ kcal:567, protein_g:25.8, carb_g:16.1, fat_g:49.2, fiber_g:8.5 },
      price_per_kg: 25.0, category:'gordura_boa', ig: 14,
      portion: { name: 'colher(es)', grams: 15 }
    },
    'pasta_amendoim_integral': {
      name:'Pasta de Amendoim, integral',
      nutrition:{ kcal:588, protein_g:25, carb_g:20, fat_g:50, fiber_g:8 },
      price_per_kg: 40.0, category:'gordura_boa', ig: 14,
      portion: { name: 'colher(es)', grams: 15 }
    },
    'acai_puro_congelado': {
      name:'Açaí, polpa pura congelada (sem açúcar)',
      nutrition:{ kcal:58, protein_g:0.8, carb_g:6.2, fat_g:3.9, fiber_g:2.9 },
      price_per_kg: 20.0, category:'gordura_boa', ig: 10,
      portion: { name: 'porção(ões)', grams: 100 }
    },

    // === FRUTAS ===
    'banana_nanica_crua': {
      name:'Banana, nanica crua',
      nutrition:{ kcal:89, protein_g:1.1, carb_g:22.8, fat_g:0.3, fiber_g:2.6 },
      price_per_kg: 4.5, category:'fruta', ig: 51,
      portion: { name: 'unidade(s)', grams: 100 }
    },
    'maca_fuji_crua': {
      name:'Maçã, Fuji com casca crua',
      nutrition:{ kcal:56, protein_g:0.3, carb_g:15.2, fat_g:0, fiber_g:2.0 },
      price_per_kg: 8.0, category:'fruta', ig: 38,
      portion: { name: 'unidade(s)', grams: 120 }
    },
    'mamao_papaia_cru': {
      name:'Mamão, Papaia cru',
      nutrition:{ kcal:43, protein_g:0.5, carb_g:11, fat_g:0.3, fiber_g:1.7 },
      price_per_kg: 7.0, category:'fruta', ig: 60,
      portion: { name: 'porção(ões)', grams: 120 }
    },
    'laranja_pera_crua': {
      name:'Laranja, Pêra crua',
      nutrition:{ kcal:47, protein_g:0.9, carb_g:12, fat_g:0.1, fiber_g:2.4 },
      price_per_kg: 4.0, category:'fruta', ig: 43,
      portion: { name: 'unidade(s)', grams: 160 }
    },
    'uva_thompson_crua': {
      name:'Uva, Thompson (verde) crua',
      nutrition:{ kcal:69, protein_g:0.7, carb_g:18, fat_g:0.2, fiber_g:0.9 },
      price_per_kg: 15.0, category:'fruta', ig: 53,
      portion: { name: 'porção(ões)', grams: 100 }
    },
    'morango_cru': {
      name:'Morango, cru',
      nutrition:{ kcal:32, protein_g:0.7, carb_g:7.7, fat_g:0.3, fiber_g:2.0 },
      price_per_kg: 25.0, category:'fruta', ig: 40,
      portion: { name: 'porção(ões)', grams: 100 }
    },
    'melao_amarelo_cru': {
      name:'Melão, Amarelo cru',
      nutrition:{ kcal:29, protein_g:0.9, carb_g:7.5, fat_g:0, fiber_g:0.5 },
      price_per_kg: 6.0, category:'fruta', ig: 65,
      portion: { name: 'porção(ões)', grams: 120 }
    },
    'melancia_crua': {
      name:'Melancia, crua',
      nutrition:{ kcal:30, protein_g:0.6, carb_g:8, fat_g:0.2, fiber_g:0.4 },
      price_per_kg: 3.5, category:'fruta', ig: 72,
      portion: { name: 'fatia(s)', grams: 200 }
    },
    'manga_tommy_crua': {
      name:'Manga, Tommy crua',
      nutrition:{ kcal:60, protein_g:0.8, carb_g:15, fat_g:0.4, fiber_g:1.6 },
      price_per_kg: 7.5, category:'fruta', ig: 51,
      portion: { name: 'porção(ões)', grams: 150 }
    },
    'abacaxi_cru': {
      name:'Abacaxi, cru',
      nutrition:{ kcal:50, protein_g:0.5, carb_g:13, fat_g:0.1, fiber_g:1.4 },
      price_per_kg: 7.0, category:'fruta', ig: 59,
      portion: { name: 'fatia(s)', grams: 100 }
    },

    // === VERDURAS (NOVAS CATEGORIAS) ===
    'alface_crespa_crua': {
      name:'Alface, Crespa crua',
      nutrition:{ kcal:15, protein_g:1.4, carb_g:2.9, fat_g:0.2, fiber_g:1.0 },
      price_per_kg: 8.0, category:'verdura_folha', ig: 15,
      portion: { name: 'prato(s)', grams: 50 }
    },
    'espinafre_cozido': {
      name:'Espinafre, cozido',
      nutrition:{ kcal:23, protein_g:3, carb_g:3.6, fat_g:0.3, fiber_g:2.2 },
      price_per_kg: 15.0, category:'verdura_folha', ig: 15,
      portion: { name: 'porção(ões)', grams: 80 }
    },
    'couve_manteiga_refogada': {
      name:'Couve, Manteiga refogada',
      nutrition:{ kcal:38, protein_g:1.7, carb_g:7.9, fat_g:0.5, fiber_g:2.3 },
      price_per_kg: 9.0, category:'verdura_folha', ig: 15,
      portion: { name: 'porção(ões)', grams: 80 }
    },
    'rucula_crua': {
      name:'Rúcula, crua',
      nutrition:{ kcal:25, protein_g:2.6, carb_g:3.7, fat_g:0.7, fiber_g:1.6 },
      price_per_kg: 20.0, category:'verdura_folha', ig: 15,
      portion: { name: 'prato(s)', grams: 50 }
    },
    'agriao_cru': {
      name:'Agrião, cru',
      nutrition:{ kcal:11, protein_g:2.3, carb_g:1.3, fat_g:0.1, fiber_g:2.1 },
      price_per_kg: 22.0, category:'verdura_folha', ig: 15,
      portion: { name: 'prato(s)', grams: 50 }
    },
    'tomate_salada_cru': {
      name:'Tomate, Salada cru',
      nutrition:{ kcal:18, protein_g:0.9, carb_g:3.9, fat_g:0.2, fiber_g:1.2 },
      price_per_kg: 9.0, category:'verdura_legume', ig: 15,
      portion: { name: 'unidade(s)', grams: 80 }
    },
    'cenoura_crua': {
      name:'Cenoura, crua',
      nutrition:{ kcal:41, protein_g:0.9, carb_g:9.6, fat_g:0.2, fiber_g:2.8 },
      price_per_kg: 5.0, category:'verdura_legume', ig: 39,
      portion: { name: 'unidade(s)', grams: 60 }
    },
    'brocolis_cozido': {
      name:'Brócolis, cozido',
      nutrition:{ kcal:35, protein_g:2.4, carb_g:7.2, fat_g:0.4, fiber_g:3.4 },
      price_per_kg: 12.0, category:'verdura_legume', ig: 15,
      portion: { name: 'porção(ões)', grams: 80 }
    },
    'cebola_crua': {
      name:'Cebola, crua',
      nutrition:{ kcal:40, protein_g:1.1, carb_g:9.3, fat_g:0.1, fiber_g:1.7 },
      price_per_kg: 6.0, category:'verdura_legume', ig: 15,
      portion: { name: 'fatia(s)', grams: 30 }
    },
    'abobrinha_refogada': {
      name:'Abobrinha, refogada',
      nutrition:{ kcal:20, protein_g:1.1, carb_g:4.0, fat_g:0.3, fiber_g:1.2 },
      price_per_kg: 7.0, category:'verdura_legume', ig: 15,
      portion: { name: 'porção(ões)', grams: 80 }
    },
    'beterraba_cozida': {
      name:'Beterraba, cozida',
      nutrition:{ kcal:44, protein_g:1.7, carb_g:10, fat_g:0.2, fiber_g:2 },
      price_per_kg: 6.5, category:'verdura_legume', ig: 64,
      portion: { name: 'porção(ões)', grams: 80 }
    },
    'pepino_cru': {
      name:'Pepino, comum cru',
      nutrition:{ kcal:15, protein_g:0.7, carb_g:3.6, fat_g:0.1, fiber_g:0.5 },
      price_per_kg: 6.0, category:'verdura_legume', ig: 15,
      portion: { name: 'porção(ões)', grams: 80 }
    }
  }; // end v6_FoodDatabase

  // Additional entries/aliases
  v6_FoodDatabase['creatina_monohidratada'] = {
    name: 'Creatina monohidratada',
    nutrition: { kcal:0, protein_g:0, carb_g:0, fat_g:0, fiber_g:0 },
    price_per_kg: 300.0,
    category: 'suplemento',
    ig: 0,
    portion: { name: 'dose(s)', grams: 5 }
  };
  if(v6_FoodDatabase['whey_protein_concentrado']){
    v6_FoodDatabase['whey_concentrado'] = { ...v6_FoodDatabase['whey_protein_concentrado'], name: 'Whey concentrado' };
  }

  /* ========== SLOT_MAP (reutilizável) ========== */
  const SLOT_MAP = {
    'proteina_main': ['proteina_main'],
    'peixe': ['peixe'],
    'cereal_main': ['cereal_main'],
    'tuberculo': ['tuberculo'],
    'leguminosa': ['leguminosa'],
    'snack_prot_ovo': ['snack_prot_ovo'],
    'laticinio_liquido': ['laticinio_liquido'],
    'laticinio_cremoso': ['laticinio_cremoso'],
    'laticinio_solido': ['laticinio_solido'],
    'snack_carb_cereal': ['snack_carb_cereal'],
    'snack_carb_pao': ['snack_carb_pao'],
    'snack_carb_outro': ['snack_carb_outro'],
    'fruta': ['fruta'],
    'gordura_boa': ['gordura_boa'],
    'suplemento': ['suplemento'],
    'verdura_folha': ['verdura_folha'],
    'verdura_legume': ['verdura_legume'],
    'verdura': ['verdura_folha', 'verdura_legume']
  };

  /* ========== MASTER LOOKUP ========== */
  const masterDB = {};
  Object.keys(v6_FoodDatabase).forEach(k => {
    const s = v6_FoodDatabase[k];
    masterDB[k] = {
      id: k,
      name: s.name,
      nutrition: s.nutrition || {},
      price_per_kg: s.price_per_kg || 0,
      category: s.category || 'other',
      ig: (typeof s.ig !== 'undefined') ? s.ig : null,
      portion: s.portion || null
    };
  });

  function normalizeName(n){ return (n||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
  function stripParenthesis(name){ if(!name) return name; return name.replace(/\s*\(.*?\)\s*/g,'').trim(); }

  function buildLookup(db){
    const byName = {}, byId = {};
    Object.values(db).forEach(rec => {
      const norm = normalizeName(stripParenthesis(rec.name));
      byName[norm] = rec;
      byId[rec.id] = rec;
      byName[normalizeName(rec.id)] = rec;
    });
    return { byName, byId };
  }
  let _lookup = buildLookup(masterDB);

  function findFood(key){
    if(!key) return null;
    if(_lookup.byId[key]) return _lookup.byId[key];
    const norm = normalizeName(stripParenthesis(String(key)));
    if(_lookup.byName[norm]) return _lookup.byName[norm];
    for(const nm in _lookup.byName){
      if(nm.includes(norm) || norm.includes(nm)) return _lookup.byName[nm];
    }
    return null;
  }

  /* ========== UTILITIES ========== */
  function _safeNum(v, f=0){
    if(typeof v === 'number' && !Number.isNaN(v)) return v;
    if(v == null || v === '') return f;
    const n = parseFloat(String(v).replace(',','.'));
    return isNaN(n) ? f : n;
  }
  function _round(n,p=0){ const pow = 10**(p||0); return Math.round((n||0)*pow)/pow; }
  function nowISO(){ return (new Date()).toISOString(); }

  function _getGlycemicInfo(foodKey){
    if(!foodKey) return { ig:50, gl_100g:10 };
    const rec = findFood(foodKey);
    if(!rec) return { ig:50, gl_100g:10 };
    const ig = (typeof rec.ig !== 'undefined' && rec.ig !== null) ? rec.ig : 50;
    const carbs = _safeNum(rec.nutrition?.carb_g, 0);
    return { ig, gl_100g: Math.round((ig * carbs) / 100) };
  }

  /* BMR / activity */
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

  /* Levenshtein & helpers */
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

  function detectGoalType(text){
    const s = (text||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

    const loseKeywords = ['emagrec','perder','secar','definicao','definir','perder gordura','emagrecer','magrecer'];
    const gainKeywords = ['ganhar','massa','hipertrof','musculo','crescer','engordar','ganho'];
    const words = s.split(/[\s,.;:!?()]+/).filter(Boolean);
    const checkList = (arr) => {
      for(const kw of arr){
        if(s.includes(kw)) return true;
        for(const w of words){
          if(w===kw) return true;
          if(levenshtein(w,kw) <= 1) return true;
        }
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

  /* ========== NEW: extractRestrictions ========== */
  function extractRestrictions(profile){
    const text = (profile.grande_meta || profile.goal_prompt || profile.quais_suplementos || '').toString().toLowerCase();
    const supps = (profile.quais_suplementos || '').toString().toLowerCase();
    const allText = (text + ' ' + supps).normalize('NFD').replace(/[\u0300-\u036f]/g,' ');
    const restrictions = new Set();

    const restrictionMap = {
      'lactose': ['leite_desnatado', 'iogurte_nat_desnatado', 'queijo_cottage', 'queijo_minas_frescal', 'queijo_mussarela', 'requeijao_light', 'whey_protein_concentrado', 'whey_concentrado', 'laticinio_liquido', 'laticinio_cremoso', 'laticinio_solido'],
      'peixe': ['peixe_tilapia_grelhada','peixe_salmao_grelhado','atum_lata_agua','sardinha_lata_oleo'],
      'atum': ['atum_lata_agua'],
      'sardinha': ['sardinha_lata_oleo'],
      'frango': ['frango_peito','frango_sobrecoxa'],
      'carne vermelha': ['carne_patinho_moido','carne_alcatra_grelhada','carne_coxao_mole_cozido'],
      'carne': ['carne_patinho_moido','carne_alcatra_grelhada','carne_coxao_mole_cozido', 'porco_lombo_grelhado'],
      'porco': ['porco_lombo_grelhado'],
      'amendoim': ['amendoim_torrado_sem_sal','pasta_amendoim_integral'],
      'castanha': ['castanha_de_caju_torrada'],
      'ovo': ['ovo_cozido','ovo_clara_cozida', 'snack_prot_ovo']
    };

    const negations = ['nao como','não como','odeio','sem','alergia','alergico','intolerante','intolerancia','nao','não'];

    for(const key in restrictionMap){
      if(!allText.includes(key)) continue;
      let foundNeg = false;
      for(const neg of negations){
        if(allText.includes(`${neg} ${key}`) || allText.includes(`${key} ${neg}`) || allText.includes(`${neg} ${key}`.replace(/\s+/g,' '))){
          foundNeg = true;
          break;
        }
      }
      if(!foundNeg){
        const patt = new RegExp('\\b(?:nao como|não como|sem|alergia a|alergico a|intolerante a|intolerancia a|nao|não)\\s+' + key.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&'), 'i');
        if(patt.test(allText)) foundNeg = true;
      }
      if(foundNeg){
        restrictionMap[key].forEach(id => restrictions.add(id));
      }
    }
    return Array.from(restrictions);
  }

  /* computeAggressiveness */
  function computeAggressiveness(kgChange, months, goalType){
    const goal = (goalType || '').toString().toLowerCase();
    const isMuscle = goal.includes('muscl') || goal.includes('musculo') || goal.includes('muscle');
    if(kgChange === null || typeof kgChange === 'undefined') return 'moderado';
    const absKg = Math.abs(kgChange);
    const m = Math.max(1, months || 3);
    const kgPerMonth = absKg / m;
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

  /* helper to extract numeric kg change from a text like "perder 10kg" */
  function extractKgFromGoalText(text){
    if(!text) return null;
    const match = (text||'').toString().match(/(-?\d+(?:[\.,]\d+)?)\s*(kg|kgs|quilos|kilos)/i);
    if(match){ return parseFloat(match[1].toString().replace(',', '.')) * (text.toLowerCase().includes('perder') || text.toLowerCase().includes('emagrec') ? -1 : 1); }
    return null;
  }

  /* ========== KEYWORDS & helpers ========== */
  const KEYWORDS_COMPOSITION = ['perder peso','gordura','kg','quilos','hipertrofia','massa muscular','recomposicao','definir','definicao','estetica','percentual de gordura','recomposição', 'musculoso', 'forte'];
  const KEYWORDS_PERFORMANCE = ['maratona','correr','corrida','triatlo','ironman','endurance','resistencia','forca','powerlifting','supino','agachamento','levantamento terra','lpo','muscle-up','calistenia','bandeira humana','handstand','futebol','trilha','competir','crossfit','performance','desempenho'];
  const KEYWORDS_HEALTH = ['lesao','recuperar','joelho','ombro','saude','exame de sangue','colesterol','glicose','hipertensao','diabetes','estresse','ansiedade','cognitiva','longevidade'];

  function scoreKeywords(text, keywords) {
    return keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
  }

  function normalizeForSearch(s){ if(!s) return ''; return s.toString().toLowerCase().replace(/[_\-]+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,''); }

  /* ========== analyzeMasterGoal (v10.0) ========== */
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
        strategy.nextQuestions = [
          { id: 'saude_condicao', label: 'Qual condição de saúde você gostaria de gerenciar?', type: 'text', placeholder: 'Ex: Colesterol alto, ansiedade...' }
        ];
      }
    } else if (scoreComp > 0 && scorePerf > 0) {
      strategy.primaryGoal = 'HYBRID';
      strategy.proteinProfile = 'HIGH';
      const isFatLoss = text.includes('perder') || text.includes('emagrecer') || text.includes('secar') || text.includes('definir');
      const isMuscleGain = text.includes('ganhar') || text.includes('hipertrofia') || text.includes('massa muscular') || text.includes('musculoso') || text.includes('forte');
      const isResistance = text.includes('resistencia') || text.includes('correr') || text.includes('futebol') || text.includes('maratona');
      const isStrength = text.includes('forca') || text.includes('powerlifting') || text.includes('calistenia') || text.includes('muscle-up');

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
      if(text.includes('maratona') || text.includes('correr') || text.includes('triatlo') || text.includes('ironman') || text.includes('resistencia') || text.includes('futebol') || text.includes('trilha')){
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
      }
      else {
        strategy.specificGoal = 'RECOMPOSITION';
        strategy.dietStrategy = 'MAINTENANCE';
      }
    }

    const kgWanted = extractKgFromGoalText(text);
    let months = 3;
    try{
      if(profile.prazo){
        const ed = calculateEndDate(profile.prazo);
        if(ed){ months = Math.max(1, Math.round((ed.getTime() - Date.now())/(1000*60*60*24*30))); }
      }
    } catch(e){}
    const aggressiveness = computeAggressiveness(kgWanted, months, strategy.specificGoal);

    const goalSpec = strategy.specificGoal.toUpperCase();
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
    if(goalSpec === 'HYBRID_FATLOSS_ENDURANCE' && strategy.dietStrategy.includes('SURPLUS')) {
      strategy.dietStrategy = 'MODERATE_DEFICIT';
    }

    return strategy;
  }

  /* ========== deriveTargets ========== */
  function deriveTargets(profile, strategy) {
    const ABS_MAX_CALORIES = 5000;
    const ABS_MIN_CALORIES = 1400;
    const peso = _safeNum(profile.peso,70);
    const bmr = calcBMR(profile);
    const af = activityFactor(profile);
    let tdee = Math.round(bmr * af);
    if(tdee > 6000) tdee = 3500;

    let targetCalories = tdee;
    switch ((strategy && strategy.dietStrategy) || '') {
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

    return {
      bmr, tdee, targetCalories, protein_g, carbs_g, fat_g,
      strategy: strategy || {}
    };
  }

  /* Ranking helpers */
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
  function computeCostScore(rec){
    const cost = _safeNum(rec.price_per_kg, 20);
    return 1 - Math.min(1, (cost - 5) / 50);
  }

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

  /* ========== RANKING / ROTATION helpers ========== */
  function _rankFoodsByCategory(categories, profile, shortTermAvoidList = [], longTermPenalizeList = [], restrictionList = []){
    const recs = [];
    for(const id in v6_FoodDatabase){
      const rec = v6_FoodDatabase[id];
      if(!rec) continue;
      if(categories.includes(rec.category)){
        const copy = { id, name: rec.name, nutrition: rec.nutrition || {}, price_per_kg: rec.price_per_kg || 0, ig: rec.ig };
        let rank = computeCBrank(copy, profile);

        if(Array.isArray(restrictionList) && restrictionList.includes(id)){
          rank = 0;
        }
        if(Array.isArray(shortTermAvoidList) && shortTermAvoidList.includes(id)){
          rank = rank * 0.25;
        }
        if(Array.isArray(longTermPenalizeList) && longTermPenalizeList.includes(id)){
          if(!(Array.isArray(shortTermAvoidList) && shortTermAvoidList.includes(id))){
            rank = rank * 0.65;
          }
        }
        recs.push({ ...copy, rank });
      }
    }
    recs.sort((a,b) => (b.rank || 0) - (a.rank || 0) || a.name.localeCompare(b.name));
    return recs.map(r => r.id);
  }

  /* Utilities for weekly template, rotation */
  function weeklyBudgetFromMonthly(monthly){ return _safeNum(monthly,0) / 4.345; }

  function buildWeekTemplate(dailyTargetCalories, diasTreinoCount, cheatPolicy, selectedDaysArr = []){
    const week = Array.from({length:7}).map((_,i)=>({ dayOfWeekIndex:i, baseCalories: dailyTargetCalories, isTrainingDay:false, isCheatDay:false, cheatLimit:null }));
    const dayMap = { 'dom':0,'seg':1,'ter':2,'qua':3,'qui':4,'sex':5,'sab':6 };
    if(selectedDaysArr && selectedDaysArr.length>0){
      selectedDaysArr.forEach(k => { const idx = dayMap[k]; if(idx !== undefined) { week[idx].isTrainingDay = true; week[idx].baseCalories = Math.round(dailyTargetCalories * 1.08); }});
    } else {
      const dt = Math.max(0, _safeNum(diasTreinoCount,3));
      if(dt>0){
        const step = Math.floor(7 / dt) || 1;
        let cur = 1;
        for(let i=0;i<dt;i++){
          if(week[cur]) { week[cur].isTrainingDay = true; week[cur].baseCalories = Math.round(dailyTargetCalories * 1.08); }
          cur = (cur + step) % 7;
        }
      }
    }
    if(cheatPolicy?.freqPerWeek > 0){
      const candidate = week.find(d => !d.isTrainingDay) || week[6];
      candidate.isCheatDay = true; candidate.cheatLimit = cheatPolicy.cheatCaloriesLimit || Math.round(dailyTargetCalories * 1.5);
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
    for(const d of nonCheat){ const minAllowed = Math.round(d.baseCalories * 0.6); d.baseCalories = Math.max(minAllowed, d.baseCalories - perDayReduction); d.adjustedForCheat = true; }
    return weekArr;
  }

  /* computePortionAmountsForMeal */
  function computePortionAmountsForMeal(foodDBFindFn, mealMacroTargets = {}, components = {}) {
    const finder = typeof foodDBFindFn === 'function' ? foodDBFindFn : findFood;
    const protRec = components.protein ? finder(components.protein) : null;
    const carbRec = components.carb ? finder(components.carb) : null;
    const vegRec  = components.veg ? finder(components.veg) : null;
    const out = { protein_grams:0, carb_grams:0, veg_grams:0, details:{}, price_est:0 };

    const protPortGrams = _safeNum(protRec?.portion?.grams, 100);
    const carbPortGrams = _safeNum(carbRec?.portion?.grams, 100);
    const vegPortGrams  = _safeNum(vegRec?.portion?.grams, 100);

    const protPer100 = _safeNum(protRec?.nutrition?.protein_g, 25);
    const carbPer100 = _safeNum(carbRec?.nutrition?.carb_g, 25);

    const protInOnePortion = protPer100 * (protPortGrams / 100);
    const carbInOnePortion = carbPer100 * (carbPortGrams / 100);

    let numProtPortions = (protInOnePortion > 0) ? ( (_safeNum(mealMacroTargets.prot_g,0)) / protInOnePortion ) : 0;
    let numCarbPortions = (carbInOnePortion > 0) ? ( (_safeNum(mealMacroTargets.carbs_g,0)) / carbInOnePortion ) : 0;

    // Quantize to 0.5 portions mínimo
    const quantize = (v) => Math.max(0.5, Math.round(v * 2) / 2);

    numProtPortions = quantize(numProtPortions || 0.5);
    numCarbPortions = quantize(numCarbPortions || 0.5);

    out.protein_grams = Math.round(numProtPortions * protPortGrams);
    out.carb_grams = Math.round(numCarbPortions * carbPortGrams);
    out.veg_grams = vegRec ? vegPortGrams : 100;

    const protKcalPer100 = _safeNum(protRec?.nutrition?.kcal, (protPer100 * 4));
    const carbKcalPer100 = _safeNum(carbRec?.nutrition?.kcal, (carbPer100 * 4));
    const vegKcalPer100  = _safeNum(vegRec?.nutrition?.kcal, 20);

    const kcalEst = Math.round((out.protein_grams * protKcalPer100 / 100) + (out.carb_grams * carbKcalPer100 / 100) + (out.veg_grams * vegKcalPer100 / 100));
    out.details.kcal_est = kcalEst;

    const protPriceKg = _safeNum(protRec?.price_per_kg, 0);
    const carbPriceKg = _safeNum(carbRec?.price_per_kg, 0);
    const vegPriceKg  = _safeNum(vegRec?.price_per_kg, 0);
    const price = _round((out.protein_grams * protPriceKg + out.carb_grams * carbPriceKg + out.veg_grams * vegPriceKg) / 1000, 2);
    out.price_est = price;

    out.details = {
      prot_portions: numProtPortions,
      prot_portion_name: protRec?.portion?.name || 'porção',
      carb_portions: numCarbPortions,
      carb_portion_name: carbRec?.portion?.name || 'porção',
      veg_portion_name: vegRec?.portion?.name || 'porção'
    };
    return out;
  }

  /* Utilities (continued) */
  function getEaster(year) { const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1; return new Date(year, month - 1, day); }

  function calculateEndDate(prazoText){
    if(!prazoText) return null;
    const now = new Date();
    const text = prazoText.toString().toLowerCase().trim();
    const clean = text.replace(/[,]/g,'.').replace(/\s+/g,' ');
    let match;
    match = clean.match(/(\d+(?:[.,]\d+)?)\s*(anos|ano)/);
    if(match){ const value = parseFloat(match[1].replace(',', '.')); if(!isNaN(value)){ const monthsToAdd = Math.round(value*12); const d=new Date(); d.setMonth(d.getMonth() + monthsToAdd); return d; } }
    match = clean.match(/(\d+)\s*ano(?:s)?\s*e\s*meio/);
    if(match){ const d=new Date(); d.setMonth(d.getMonth() + (parseInt(match[1],10)*12) + 6); return d; }
    match = clean.match(/(\d+(?:[.,]\d+)?)\s*(meses|m[eê]s|mes)/);
    if(match){ const value = parseFloat(match[1].replace(',', '.')); if(!isNaN(value)){ const d=new Date(); d.setMonth(d.getMonth() + Math.round(value)); return d; } }
    match = clean.match(/(\d+(?:[.,]\d+)?)\s*(year|years)/);
    if(match){ const value = parseFloat(match[1].replace(',', '.')); const d=new Date(); d.setMonth(d.getMonth() + Math.round(value * 12)); return d; }
    match = clean.match(/^(\d{1,3})$/);
    if(match){ const n = parseInt(match[1],10); if(n <= 36){ const d=new Date(); d.setMonth(d.getMonth() + n); return d; } }
    if(clean.includes('meio ano') || clean.includes('1/2 ano')) { const d=new Date(); d.setMonth(d.getMonth()+6); return d; }
    const year = now.getFullYear();
    if(clean.includes('final do ano') || clean.includes('fim de ano')) return new Date(year,11,31);
    if(clean.includes('verao')||clean.includes('verão')){ const s=new Date(year,11,21); return now<s?s:new Date(year+1,11,21); }
    if(clean.includes('natal')){ const c=new Date(year,11,25); return now<c?c:new Date(year+1,11,25); }
    if(clean.includes('ano novo')) return new Date(year+1,0,1);
    if(clean.includes('pascoa')||clean.includes('páscoa')){ const e=getEaster(year); return now<e?e:getEaster(year+1); }
    return null;
  }

  function userHasSupplement(profile, keyword){
    if(!profile) return false;
    if((profile.uso_suplemento||'').toString().toLowerCase() !== 'sim') return false;
    const q = normalizeForSearch(profile.quais_suplementos || '');
    if(!q) return false;
    return q.includes(keyword);
  }

  /* ========== planLongTerm (v11.0) with Cohesion & Rotation fixes ========== */
  async function planLongTerm(profile, options = {}) {
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

    const BLUEPRINTS = {
      'café': [
        { name: 'Pão e Ovos', slots: { prot: 'snack_prot_ovo', carb: 'snack_carb_pao', veg: 'fruta' } },
        { name: 'Cereal e Iogurte', slots: { prot: 'laticinio_liquido', carb: 'snack_carb_cereal', veg: 'fruta' } },
        { name: 'Pão e Queijo', slots: { prot: 'laticinio_cremoso', carb: 'snack_carb_pao', veg: 'fruta' } },
        { name: 'Shake', slots: { prot: 'suplemento', carb: 'fruta', veg: 'gordura_boa' } },
        { name: 'Reforçado', slots: { prot: 'proteina_main', carb: 'tuberculo', veg: null } }
      ],
      'almoço': [
        { name: 'Padrão BR', slots: { prot: 'proteina_main', carb: 'cereal_main', veg: 'leguminosa' } },
        { name: 'Fit', slots: { prot: 'peixe', carb: 'tuberculo', veg: 'verdura_legume' } }
      ],
      'lanche': [
        { name: 'Iogurte e Cereal', slots: { prot: 'laticinio_liquido', carb: 'snack_carb_cereal', veg: null } },
        { name: 'Pão e Queijo', slots: { prot: 'laticinio_solido', carb: 'snack_carb_pao', veg: null } },
        { name: 'Ovos', slots: { prot: 'snack_prot_ovo', carb: null, veg: 'fruta' } },
        { name: 'Fruta e Gordura', slots: { carb: 'fruta', prot: 'gordura_boa', veg: null } },
        { name: 'Shake Rápido', slots: { prot: 'suplemento', carb: null, veg: null } }
      ],
      'jantar': [
        { name: 'Padrão', slots: { prot: 'proteina_main', carb: 'tuberculo', veg: 'verdura_legume' } },
        { name: 'Low-Carb', slots: { prot: 'peixe', carb: null, veg: 'verdura_legume' } },
        { name: 'Repetir Almoço', slots: { prot: 'proteina_main', carb: 'cereal_main', veg: 'leguminosa' } }
      ]
    };

    const cats = [
      'proteina_main','peixe','cereal_main','tuberculo','leguminosa',
      'snack_prot_ovo', 'laticinio_liquido', 'laticinio_cremoso', 'laticinio_solido',
      'snack_carb_cereal', 'snack_carb_pao', 'snack_carb_outro',
      'fruta','gordura_boa','suplemento', 'verdura_folha', 'verdura_legume'
    ];
    const fullRotation = {};
    cats.forEach(cat => { fullRotation[cat] = _rankFoodsByCategory([cat], profileWithTargets, [], [], restrictions).slice(0, 40); });

    const fallbackProtein = 'frango_peito';
    const fallbackCarb = 'arroz_branco_cozido';
    const fallbackLegume = 'feijao_carioca_cozido';
    const fallbackSnackProt = 'ovo_cozido';
    const fallbackSnackCarb = 'pao_integral_forma';
    const fallbackVeg = 'alface_crespa_crua';
    const fallbackFruit = 'banana_nanica_crua';
    const fallbackGordura = 'azeite_oliva_extravirgem';
    const fallbackLaticinio = 'leite_desnatado';

    const MEMORY_CAP = 12;

    const get = (list, idx) => {
      if (!list || list.length === 0) return null;
      const topN = Math.min(list.length, 5);
      const pickIndex = Math.abs(idx) % topN;
      return list[pickIndex];
    };

    for(let w=0; w<totalWeeks; w++){
      const monthIndex = Math.floor(w / 4.345);

      let recentProteinPicks = [];
      let recentCarbPicks = [];

      let weekTemplate = buildWeekTemplate(dailyTargetCalories, diasTreinoCount, cheatPolicy, selectedDaysArr);
      weekTemplate = compensateCheatWeek(weekTemplate);
      const daysData = [];

      const longTermPenalize = {};
      cats.forEach(cat => {
        const arr = fullRotation[cat] || [];
        longTermPenalize[cat] = arr.slice(0, Math.max(0, monthIndex));
      });

      const leafyVegCandidates = _rankFoodsByCategory(['verdura_folha'], profileWithTargets, [], longTermPenalize['verdura_folha'], restrictions);

      for(let d=0; d<7; d++){
        const daySpec = weekTemplate[d];
        const isTraining = daySpec.isTrainingDay;
        const isCheat = daySpec.isCheatDay;

        const baseMeals = ["Café da manhã", "Almoço", "Lanche tarde", "Jantar"];
        const diasTreino = _safeNum(diasTreinoCount, 3);
        const mealNames = [...baseMeals];
        if (diasTreino >= 4) {
            mealNames.splice(1, 0, "Lanche manhã");
        }
        const mealsCount = mealNames.length;

        let mealWeights = mealNames.map(m => /almoço|jantar/i.test(m) ? 1.8 : (/café/i.test(m) ? 1.2 : 0.6));
        if(isTraining){
          mealWeights = mealWeights.map((wgt,idx) => {
            const name = mealNames[idx].toLowerCase();
            if(/lanche tarde/.test(name) || /jantar/.test(name)) return wgt * 1.6;
            return wgt;
          });
        } else {
          mealWeights = mealWeights.map((wgt,idx) => {
            const name = mealNames[idx].toLowerCase();
            if(/lanche tarde/.test(name) || /jantar/.test(name)) return wgt * 0.8;
            return wgt;
          });
        }
        const totalW = mealWeights.reduce((a,b)=>a+b,0);
        const meals = [];

        const dayProteinPicks = [];
        const dayCarbPicks = [];

        for(let m=0; m<mealsCount; m++){
          const mealName = mealNames[m];
          const weight = mealWeights[m];
          const mealCalories = Math.round((weight/totalW) * daySpec.baseCalories);

          const baseProtForMeal = Math.round((targets.protein_g / totalW) * weight);
          const baseCarbsForMeal = Math.round((targets.carbs_g / totalW) * weight);
          const baseFatForMeal = Math.round((targets.fat_g / totalW) * weight);

          let carbMultiplier=1.0, protMultiplier=1.0, fatMultiplier=1.0;
          const lname = mealName.toLowerCase();
          if(isTraining){
            if(/lanche tarde/.test(lname) || /jantar/.test(lname)){ carbMultiplier = 1.4; protMultiplier = 1.05; }
          } else {
            if(/lanche tarde/.test(lname) || /jantar/.test(lname)){ carbMultiplier = 0.75; protMultiplier = 1.08; fatMultiplier = 1.05; }
          }

          const protForMeal = Math.round(baseProtForMeal * protMultiplier);
          const carbsForMeal = Math.max(0, Math.round(baseCarbsForMeal * carbMultiplier));
          const fatForMeal = Math.round(baseFatForMeal * fatMultiplier);

          let blueprintPool = [];
          if (lname.includes('café')) {
            blueprintPool = [BLUEPRINTS['café'][0], BLUEPRINTS['café'][1], BLUEPRINTS['café'][2]];
            if(userHasSupplement(profile, 'whey')) blueprintPool.push(BLUEPRINTS['café'][3]);
            if((profile.nivel || '').toLowerCase() === 'avancado') blueprintPool.push(BLUEPRINTS['café'][4]);
          }
          else if (lname.includes('almoço')) blueprintPool = BLUEPRINTS['almoço'];
          else if (lname.includes('jantar')) {
            const dietStrategy = String(targets.strategy?.dietStrategy || '').toUpperCase();
            if (!dietStrategy.includes('DEFICIT')) {
              blueprintPool = [BLUEPRINTS.jantar[0], BLUEPRINTS.jantar[2]];
            } else {
              blueprintPool = isTraining
                ? [BLUEPRINTS.jantar[0], BLUEPRINTS.jantar[2]]
                : [BLUEPRINTS.jantar[1], BLUEPRINTS.jantar[0]];
            }
          }
          else if (lname.includes('lanche')) {
             blueprintPool = [BLUEPRINTS['lanche'][0], BLUEPRINTS['lanche'][1], BLUEPRINTS['lanche'][2], BLUEPRINTS['lanche'][3]];
             if(userHasSupplement(profile, 'whey')) blueprintPool.push(BLUEPRINTS['lanche'][4]);
          }
          else blueprintPool = BLUEPRINTS['lanche'];

          const pickIdx = (monthIndex * 300) + (d * 10) + m;
          const blueprintIdx = (d + w) % blueprintPool.length;
          const selectedBlueprint = blueprintPool[blueprintIdx];
          const slotsObj = selectedBlueprint.slots || {};

          const protSlotType = slotsObj.prot || null;
          const carbSlotType = slotsObj.carb || null;
          const vegSlotType  = slotsObj.veg || null;

          const protCandidates = protSlotType ? _rankFoodsByCategory(SLOT_MAP[protSlotType] || [], profileWithTargets, recentProteinPicks, [].concat(...(SLOT_MAP[protSlotType] || []).map(cat => longTermPenalize[cat] || [])), restrictions) : [];
          const carbCandidates = carbSlotType ? _rankFoodsByCategory(SLOT_MAP[carbSlotType] || [], profileWithTargets, recentCarbPicks, [].concat(...(SLOT_MAP[carbSlotType] || []).map(cat => longTermPenalize[cat] || [])), restrictions) : [];
          const vegCandidates = vegSlotType ? _rankFoodsByCategory(SLOT_MAP[vegSlotType] || [], profileWithTargets, [], [], restrictions) : [];

          let protPick = get(protCandidates, pickIdx) || null;
          let carbPick = get(carbCandidates, pickIdx + 1) || null;
          let vegPick  = get(vegCandidates, pickIdx + 2) || null;

          if (lname.includes('café') && !protPick && !carbPick) {
             protPick = get(fullRotation['snack_prot_ovo'], pickIdx) || fallbackSnackProt;
             carbPick = get(fullRotation['snack_carb_pao'], pickIdx+1) || fallbackSnackCarb;
          }
          if ((lname.includes('almoço') || lname.includes('jantar')) && !protPick) {
             protPick = get(fullRotation['proteina_main'], pickIdx) || fallbackProtein;
          }
          if (lname.includes('lanche') && !protPick && !carbPick) {
             protPick = get(fullRotation['snack_prot_ovo'], pickIdx) || fallbackSnackProt;
             carbPick = get(fullRotation['fruta'], pickIdx+1) || fallbackFruit;
          }

          let componentsToCalc = { protein: protPick || null, carb: carbPick || null, veg: vegPick || null };
          const extraComponents = [];

          const wantsWhey = userHasSupplement(profile, 'whey');
          const wantsCreatine = userHasSupplement(profile, 'creat');
          if(isTraining && wantsWhey && /jantar/.test(lname)){
            componentsToCalc.protein = 'whey_concentrado';
            if(!componentsToCalc.carb) componentsToCalc.carb = 'banana_nanica_crua';
          }
          if(isTraining && wantsCreatine && /jantar/.test(lname)){
            extraComponents.push({ food: 'creatina_monohidratada', grams: 5, role:'suplemento' });
          }

          if (lname.includes('almoço')) {
              const leafPick = get(leafyVegCandidates, d) || fallbackVeg;
              extraComponents.push({ food: leafPick, grams: 75, role: 'verdura_folha' });
          }

          const grams = computePortionAmountsForMeal(findFood, { prot_g: protForMeal, carbs_g: carbsForMeal, fat_g: fatForMeal, calories: mealCalories }, componentsToCalc);

          const toDisplay = (idOrName) => {
            if(!idOrName) return null;
            const rec = findFood(idOrName);
            const raw = rec?.name || idOrName;
            return stripParenthesis(raw);
          };

          const components = [];
          if(componentsToCalc.protein && grams.protein_grams >= 10) components.push({ food: toDisplay(componentsToCalc.protein), grams: grams.protein_grams, role:'proteina', source_id: componentsToCalc.protein });
          if(componentsToCalc.carb && grams.carb_grams >= 10) components.push({ food: toDisplay(componentsToCalc.carb), grams: grams.carb_grams, role:'carbo', source_id: componentsToCalc.carb });
          if(componentsToCalc.veg && grams.veg_grams >= 10) components.push({ food: toDisplay(componentsToCalc.veg), grams: grams.veg_grams, role:'legume', source_id: componentsToCalc.veg });

          for(const ex of extraComponents){
            const rec = findFood(ex.food) || { name: ex.food };
            components.push({ food: stripParenthesis(rec.name || ex.food), grams: ex.grams || 50, role: ex.role || 'extra', source_id: ex.food });
          }

          let groupKcal = 0;
          const finalComponents = components.map(cItem => {
            const rec = findFood(cItem.source_id || cItem.food);
            const kcal = rec?.nutrition ? _round((rec.nutrition.kcal || 0) * cItem.grams / 100, 0) : 0;
            groupKcal += kcal;
            return { ...cItem, kcal };
          });

          finalComponents.forEach(fc=>{
            if(fc.source_id){
              const rid = fc.source_id;
              if(v6_FoodDatabase[rid]){
                if((fc.role || '').includes('proteina')) dayProteinPicks.push(rid);
                if((fc.role || '').includes('carbo') || (fc.role || '').includes('legume')) dayCarbPicks.push(rid);
              } else {
                const rec = findFood(fc.food);
                if(rec && rec.id){
                  if((fc.role || '').includes('proteina')) dayProteinPicks.push(rec.id);
                  if((fc.role || '').includes('carbo') || (fc.role || '').includes('legume')) dayCarbPicks.push(rec.id);
                }
              }
            }
          });

          meals.push({
            mealIndex: m, mealName, mealCaloriesTarget: mealCalories,
            components: finalComponents, isTrainingDay: isTraining, isCheatDay: isCheat,
            gramsComputed: grams, mealKcalTotal: groupKcal
          });
        } // end meals loop

        recentProteinPicks = [...recentProteinPicks, ...dayProteinPicks];
        recentCarbPicks = [...recentCarbPicks, ...dayCarbPicks];
        if (recentProteinPicks.length > MEMORY_CAP) recentProteinPicks = recentProteinPicks.slice(recentProteinPicks.length - MEMORY_CAP);
        if (recentCarbPicks.length > MEMORY_CAP) recentCarbPicks = recentCarbPicks.slice(recentCarbPicks.length - MEMORY_CAP);

        daysData.push({
          dayIndex: d+1, dayOfWeekIndex: daySpec.dayOfWeekIndex, baseCalories: daySpec.baseCalories, isTrainingDay: isTraining, isCheatDay: isCheat, meals
        });
      } // end days loop

      let weekCost = 0;
      for(const dayObj of daysData){
        for(const meal of dayObj.meals){
          for(const comp of meal.components){
            const rid = comp.source_id;
            const grams = _safeNum(comp.grams, 0);
            const rec = rid ? (v6_FoodDatabase[rid] || findFood(rid)) : findFood(comp.food);
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

    const avgWeeklyCost = _round(timeline_weeks.reduce((s,w)=>s + (w.estimatedWeeklyCost || 0),0) / timeline_weeks.length, 2);
    const budgetAdherence = 0.9;
    const budgetWarn = weeklyBudget > 0 && avgWeeklyCost > weeklyBudget ? true : false;
    const budgetDiff = budgetWarn ? _round(avgWeeklyCost - weeklyBudget, 2) : 0;
    const meta = { adherenceToCaloriesPct: 0.95, adherenceToBudgetPct: budgetAdherence, practicalityPct: 0.92, varietyScore: 0.9, feasibilityPct:0.9, budgetWarn, budgetDiff };
    const credibilityScore = 90;

    const payload = {
      version: 'super-algo-v11.1-no-ceia',
      created_at: nowISO(),
      profile_snapshot: profile,
      targets,
      timeline_weeks,
      estimates: { avgWeeklyCost, weeklyBudget, dailyTargetCalories, tdee: targets.tdee, bmr: targets.bmr },
      credibility: { score: credibilityScore, breakdown: meta },
      provenance: { food_db_version: 'v6_FoodDatabase_recategorized', built_with: 'super-diet-engine-v11.1' }
    };
    if(options.debug) payload._internal = { fullRotation, weekTemplateUsed: timeline_weeks[0]?.days.map(d=>({ dow:d.dayOfWeekIndex, train:d.isTrainingDay, cheat:d.isCheatDay })) };
    return payload;
  }

  /* Persistence helpers inside engine (uses _supabase) */
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

  async function deleteLatestPlan(userId) {
    if(!_supabase) throw new Error('Supabase client not initialized.');

    const { data, error } = await _supabase
      .from('user_diets')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.warn('Nenhum plano para deletar.', error);
      return;
    }

    const { error: deleteError } = await _supabase
      .from('user_diets')
      .delete()
      .eq('id', data.id);

    if (deleteError) {
      console.error('Erro ao deletar o plano:', deleteError);
      throw deleteError;
    }

    console.log('Plano anterior deletado com sucesso.');
  }

  // ==========================================================
  // NOVAS FUNÇÕES PARA MELHORIA 2 (Troca de Alimentos)
  // ==========================================================

  /**
   * Retorna uma lista de alimentos que pertencem à mesma categoria.
   * Cada item tem: id, name, nutrition, portion, category.
   * Ordena por ranking (computeCBrank) para priorizar opções melhores.
   */
  function getFoodsByCategory(category) {
    if (!category) return [];
    const arr = Object.values(masterDB)
      .filter(r => r.category === category)
      .map(r => ({
        id: r.id,
        name: r.name,
        nutrition: r.nutrition || {},
        portion: r.portion || null,
        category: r.category || 'other',
        price_per_kg: r.price_per_kg || 0,
        ig: typeof r.ig !== 'undefined' ? r.ig : null
      }));
    return arr.sort((a,b) => computeCBrank(b, {}) - computeCBrank(a, {}));
  }

  function getAllFoods() {
    return Object.values(masterDB).map(r => ({
      id: r.id,
      name: r.name,
      nutrition: r.nutrition || {},
      portion: r.portion || null,
      category: r.category || 'other'
    }));
  }

  function getFoodCategory(foodIdOrName) {
    const food = findFood(foodIdOrName);
    return food ? (food.category || null) : null;
  }

  /**
   * calculateEquivalentPortion(oldFood, newFood, oldGrams)
   * Tenta achar a quantidade (grams) do novo alimento que gere valores
   * próximos (protein, carb, fat e kcal) ao total do alimento antigo.
   */
  function calculateEquivalentPortion(oldFood, newFood, oldGrams) {
    oldGrams = _safeNum(oldGrams, 0);
    if (!oldFood || !newFood || oldGrams <= 0) return { grams: oldGrams, kcal: Math.round(((newFood?.nutrition?.kcal||0)/100) * oldGrams) };

    const oldProt100 = _safeNum(oldFood.nutrition?.protein_g, 0);
    const oldCarb100 = _safeNum(oldFood.nutrition?.carb_g, 0);
    const oldFat100  = _safeNum(oldFood.nutrition?.fat_g, 0);
    const oldKcal100 = _safeNum(oldFood.nutrition?.kcal, 0);

    const newProt100 = _safeNum(newFood.nutrition?.protein_g, 0);
    const newCarb100 = _safeNum(newFood.nutrition?.carb_g, 0);
    const newFat100  = _safeNum(newFood.nutrition?.fat_g, 0);
    const newKcal100 = _safeNum(newFood.nutrition?.kcal, 0);

    const totalProt = (oldProt100/100) * oldGrams;
    const totalCarb = (oldCarb100/100) * oldGrams;
    const totalFat  = (oldFat100/100)  * oldGrams;
    const totalKcal = (oldKcal100/100) * oldGrams;

    let gramsByProt = newProt100 > 0 ? (totalProt * 100) / newProt100 : null;
    let gramsByCarb = newCarb100 > 0 ? (totalCarb * 100) / newCarb100 : null;
    let gramsByKcal = newKcal100 > 0 ? (totalKcal * 100) / newKcal100 : null;

    const weights = { prot:0.45, carb:0.25, fat:0.15, kcal:0.15 };

    const candidates = [gramsByProt, gramsByCarb, gramsByKcal, oldGrams].map(g => Math.max(0, _safeNum(g, 0)));

    function scoreForG(g) {
      if (g <= 0) return Infinity;
      const protErr = Math.abs(((newProt100/100)*g) - totalProt) / Math.max(1, totalProt);
      const carbErr = Math.abs(((newCarb100/100)*g) - totalCarb) / Math.max(1, totalCarb);
      const fatErr  = Math.abs(((newFat100/100)*g) - totalFat) / Math.max(1, totalFat);
      const kcalErr = Math.abs(((newKcal100/100)*g) - totalKcal) / Math.max(1, totalKcal);
      return (protErr * weights.prot) + (carbErr * weights.carb) + (fatErr * weights.fat) + (kcalErr * weights.kcal);
    }

    let bestG = candidates[0], bestScore = scoreForG(candidates[0]);
    for (let i = 1; i < candidates.length; i++) {
      const sc = scoreForG(candidates[i]);
      if (sc < bestScore) { bestScore = sc; bestG = candidates[i]; }
    }

    const finalGrams = Math.max(0, Math.round(bestG / 5) * 5);
    const finalKcal = Math.round(((newKcal100 || 0) / 100) * finalGrams);

    return { grams: finalGrams, kcal: finalKcal, score: bestScore };
  }

  /* ========== PUBLIC API ========== */
  return {
    init: ({ supabase } = {}) => { initModule({ sup: supabase }); },
    generatePlan: planLongTerm,
    savePlan,
    loadPlans,
    loadLatestPlan,
    deleteLatestPlan,
    findFood,
    calculateEndDate,
    analyzeMasterGoal,
    deriveTargets,
    detectGoalType,
    getFoodCategory,
    getFoodsByCategory,
    getAllFoods,
    calculateEquivalentPortion,
    SLOT_MAP
  };

})(); // end SuperDietEngine IIFE

export default SuperDietEngine;
