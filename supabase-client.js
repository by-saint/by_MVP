import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ===================================================================
// NOSSO "COFRE" CENTRAL DE CHAVES DO SUPABASE
// ===================================================================
// Todos os outros arquivos (login, signup, index, membros)
// irão importar deste arquivo em vez de copiar as chaves.

const SUPABASE_URL = 'https://edxsgmchmwtpgnoxgrkb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIZUhNwtpgnoxgrkbIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NjMyMjYsImV4cCI6MjA3NjAzOTIyNn0.TPM9xK6UrpQ_0IyoC-GHvCoXu9Ur4HN9IrFPdV8VEDs';

// Exportamos o cliente "supabase" para quem quiser usar
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportamos as chaves e o token do Dify para o app principal
export const DIFY_APP_TOKEN = 'lbpbrmsV3IaH9e0X';
