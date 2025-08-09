import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load variables from .env.local
dotenv.config({ path: ".env.local" });

async function testAnon() {
  console.log("🔍 Testing Anon Key (Client-Side)...");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return;
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.from("goals").select("*").limit(1);

  if (error) {
    console.error("❌ Anon Key failed:", error.message);
  } else {
    console.log("✅ Anon Key works. Sample data:", data);
  }
}

async function testServiceRole() {
  console.log("\n🔍 Testing Service Role Key (Server-Side)...");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.from("goals").select("*").limit(1);

  if (error) {
    console.error("❌ Service Role Key failed:", error.message);
  } else {
    console.log("✅ Service Role Key works. Sample data:", data);
  }
}

async function main() {
  await testAnon();
  await testServiceRole();
}

main();
