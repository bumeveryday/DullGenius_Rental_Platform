const fetch = require('node-fetch');

async function testWeserv() {
    const testImageUrl = 'shopping-phinf.pstatic.net/main_3661848/36618482618.20230206105436.jpg'; // 예시 네이버 쇼핑 이미지

    // 1. URL 인코딩 테스트 패턴 1 (현재 방식)
    const proxyUrl1 = `https://images.weserv.nl/?url=${encodeURIComponent(testImageUrl)}&w=600&output=webp&il`;
    console.log("Testing URL 1:", proxyUrl1);
    try {
        const res1 = await fetch(proxyUrl1);
        console.log("Result 1 OK:", res1.ok, "Status:", res1.status);
        if (!res1.ok) {
            console.log("Error text:", await res1.text());
        }
    } catch (e) {
        console.error("Error 1:", e.message);
    }

    // 2. HTTP/HTTPS 스키마 포함 인코딩
    const testImageUrl2 = 'https://shopping-phinf.pstatic.net/main_3661848/36618482618.20230206105436.jpg';
    const proxyUrl2 = `https://images.weserv.nl/?url=${encodeURIComponent(testImageUrl2)}&w=600&output=webp&il`;
    console.log("\nTesting URL 2:", proxyUrl2);
    try {
        const res2 = await fetch(proxyUrl2);
        console.log("Result 2 OK:", res2.ok, "Status:", res2.status);
        if (!res2.ok) {
            console.log("Error text:", await res2.text());
        }
    } catch (e) {
        console.error("Error 2:", e.message);
    }
}

testWeserv();
