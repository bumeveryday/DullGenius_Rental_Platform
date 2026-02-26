const fs = require('fs');
const games = JSON.parse(fs.readFileSync('c:\\Users\\USER\\Desktop\\OSS\\BoardGameRent\\dullgboardgamerent\\Supabase backup\\2026-02-15T16-55-08\\games.json', 'utf8'));

const tagCounts = {};
const noTagGames = [];
const gameTags = {};
const gameCache = {};

games.forEach(game => {
    gameCache[game.name] = game;
    if (!game.tags) {
        noTagGames.push(game);
    } else {
        const tags = game.tags.split(' ').filter(t => t.trim() !== '');
        gameTags[game.name] = tags;
        tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    }
});

let output = '=== Tag Frequencies ===\n';
Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
    output += `${tag}: ${count} games\n`;
});

output += '\n=== Games with NO Tags ===\n';
noTagGames.forEach(g => {
    output += `- ${g.name} (Genre: ${g.genre}, Category: ${g.category}, Players: ${g.players})\n`;
});

output += '\n=== Alienated Games (Tags with <= 3 games) ===\n';
const rareTags = Object.keys(tagCounts).filter(tag => tagCounts[tag] <= 3);
games.forEach(game => {
    if (game.tags) {
        const hasRareTag = gameTags[game.name].some(t => rareTags.includes(t));
        if (hasRareTag) {
            output += `- ${game.name}: [${game.tags}] (Genre: ${game.genre}, Players: ${game.players})\n`;
        }
    }
});

fs.writeFileSync('c:\\Users\\USER\\Desktop\\OSS\\BoardGameRent\\dullgboardgamerent\\tag_analysis.txt', output, 'utf8');
console.log('Analysis complete');
