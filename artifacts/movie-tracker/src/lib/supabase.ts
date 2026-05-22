import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://rcdjmzxiectkckufyqyr.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjZGptenhpZWN0a2NrdWZ5cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjcxOTMsImV4cCI6MjA5MzE0MzE5M30.TNFfE6RDV4MX3H-M8zA-h72lux4Mgdd9srqDFJAJHnE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const ANON_KEY_VALUE = SUPABASE_ANON_KEY;
