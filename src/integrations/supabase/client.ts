import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ghkhfxjknaersslgufuu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoa2hmeGprbmFlcnNzbGd1ZnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MTc2NjIsImV4cCI6MjA2NDI5MzY2Mn0.QWwFVExzXpkjJMwussOOzAt9q7V-Fw6gfVrPNKW0rGg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);