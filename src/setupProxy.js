const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
// [FIX] src 폴더 밖의 .env 파일을 정확하게 지정
require('dotenv').config({ path: path.join(__dirname, '../.env') });


module.exports = function (app) {
    app.use(
        '/v1',
        createProxyMiddleware({
            target: 'https://openapi.naver.com/v1', // [FIX] Express가 '/v1'을 제거하고 전달하므로, 타겟에 '/v1'을 명시적으로 붙여줌
            changeOrigin: true,
            // [FIX] http-proxy-middleware v3에서는 'on' 옵션 사용
            on: {
                proxyReq: (proxyReq, req, res) => {
                    // [FIX] .env 파일에서 키 로드 (보안 복구)
                    const clientId = process.env.REACT_APP_NAVER_CLIENT_ID;
                    const clientSecret = process.env.REACT_APP_NAVER_CLIENT_SECRET;

                    if (clientId && clientSecret) {
                        proxyReq.setHeader('X-Naver-Client-Id', clientId);
                        proxyReq.setHeader('X-Naver-Client-Secret', clientSecret);
                        console.log(`[Proxy] API Key injected for ${req.url}`);
                    }
                }
            }
        })
    );
};
