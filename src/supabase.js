import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pkxsojxigokxbsouaiwy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreHNvanhpZ29reGJzb3VhaXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTUxNTMsImV4cCI6MjA5NDg5MTE1M30.RyNrd3t7rA_uqt7a4l1nUnGIaLHS8G-SERl3U_nnPzo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)