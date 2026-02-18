
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import axios from 'axios';

// .env 파일 로드
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BUCKET_NAME = 'game-images';

async function migrate() {
    console.log('🚀 Starting Image Migration...');

    // 1. Fetch all games
    const { data: games, error } = await supabase
        .from('games')
        .select('id, image, name')
        .order('id');

    if (error) {
        console.error('Failed to fetch games:', error);
        return;
    }

    console.log(`Found ${games.length} games to process.`);
    let successCount = 0;
    let failCount = 0;

    for (const game of games) {
        if (!game.image) {
            console.log(`[Skip] Game ${game.id} (${game.name.substring(0, 10)}...) has no image.`);
            continue;
        }

        // 이미 Supabase에 올라간 최적화된 이미지인지 확인 (중복 처리 방지)
        // 단, 사용자가 "재작업"을 원할 수도 있으므로, .webp가 아니거나 외부 링크인 경우만 처리
        if (game.image.includes(supabaseUrl) && game.image.endsWith('.webp')) {
            console.log(`[Skip] Game ${game.id} already optimized.`);
            continue;
        }

        try {
            console.log(`Processing [${game.id}] ${game.name.substring(0, 15)}...`);

            // 2. Download Image
            const response = await axios({
                url: game.image,
                responseType: 'arraybuffer',
                timeout: 10000 // 10초 타임아웃
            });

            const buffer = Buffer.from(response.data);

            // 3. Resize & Optimize (WebP, Max 600px, Keep Aspect Ratio)
            const optimizedBuffer = await sharp(buffer)
                .resize({ width: 600, height: 600, fit: 'inside' })
                .webp({ quality: 80 })
                .toBuffer();

            const fileName = `${game.id}.webp`;

            // 4. Upload to Supabase
            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(fileName, optimizedBuffer, {
                    contentType: 'image/webp',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // 5. Update Database
            const { data: { publicUrl } } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(fileName);

            // 캐싱 무효화를 위해 쿼리 파라미터 추가 (선택사항, 업로드 직후 확인용)
            const finalUrl = `${publicUrl}?v=${Date.now()}`;

            const { error: dbError } = await supabase
                .from('games')
                .update({ image: finalUrl }) // .webp URL로 업데이트
                .eq('id', game.id);

            if (dbError) throw dbError;

            console.log(`  ✅ Done: ${fileName}`);
            successCount++;

        } catch (err) {
            console.error(`  ❌ Failed: ${err.message}`);
            failCount++;
        }
    }

    console.log(`\nMigration Phase 1 Completed. Success: ${successCount}, Failed: ${failCount}`);

    // 6. Cleanup Phase (Delete old non-webp files)
    console.log('\n🧹 Starting Cleanup Phase (Removing old files)...');

    // 리스팅 제한이 있을 수 있으므로 반복해서 가져와야 할 수도 있음 (여기선 단순 예시 1000개)
    const { data: files, error: listError } = await supabase.storage
        .from(BUCKET_NAME)
        .list('', { limit: 1000 });

    if (listError) {
        console.error('Failed to list bucket files:', listError);
    } else {
        const filesToDelete = files
            .filter(f => !f.name.endsWith('.webp') && f.name !== '.emptyFolderPlaceholder')
            .map(f => f.name);

        if (filesToDelete.length > 0) {
            console.log(`Found ${filesToDelete.length} old files to delete:`, filesToDelete);
            const { error: deleteError } = await supabase.storage
                .from(BUCKET_NAME)
                .remove(filesToDelete);

            if (deleteError) {
                console.error('Failed to delete old files:', deleteError);
            } else {
                console.log(`  ✨ Deleted ${filesToDelete.length} files.`);
            }
        } else {
            console.log('  ✨ No old files found directly in root.');
        }
    }

    console.log('🎉 All tasks finished.');
}

migrate();
