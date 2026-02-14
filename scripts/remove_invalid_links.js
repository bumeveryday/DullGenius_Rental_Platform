
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Setup Supabase
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join('=').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        envVars[key] = value;
    }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// List of invalid Game IDs from the report
const invalidIds = [
    13, 15, 149, 46, 171, 20, 180, 47, 120, 136, 177,
    121, 83, 148, 10, 73, 128, 95, 96, 61, 1
];

async function removeLinks() {
    console.log(`Processing ${invalidIds.length} invalid games...`);

    // 1. Fetch details for categorization
    const { data: games, error: fetchError } = await supabase
        .from('games')
        .select('id, name, category, video_url')
        .in('id', invalidIds);

    if (fetchError) {
        console.error('Error fetching game details:', fetchError);
        return;
    }

    // 2. Identify TRPG/Playing Card games
    const trpgKeywords = ['TRPG', 'RPG', '역할극', '마기카로기아', '인세인', '피아스코', '다이얼렉트', '크라켄']; // Based on known titles
    const cardKeywords = ['Card', 'Poker', 'Playing Card', '카드', '플레잉', '진실카드', '원카드', '도둑잡기'];

    const trpgList = [];

    games.forEach(game => {
        const name = game.name || '';
        const lowerName = name.toLowerCase();
        const category = game.category || '';

        let isTrpgOrCard = false;

        // Check Category match
        if (category.includes('TRPG') || category.includes('카드') || category.includes('플레잉')) {
            isTrpgOrCard = true;
        }

        // Check Name match
        if (!isTrpgOrCard) {
            if (trpgKeywords.some(kw => lowerName.includes(kw.toLowerCase()))) isTrpgOrCard = true;
            if (cardKeywords.some(kw => lowerName.includes(kw.toLowerCase()))) isTrpgOrCard = true;
        }

        // Specific known titles check
        if (['노닥노닥 TRPG', '마기카로기아 : 황혼선서', '다이얼렉트', '인세인 1', '인세인 2', '피아스코', '마기카로기아 기본 룰 북', '진실카드게임', '쿼스천 카드 클래식'].includes(name)) {
            isTrpgOrCard = true;
        }

        if (isTrpgOrCard) {
            trpgList.push(game);
        }
    });

    console.log(`Identified ${trpgList.length} potentially TRPG/Card related games.`);

    // 3. Remove Links (Update video_url to null)
    const { error: updateError } = await supabase
        .from('games')
        .update({ video_url: null })
        .in('id', invalidIds);

    if (updateError) {
        console.error('Error removing links:', updateError);
        return;
    }

    console.log('Successfully removed invalid links.');

    // 4. Generate Report
    const reportPath = path.resolve(__dirname, 'removed_trpg_games.md');
    let reportContent = '# 🎲 TRPG 및 카드 게임 리스트 (영상 링크 제거됨)\n\n';
    reportContent += '다음 게임들은 유튜브 링크가 제거되었으며, TRPG 또는 카드 게임 장르로 식별된 항목들입니다. 직접 영상을 찾아 추가해주세요.\n\n';
    reportContent += '| ID | 게임명 | 카테고리 | 기존 링크 (참고용) |\n';
    reportContent += '|:---:|:---|:---|:---|\n';

    trpgList.forEach(g => {
        reportContent += `| ${g.id} | **${g.name}** | ${g.category || '-'} | ${g.video_url || '-'} |\n`;
    });

    fs.writeFileSync(reportPath, reportContent, 'utf8');
    console.log(`Report generated at: ${reportPath}`);
}

removeLinks();
