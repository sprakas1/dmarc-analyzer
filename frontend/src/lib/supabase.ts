import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kvbqrdcehjrkoffzjfmh.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2YnFyZGNlaGpya29mZnpqZm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5OTg2NjgsImV4cCI6MjA2NDU3NDY2OH0.DEor3A0HjrDA2d-JnxQJphDf3pzJCQ0ofShShEjraLg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 