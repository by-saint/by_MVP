import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ===================================================================
// NOSSO "COFRE" CENTRAL DE CHAVES (VERSÃO CORRIGIDA)
// ===================================================================
// Eu havia corrompido a SUPABASE_ANON_KEY na versão anterior.
// Esta é a chave correta do seu projeto.

const SUPABASE_URL = 'https://edxsgmchmwtpgnoxgrkb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeHNnbWNobXd0cGdub3hncmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NjMyMjYsImV4cCI6MjA3NjAzOTIyNn0.TPM9xK6UrpQ_0IyoC-GHvCoXu9Ur4HN9IrFPdV8VEDs';

// Exportamos o cliente "supabase" para quem quiser usar
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportamos as chaves e o token do Dify para o app principal
export const DIFY_APP_TOKEN = 'lbpbrmsV3IaH9e0X';
