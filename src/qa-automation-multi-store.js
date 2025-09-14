const express = require('express');
const app = express();

app.use(express.json());

// Dados em memória
const appData = {
    stores: new Map(),
    sessions: [],
    stats: { total_stores: 0, total_analyses: 0, active_stores: 0 }
};

// ROTA PRINCIPAL
app.get('/', (req, res) => {
    const { shop } = req.query;
    
    if (shop) {
        // Se tem shop, mostrar dashboard da loja
        res.send(generateStoreDashboard(shop));
    } else {
        // Dashboard público
        res.send(generatePublicDashboard());
    }
});

// ROTA DE CALLBACK OAUTH
app.get('/auth/callback', async (req, res) => {
    const { shop, code } = req.query;
    
    if (!shop || !code) {
        return res.status(400).json({
            error: 'Parâmetros ausentes',
            message: 'shop e code são obrigatórios'
        });
    }
    
    try {
        // Simular troca do código por token (implementar OAuth real depois)
        const fakeToken = 'token_' + Math.random().toString(36).substr(2, 9);
        
        // Salvar loja
        appData.stores.set(shop, {
            shop_domain: shop,
            access_token: fakeToken,
            installed_at: new Date(),
            total_analyses: 0
        });
        
        appData.stats.total_stores = appData.stores.size;
        
        res.json({
            success: true,
            message: 'App instalado com sucesso!',
            shop: shop,
            next_step: 'Acesse seu admin Shopify'
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Erro na instalação',
            message: error.message
        });
    }
});

// API PARA EXECUTAR ANÁLISE
app.post('/api/run-analysis', async (req, res) => {
    const { shop } = req.body;
    
    try {
        const startTime = Date.now();
        
        // Análise simulada
        const analysisResults = {
            shop: shop || 'demo',
            timestamp: new Date().toISOString(),
            products_analyzed: Math.floor(Math.random() * 50) + 10,
            ai_predictions: [],
            ml_optimizations: {
                conversion_prediction: (Math.random() * 15 + 5).toFixed(2),
                revenue_increase: (Math.random() * 25 + 10).toFixed(2),
                confidence: 0.87
            },
            competitor_analysis: {
                market_position: 'Middle',
                pricing_advantage: 12.5,
                traffic_comparison: -8.3
            },
            execution_time: Date.now() - startTime
        };
        
        // Adicionar algumas predições IA simuladas
        for (let i = 0; i < 3; i++) {
            analysisResults.ai_predictions.push({
                product_id: 'prod_' + (i + 1),
                product_title: `Produto ${i + 1}`,
                conversion_score: Math.floor(Math.random() * 40) + 60,
                seo_score: Math.floor(Math.random() * 30) + 70,
                recommendations: [
                    'Otimizar título',
                    'Melhorar descrição',
                    'Ajustar preço'
                ]
            });
        }
        
        // Salvar sessão
        appData.sessions.push({
            id: appData.sessions.length + 1,
            shop: shop || 'demo',
            results: analysisResults,
            created_at: new Date()
        });
        
        // Atualizar stats
        if (shop && appData.stores.has(shop)) {
            const storeData = appData.stores.get(shop);
            storeData.total_analyses = (storeData.total_analyses || 0) + 1;
            storeData.last_analysis = new Date();
        }
        
        appData.stats.total_analyses++;
        
        res.json({
            success: true,
            results: analysisResults
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Erro na análise',
            message: error.message
        });
    }
});

// STATS ADMIN
app.get('/admin/stats', (req, res) => {
    const activeStores = Array.from(appData.stores.values()).filter(store => {
        if (!store.last_analysis) return false;
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        return new Date(store.last_analysis) > lastWeek;
    }).length;
    
    res.json({
        total_stores: appData.stores.size,
        total_analyses: appData.stats.total_analyses,
        active_stores: activeStores,
        recent_sessions: appData.sessions.slice(-5)
    });
});

// HEALTH CHECK
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        stores_connected: appData.stores.size,
        total_analyses: appData.stats.total_analyses
    });
});

// FUNÇÕES DE TEMPLATE
function generateStoreDashboard(shop) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>QA Automation Pro - ${shop}</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f6f6f7; }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2rem; font-weight: bold; color: #008060; }
        .stat-label { color: #666; font-size: 0.9rem; }
        .btn { background: #008060; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 1rem; }
        .btn:hover { background: #006b4a; }
        .results { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; display: none; }
        .loading { text-align: center; padding: 40px; display: none; }
        .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #008060; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .alert { padding: 15px; border-radius: 6px; margin: 15px 0; }
        .alert-success { background: #d4edda; color: #155724; }
        .alert-error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧠 QA Automation Pro</h1>
            <p>Análise inteligente para ${shop}</p>
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
        
        <div style="text-align: center; margin: 30px 0;">
            <button class="btn" onclick="runAnalysis()">🚀 Executar Análise IA</button>
        </div>
        
        <div id="alerts"></div>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <h3>Analisando loja com IA...</h3>
        </div>
        
        <div class="results" id="results">
            <h3>📊 Resultados da Análise</h3>
            <div id="resultsContent"></div>
        </div>
    </div>

    <script>
        async function runAnalysis() {
            showLoading();
            
            try {
                const response = await fetch('/api/run-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shop: '${shop}' })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    hideLoading();
                    showResults(data.results);
                    showAlert('Análise concluída com sucesso!', 'success');
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                hideLoading();
                showAlert('Erro: ' + error.message, 'error');
            }
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
        
        function showResults(results) {
            document.getElementById('results').style.display = 'block';
            
            // Atualizar estatísticas
            document.getElementById('products').textContent = results.products_analyzed;
            document.getElementById('predictions').textContent = results.ai_predictions.length;
            document.getElementById('conversion').textContent = results.ml_optimizations.conversion_prediction + '%';
            document.getElementById('revenue').textContent = '+' + results.ml_optimizations.revenue_increase + '%';
            
            // Mostrar detalhes
            let html = '<h4>🤖 Predições de IA:</h4>';
            results.ai_predictions.forEach(pred => {
                html += '<div style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 6px;">';
                html += '<strong>' + pred.product_title + '</strong><br>';
                html += 'Score de Conversão: ' + pred.conversion_score + '/100<br>';
                html += 'Score SEO: ' + pred.seo_score + '/100<br>';
                html += 'Recomendações: ' + pred.recommendations.join(', ');
                html += '</div>';
            });
            
            html += '<h4>🔮 Machine Learning:</h4>';
            html += '<div style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 6px;">';
            html += 'Predição de Conversão: +' + results.ml_optimizations.conversion_prediction + '%<br>';
            html += 'Aumento de Receita: +' + results.ml_optimizations.revenue_increase + '%<br>';
            html += 'Confiança: ' + (results.ml_optimizations.confidence * 100).toFixed(1) + '%';
            html += '</div>';
            
            document.getElementById('resultsContent').innerHTML = html;
        }
    </script>
</body>
</html>`;
}

function generatePublicDashboard() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>QA Automation Pro - IA para Shopify</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: white; }
        .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; text-align: center; }
        .hero h1 { font-size: 3rem; margin-bottom: 20px; }
        .hero p { font-size: 1.2rem; margin-bottom: 40px; opacity: 0.9; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 40px 0; }
        .stat-card { background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 30px; border-radius: 12px; }
        .stat-number { font-size: 2.5rem; font-weight: bold; }
        .stat-label { opacity: 0.8; margin-top: 10px; }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 40px 0; }
        .feature { background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 30px; border-radius: 12px; }
        .feature-icon { font-size: 3rem; margin-bottom: 20px; }
        .install-btn { background: #00d4aa; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; margin: 20px 0; }
        .install-btn:hover { background: #00b894; }
    </style>
</head>
<body>
    <div class="container">
        <div class="hero">
            <h1>🧠 QA Automation Pro</h1>
            <p>Sistema de Análise com IA para Lojas Shopify</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number" id="totalStores">0</div>
                <div class="stat-label">Lojas Conectadas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="totalAnalyses">0</div>
                <div class="stat-label">Análises Realizadas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="activeStores">0</div>
                <div class="stat-label">Lojas Ativas</div>
            </div>
        </div>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">🤖</div>
                <h3>IA Avançada</h3>
                <p>Análise automática de produtos com inteligência artificial</p>
            </div>
            <div class="feature">
                <div class="feature-icon">🔮</div>
                <h3>Machine Learning</h3>
                <p>Predições de conversão baseadas em dados</p>
            </div>
            <div class="feature">
                <div class="feature-icon">📊</div>
                <h3>Análise Competitiva</h3>
                <p>Compare sua loja com a concorrência</p>
            </div>
        </div>
        
        <div>
            <h2>Pronto para otimizar sua loja?</h2>
            <button class="install-btn" onclick="startInstall()">Instalar Agora</button>
        </div>
    </div>

    <script>
        // Carregar stats
        fetch('/admin/stats')
            .then(r => r.json())
            .then(stats => {
                document.getElementById('totalStores').textContent = stats.total_stores;
                document.getElementById('totalAnalyses').textContent = stats.total_analyses;
                document.getElementById('activeStores').textContent = stats.active_stores;
            })
            .catch(() => {});
        
        function startInstall() {
            const shop = prompt('Digite sua loja Shopify (ex: minhaloja.myshopify.com):');
            if (shop) {
                window.location.href = '/?shop=' + shop;
            }
        }
    </script>
</body>
</html>`;
}

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path,
        available_routes: ['/', '/health', '/auth/callback', '/api/run-analysis', '/admin/stats']
    });
});

// Para Vercel
module.exports = app;
