const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        '/api/naver',
        createProxyMiddleware({
            target: 'https://openapi.naver.com',
            changeOrigin: true,
            pathRewrite: {
                '^/api/naver': '/v1/search/shop.json', // /api/naver -> /v1/search/shop.json 변환
            },
            onProxyReq: (proxyReq) => {
                // .env 파일에서 키를 가져와 헤더에 주입 (클라이언트에는 키 노출 안 됨)
                // 주의: setupProxy.js 수정 후에는 반드시 npm start를 재시작해야 적용됩니다!
                if (process.env.REACT_APP_NAVER_CLIENT_ID && process.env.REACT_APP_NAVER_CLIENT_SECRET) {
                    proxyReq.setHeader('X-Naver-Client-Id', process.env.REACT_APP_NAVER_CLIENT_ID);
                    proxyReq.setHeader('X-Naver-Client-Secret', process.env.REACT_APP_NAVER_CLIENT_SECRET);
                } else {
                    console.warn("⚠️ [Proxy] 네이버 API 키가 .env에 설정되지 않았습니다.");
                }
            }
        })
    );
};
