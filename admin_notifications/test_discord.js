require('dotenv').config();

// Node 18+ has native fetch.
// const fetch = require('node-fetch');

const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

async function sendTestNotification() {
    if (!discordWebhookUrl) {
        console.error("❌ Link not found in .env");
        return;
    }

    console.log("🚀 Sending test notification...");

    // Mock Overdue Data
    const mockData = [
        {
            game_name: "테스트 게임 (스플렌더)",
            due_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            renter_name: "테스트 유저",
            user: { phone: "010-0000-0000" }
        }
    ];

    const fields = mockData.map((item, index) => {
        const dueDate = new Date(item.due_date);
        const diffDays = Math.floor((Date.now() - dueDate) / (1000 * 60 * 60 * 24));

        return {
            name: `${index + 1}. ${item.game_name}`,
            value: `👤 **${item.renter_name}** (${item.user.phone})\n⏰ ${dueDate.toLocaleDateString()} (D+${diffDays}일 연체)`,
            inline: false
        };
    });

    const payload = {
        username: process.env.DISCORD_BOT_NAME || "덜지니어스 알림봇 (TEST)",
        avatar_url: process.env.DISCORD_AVATAR_URL || "https://cdn-icons-png.flaticon.com/512/3523/3523063.png",
        embeds: [{
            title: `🧪 테스트 알림입니다`,
            description: `이것은 테스트 메시지입니다. 실제 데이터가 아닙니다.\n현재 **${mockData.length}건**의 테스트 연체 기록이 있습니다.`,
            color: 3447003, // Blue for test
            fields: fields,
            footer: {
                text: "DullGenius Rental System Test"
            }
        }]
    };

    try {
        const response = await fetch(discordWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("✅ Test Notification Sent Successfully!");
        } else {
            console.error(`❌ Failed: ${response.status} ${await response.text()}`);
        }
    } catch (e) {
        console.error("❌ Error:", e);
    }
}

sendTestNotification();
