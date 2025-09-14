// src/qa-engine-simple.js
import fetch from 'node-fetch';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';

// Configurações - apenas Shopify
const CONFIG = {
  shopify: {
    url: 'https://jfu7jv-0i.myshopify.com',
    token: 'process.env.SHOPIFY_ACCESS_TOKEN',
  },
  
  features: {
    autoFix: {
      seoOptimization: true,
      altTextGeneration: true,
      metaTags: true,
      // NÃO PERMITIDAS
      stockUpdates: false,
      priceChanges: false,
      productDescriptions: false
    }
  },
  
  monitoring: {
    interval: 300000, // 5 minutos
  }
};

class SimplifiedShopifyQA {
  constructor() {
    this.isRunning = false;
    this.results = {
      timestamp: new Date().toISOString(),
      issues: [],
      fixes: [],
      seo: [],
      products: []
    };
  }

  async start() {
    console.log(chalk.blue.bold('\n🚀 SHOPIFY QA SIMPLIFICADO INICIADO'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    
    await this.testConnection();
    await this.runAnalysis();
    this.startMonitoring();
    
    console.log(chalk.green('\n✅ Sistema funcionando!'));
    console.log(chalk.blue('📊 Monitoramento ativo a cada 5 minutos'));
    console.log(chalk.yellow('⏹️  Pressione Ctrl+C para parar'));
    
    // Manter processo rodando
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n⏹️  Parando QA Engine...'));
      this.stop();
    });
  }

  async testConnection() {
    const spinner = ora('Testando conexão Shopify...').start();
    
    try {
      const response = await fetch(`${CONFIG.shopify.url}/admin/api/2023-10/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': CONFIG.shopify.token,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Shopify API erro: ${response.status}`);
      }

      const data = await response.json();
      spinner.succeed(`Conectado à loja: ${data.shop?.name || 'Shopify'}`);
      
    } catch (error) {
      spinner.fail(`Erro na conexão: ${error.message}`);
      throw error;
    }
  }

  async runAnalysis() {
    const spinner = ora('Executando análise completa...').start();
    
    try {
      await this.analyzeProducts();
      await this.generateReport();
      spinner.succeed('Análise concluída!');
      
    } catch (error) {
      spinner.fail(`Erro na análise: ${error.message}`);
    }
  }

  async analyzeProducts() {
    try {
      const response = await fetch(`${CONFIG.shopify.url}/admin/api/2023-10/products.json?limit=50`, {
        headers: {
          'X-Shopify-Access-Token': CONFIG.shopify.token,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      const products = data.products || [];
      
      console.log(chalk.blue(`🛍️ Analisando ${products.length} produtos...`));

      for (const product of products) {
        const analysis = await this.analyzeProduct(product);
        this.results.products.push(analysis);
        
        if (analysis.issues.length > 0) {
          this.results.issues.push({
            productId: product.id,
            title: product.title,
            issues: analysis.issues
          });
        }
        
        if (analysis.fixesApplied > 0) {
          this.results.fixes.push({
            productId: product.id,
            title: product.title,
            fixes: analysis.fixesApplied
          });
        }
      }

      console.log(chalk.green(`✅ Análise concluída:`));
      console.log(chalk.white(`   • ${this.results.products.length} produtos analisados`));
      console.log(chalk.white(`   • ${this.results.issues.length} produtos com problemas`));
      console.log(chalk.white(`   • ${this.results.fixes.length} produtos com correções disponíveis`));
      
    } catch (error) {
      console.log(chalk.red(`❌ Erro analisando produtos: ${error.message}`));
    }
  }

  async analyzeProduct(product) {
    const analysis = {
      id: product.id,
      title: product.title,
      issues: [],
      recommendations: [],
      fixesApplied: 0,
      seoScore: 100
    };

    // 1. Verificar imagens e alt text
    if (product.images?.length > 0) {
      const missingAlt = product.images.filter(img => !img.alt || img.alt.trim() === '');
      if (missingAlt.length > 0) {
        analysis.issues.push(`${missingAlt.length} imagens sem alt text`);
        analysis.recommendations.push('Adicionar alt text descritivo nas imagens');
        analysis.seoScore -= 10;
        
        if (CONFIG.features.autoFix.altTextGeneration) {
          console.log(chalk.blue(`🖼️  Correção disponível: alt text para "${product.title}"`));
          analysis.fixesApplied++;
        }
      }
    } else {
      analysis.issues.push('Produto sem imagens');
      analysis.seoScore -= 20;
    }

    // 2. Verificar título
    if (!product.title || product.title.length < 10) {
      analysis.issues.push('Título muito curto (menos de 10 caracteres)');
      analysis.seoScore -= 15;
    }
    
    if (product.title && product.title.length > 70) {
      analysis.issues.push('Título muito longo (mais de 70 caracteres)');
      analysis.seoScore -= 5;
    }

    // 3. Verificar descrição
    const description = product.body_html || '';
    if (!description || description.length < 50) {
      analysis.issues.push('Descrição muito curta ou ausente');
      analysis.seoScore -= 15;
    }

    // 4. Verificar preço
    if (!product.variants || product.variants.length === 0) {
      analysis.issues.push('Produto sem variantes/preços');
      analysis.seoScore -= 20;
    } else {
      const hasPrice = product.variants.some(v => v.price && parseFloat(v.price) > 0);
      if (!hasPrice) {
        analysis.issues.push('Produto sem preço válido');
        analysis.seoScore -= 15;
      }
    }

    // 5. Verificar tags
    if (!product.tags || product.tags.trim() === '') {
      analysis.issues.push('Produto sem tags');
      analysis.recommendations.push('Adicionar tags relevantes para melhor categorização');
      analysis.seoScore -= 10;
    }

    // 6. Verificar tipo de produto
    if (!product.product_type || product.product_type.trim() === '') {
      analysis.issues.push('Tipo de produto não definido');
      analysis.seoScore -= 5;
    }

    // 7. Verificar SEO específico
    if (!product.metafields || product.metafields.length === 0) {
      analysis.issues.push('Metafields SEO faltando');
      analysis.recommendations.push('Configurar metafields para melhor SEO');
      
      if (CONFIG.features.autoFix.seoOptimization) {
        console.log(chalk.blue(`🔍 Correção disponível: SEO para "${product.title}"`));
        analysis.fixesApplied++;
      }
    }

    // 8. Verificar handle/URL
    if (product.handle && product.handle.includes('_')) {
      analysis.issues.push('URL contém underscore (melhor usar hífen)');
      analysis.seoScore -= 5;
    }

    return analysis;
  }

  async generateReport() {
    const timestamp = new Date().toISOString();
    const report = {
      timestamp,
      summary: {
        totalProducts: this.results.products.length,
        productsWithIssues: this.results.issues.length,
        fixesAvailable: this.results.fixes.length,
        averageSeoScore: this.calculateAverageSeoScore()
      },
      topIssues: this.getTopIssues(),
      recommendations: this.getTopRecommendations(),
      details: {
        issues: this.results.issues,
        fixes: this.results.fixes,
        products: this.results.products
      }
    };

    const fileName = `reports/qa-report-${Date.now()}.json`;
    await fs.writeFile(fileName, JSON.stringify(report, null, 2));
    
    console.log(chalk.blue(`\n📊 Relatório detalhado: ${fileName}`));
    console.log(chalk.green(`📈 Resumo da análise:`));
    console.log(chalk.white(`   • ${report.summary.totalProducts} produtos analisados`));
    console.log(chalk.white(`   • ${report.summary.productsWithIssues} produtos com problemas`));
    console.log(chalk.white(`   • ${report.summary.fixesAvailable} correções disponíveis`));
    console.log(chalk.white(`   • SEO Score médio: ${report.summary.averageSeoScore}%`));
    
    if (report.topIssues.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Principais problemas encontrados:`));
      report.topIssues.slice(0, 3).forEach(issue => {
        console.log(chalk.gray(`   • ${issue.type} (${issue.count} produtos)`));
      });
    }
  }

  calculateAverageSeoScore() {
    if (this.results.products.length === 0) return 100;
    
    const totalScore = this.results.products.reduce((sum, p) => sum + p.seoScore, 0);
    return Math.round(totalScore / this.results.products.length);
  }

  getTopIssues() {
    const issueCount = {};
    
    this.results.products.forEach(product => {
      product.issues.forEach(issue => {
        issueCount[issue] = (issueCount[issue] || 0) + 1;
      });
    });
    
    return Object.entries(issueCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  getTopRecommendations() {
    const recCount = {};
    
    this.results.products.forEach(product => {
      product.recommendations?.forEach(rec => {
        recCount[rec] = (recCount[rec] || 0) + 1;
      });
    });
    
    return Object.entries(recCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  startMonitoring() {
    this.isRunning = true;
    console.log(chalk.blue('⏰ Monitoramento automático iniciado (5 minutos)'));
    
    setInterval(async () => {
      if (this.isRunning) {
        console.log(chalk.cyan('\n⏰ Executando análise automática...'));
        await this.runAnalysis();
      }
    }, CONFIG.monitoring.interval);
  }

  stop() {
    this.isRunning = false;
    console.log(chalk.green('✅ QA Engine parado com sucesso!'));
    process.exit(0);
  }
}

// Iniciar automaticamente
const qaEngine = new SimplifiedShopifyQA();
qaEngine.start().catch(error => {
  console.error(chalk.red('❌ Erro fatal:'), error.message);
  process.exit(1);
});
