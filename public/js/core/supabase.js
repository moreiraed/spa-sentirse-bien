import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Reemplaza estos valores con los de tu proyecto Supabase
const supabaseUrl = "https://mvbpdtdvbgdknvirbsvs.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12YnBkdGR2Ymdka252aXJic3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MTQ1ODQsImV4cCI6MjA3MzI5MDU4NH0.99CWyamO4b5_Xlxou9jmPsHlPBUP1r9ZJiU66GuKEQc";

// Crear y exportar el cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Verificar conexión
supabase.from('services').select('count').then(response => {
    console.log('Conexión a Supabase verificada:', response.error ? response.error : 'OK');
});

// Función para verificar autenticación
export const checkAuth = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
}

// Función para obtener los datos del usuario
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  return { data, error };
};