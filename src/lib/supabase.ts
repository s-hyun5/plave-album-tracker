import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vkijjrvnneavwgezlpbg.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraWpqcnZubmVhdndnZXpscGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMjQ4MjEsImV4cCI6MjA5MDYwMDgyMX0.i79Bo6ojXZi0aJu6nuL-7Q42oErUEZOI-jfdAhyHPAk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
