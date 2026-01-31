const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) env[key.trim()] = val.trim();
});

const supabase = createClient(env.REACT_APP_SUPABASE_URL, env.REACT_APP_SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log("🔍 Checking 'game_copies' schema...");

    // Try to select the 'condition' column
    const { data, error } = await supabase
        .from('game_copies')
        .select('id, copy_id, condition, memo')
        .limit(1);

    if (error) {
        console.log("❌ Column check failed.");
        console.log("Error details:", error.message);
        if (error.message.includes("does not exist") || error.code === "PGRST301") {
            console.log("👉 Conclusion: Columns likely DO NOT exist.");
        }
    } else {
        console.log("✅ Query successful!", data);
        console.log("👉 Conclusion: Columns ALREADY EXIST.");
    }
}

checkSchema();
