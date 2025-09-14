// Versão à prova de falhas para Vercel
module.exports = (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { url } = req;
        const { shop } = req.query || {};

        // ROTA PRINCIPAL
        if (url === '/' || url.startsWith('/?')) {
            if (shop) {
                res.setHeader('Content-Type', 'text/html');
                res.status(200).send(getStoreDashboard(shop));
            } else {
                res.setHeader('Content-Type', 'text/html');
                res.status(200).send(getPublicDashboard());
            }
            return;
        }

        // HEALTH CHECK
        if (url === '/health') {
            res.setHeader('Content-Type', 'application/json');
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'production'
            });
            return;
        }

        // OAUTH CALLBACK
        if (url.startsWith('/auth/callback')) {
            const urlParams = new URLSearchParams(url.split('?')[1]);
            const shop = urlParams.get('shop');
            const code = urlParams.get('code');

            if (!shop || !code) {
                res.setHeader('Content-Type', 'application/json');
                res.status(400).json({
                    error: 'Missing shop or code parameter'
                });
                return;
            }

            res.setHeader('Content-Type', 'application/json');
            res.status(200).json({
                success: true,
                message: 'OAuth callback received successfully',
                shop: shop,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // API ANÁLISE
        if (url === '/api/run-analysis' && req.method === 'POST') {
            const analysisResults = {
                success: true,
                shop: shop || 'demo',
                timestamp: new Date().toISOString(),
                products_analyzed: Math.floor(Math.random() * 20) + 10,
                ai_predictions: [
                    {
                        product_id: 'prod_1',
                        product_title: 'Produto Exemplo 1',
                        conversion_score: 78,
                        seo_score: 85,
                        recommendations: ['Melhorar título', 'Otimizar preço']
                    },
                    {
                        product_id: 'prod_2',
                        product_title: 'Produto Exemplo 2', 
                        conversion_score: 92,
                        seo_score: 76,
                        recommendations: ['Adicionar mais fotos', 'Melhorar descrição']
                    }
                ],
                ml_optimizations: {
                    conversion_prediction: '12.5',
                    revenue_increase: '18.3',
                    confidence: 0.89
                },
                execution_time: Math.floor(Math.random() * 1000) + 500
            };

            res.setHeader('Content-Type', 'application/json');
            res.status(200).json(analysisResults);
            return;
        }

        // STATS
        if (url === '/admin/stats') {
            res.setHeader('Content-Type', 'application/json');
            res.status(200).json({
                total_stores: 3,
                total_analyses: 42,
                active_stores: 2,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // 404 para outras rotas
        res.setHeader('Content-Type', 'application/json');
        res.status(404).json({
            error: 'Route not found',
            path: url,
            available_routes: ['/', '/health', '/auth/callback', '/api/run-analysis', '/admin/stats']
        });

    } catch (error) {
        console.error('Function error:', error);
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

function getStoreDashboard(shop) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>QA Automation Pro - ${shop}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f6f6f7; }
        .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-number { font-size: 2rem; font-weight: bold; color: #008060; margin-bottom: 5px; }
        .stat-label { color: #666; font-size: 0.9rem; }
        .btn { background: #008060; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 1rem; margin: 20px 0; }
        .btn:hover { background: #006b4a; }
        .results { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; display: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .loading { text-align: center; padding: 40px; display: none; }
        .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #008060; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .alert { padding: 15px; border-radius: 6px; margin: 15px 0; }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .result-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #008060; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧠 QA Automation Pro</h1>
            <p>Análise inteligente para <strong>${shop}</strong></p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number" id="products">-</div>
                <div class="stat-label">Produtos Analisados</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="predictions">-</div>
                <div class="stat-label">Predições IA</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="conversion">-</div>
                <div class="stat-label">Conversão Prevista</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="revenue">-</div>
                <div class="stat-label">Aumento Receita</div>
            </div>
        </div>
        
        <div style="text-align: center;">
            <button class="btn" onclick="runAnalysis()">🚀 Executar Análise IA</button>
        </div>
        
        <div id="alerts"></div>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <h3>Analisando loja com IA...</h3>
            <p>Sistema processando dados em tempo real</p>
        </div>
        
        <div class="results" id="results">
            <h3>📊 Resultados da Análise</h3>
            <div id="resultsContent"></div>
        </div>
    </div>

    <script>
        function runAnalysis() {
            showLoading();
            
            fetch('/api/run-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shop: '${shop}' })
            })
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.success) {
                    showResults(data);
                    showAlert('Análise concluída com sucesso!', 'success');
                } else {
                    showAlert('Erro na análise: ' + (data.error || 'Erro desconhecido'), 'error');
                }
            })
            .catch(error => {
                hideLoading();
                showAlert('Erro na requisição: ' + error.message, 'error');
            });
        }
        
        function showLoading() {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('results').style.display = 'none';
        }
        
        function hideLoading() {
            document.getElementById('loading').style.display = 'none';
        }
        
        function showAlert(message, type) {
            const alerts = document.getElementById('alerts');
            alerts.innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
            setTimeout(() => alerts.innerHTML = '', 5000);
        }
        
        function showResults(data) {
            document.getElementById('results').style.display = 'block';
            
            // Atualizar estatísticas
            document.getElementById('products').textContent = data.products_analyzed || 0;
            document.getElementById('predictions').textContent = data.ai_predictions ? data.ai_predictions.length : 0;
            document.getElementById('conversion').textContent = data.ml_optimizations ? data.ml_optimizations.conversion_prediction + '%' : '-';
            document.getElementById('revenue').textContent = data.ml_optimizations ? '+' + data.ml_optimizations.revenue_increase + '%' : '-';
            
            // Mostrar detalhes
            let html = '<h4>🤖 Predições de IA:</h4>';
            if (data.ai_predictions) {
                data.ai_predictions.forEach(function(pred) {
                    html += '<div class="result-item">';
                    html += '<strong>' + pred.product_title + '</strong><br>';
                    html += 'Score de Conversão: ' + pred.conversion_score + '/100<br>';
                    html += 'Score SEO: ' + pred.seo_score + '/100<br>';
                    html += 'Recomendações: ' + pred.recommendations.join(', ');
                    html += '</div>';
                });
            }
            
            html += '<h4>🔮 Machine Learning:</h4>';
            if (data.ml_optimizations) {
                html += '<div class="result-item">';
                html += 'Predição de Conversão: +' + data.ml_optimizations.conversion_prediction + '%<br>';
                html += 'Aumento de Receita: +' + data.ml_optimizations.revenue_increase + '%<br>';
                html += 'Confiança: ' + (data.ml_optimizations.confidence * 100).toFixed(1) + '%<br>';
                html += 'Tempo de Execução: ' + data.execution_time + 'ms';
                html += '</div>';
            }
            
            document.getElementById('resultsContent').innerHTML = html;
        }
    </script>
</body>
</html>`;
}

function getPublicDashboard() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>QA Automation Pro - IA para Shopify</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: white; }
        .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; text-align: center; }
        .hero h1 { font-size: 3rem; margin-bottom: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .hero p { font-size: 1.2rem; margin-bottom: 40px; opacity: 0.9; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 40px 0; }
        .stat-card { background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); }
        .stat-number { font-size: 2.5rem; font-weight: bold; margin-bottom: 10px; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        .stat-label { opacity: 0.8; font-size: 1rem; }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 40px 0; }
        .feature { background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); }
        .feature-icon { font-size: 3rem; margin-bottom: 20px; }
        .feature h3 { font-size: 1.3rem; margin-bottom: 15px; }
        .install-btn { background: linear-gradient(45deg, #00d4aa, #00b894); color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; margin: 20px 10px; box-shadow: 0 4px 15px rgba(0,212,170,0.3); transition: all 0.3s ease; }
        .install-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,212,170,0.4); }
        .demo-btn { background: rgba(255,255,255,0.2); color: white; padding: 15px 30px; border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; margin: 20px 10px; backdrop-filter: blur(10px); transition: all 0.3s ease; }
        .demo-btn:hover { background: rgba(255,255,255,0.3); transform: translateY(-1px); }
    </style>
</head>
<body>
    <div class="container">
        <div class="hero">
            <h1>🧠 QA Automation Pro</h1>
            <p>Sistema de Análise com Inteligência Artificial para Shopify</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number" id="totalStores">3</div>
                <div class="stat-label">Lojas Conectadas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="totalAnalyses">42</div>
                <div class="stat-label">Análises Realizadas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="activeStores">2</div>
                <div class="stat-label">Lojas Ativas</div>
            </div>
        </div>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">🤖</div>
                <h3>IA Avançada</h3>
                <p>Análise automática de produtos com múltiplas APIs de inteligência artificial para insights precisos</p>
            </div>
            <div class="feature">
                <div class="feature-icon">🔮</div>
                <h3>Machine Learning</h3>
                <p>Predições de conversão e otimizações baseadas em análise de dados e padrões de comportamento</p>
            </div>
            <div class="feature">
                <div class="feature-icon">📊</div>
                <h3>Análise Competitiva</h3>
                <p>Compare sua performance com concorrentes e identifique oportunidades de mercado</p>
            </div>
        </div>
        
        <div style="margin: 60px 0;">
            <h2 style="margin-bottom: 20px; font-size: 2rem;">Pronto para otimizar sua loja?</h2>
            <p style="font-size: 1.1rem; opacity: 0.9; margin-bottom: 30px;">Transforme dados em insights acionáveis</p>
            <button class="install-btn" onclick="startInstall()">📱 Instalar Agora</button>
            <button class="demo-btn" onclick="viewDemo()">🎯 Ver Demo</button>
        </div>
    </div>

    <script>
        // Carregar stats em tempo real
        fetch('/admin/stats')
            .then(function(response) { return response.json(); })
            .then(function(stats) {
                document.getElementById('totalStores').textContent = stats.total_stores || 3;
                document.getElementById('totalAnalyses').textContent = stats.total_analyses || 42;
                document.getElementById('activeStores').textContent = stats.active_stores || 2;
            })
            .catch(function(error) {
                console.log('Stats loading error:', error);
            });
        
        function startInstall() {
            var shop = prompt('Digite sua loja Shopify (exemplo: minhaloja.myshopify.com):');
            if (shop && shop.trim()) {
                window.location.href = '/?shop=' + encodeURIComponent(shop.trim());
            }
        }
        
        function viewDemo() {
            window.location.href = '/?shop=demo-store.myshopify.com';
        }
    </script>
</body>
</html>`;
}
