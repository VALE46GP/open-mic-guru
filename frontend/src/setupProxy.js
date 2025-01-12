const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    const target = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
    app.use(
        '/api',
        createProxyMiddleware({
            target,
            changeOrigin: true,
            pathRewrite: { '^/api': '' },
            // onProxyReq: (proxyReq, req) => {
            //     console.log('Proxying request:', {
            //         method: req.method,
            //         path: req.path,
            //         target: target
            //     });
            // },
            onError: (err, req, res) => {
                console.error('Proxy error:', err);
            }
        })
    );

    app.use(
        '/ws',
        createProxyMiddleware({
            target: target.replace('http', 'ws'),
            ws: true,
            changeOrigin: true
        })
    );
};
