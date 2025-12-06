import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dtksdpmnsyvlcylhomng.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0a3NkcG1uc3l2bGN5bGhvbW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NzkwMzAsImV4cCI6MjA4MDU1NTAzMH0.2o9IrBgey4-qeYY3xHAqXW0h_rU0CEeG6mYrUEKdIME';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
