import fetch from 'node-fetch';
import chalk from 'chalk';
import fs from 'fs/promises';

const CONFIG = {
  shopify: {
    url: 'https://jfu7jv-0i.myshopify.com',
    token: 'process.env.SHOPIFY_ACCESS_TOKEN'
  }
};

class ShopifyQAAutomation {
  constructor() {
    this.qaResults = {
      timestamp: new Date().toISOString(),
      totalProducts: 0,
      issues: [],
      recommendations: [],
      autoFixQueue: []
    };
    
    this.fixStats = {
      attempted: 0,
      successful: 0,
      failed: 0,
      skipped: 0
    };
  }

  async start() {
    console.log(chalk.blue.bold('\n🔍 SHOPIFY QA AUTOMATION - ANÁLISE + CORREÇÃO'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    
    // FASE 1: QA - Análise completa
    console.log(chalk.blue('\n📋 FASE 1: QUALITY ASSURANCE (Análise)'));
    await this.runQualityAssurance();
    
    // Mostrar resultados da análise
    await this.showQAReport();
    
    // FASE 2: AUTOMATION - Correções automáticas
    if (this.qaResults.autoFixQueue.length > 0) {
      console.log(chalk.blue('\n🤖 FASE 2: AUTOMATION (Correções Automáticas)'));
      await this.runAutomation();
      
      // Mostrar resultados finais
      this.showAutomationResults();
    } else {
      console.log(chalk.green('\n✅ Todos os produtos já estão otimizados!'));
    }
  }

  async runQualityAssurance() {
    console.log(chalk.yellow('Conectando e coletando dados...'));
    
    await this.testConnection();
    const products = await this.getAllProducts();
    
    console.log(chalk.blue(`Analisando ${products.length} produtos...`));
    
    for (const product of products) {
      const analysis = this.analyzeProductQuality(product);
      
      if (analysis.hasIssues) {
        this.qaResults.issues.push({
          productId: product.id,
          title: product.title,
          issues: analysis.issues,
          severity: analysis.severity,
          recommendations: analysis.recommendations
        });
        
        // Adicionar à fila de correção automática
        this.qaResults.autoFixQueue.push({
          product: product,
          fixActions: analysis.autoFixActions
        });
      }
      
      this.qaResults.totalProducts++;
    }
  }

  analyzeProductQuality(product) {
    const analysis = {
      hasIssues: false,
      issues: [],
      recommendations: [],
      severity: 'low',
      autoFixActions: []
    };

    // 1. Análise de ALT TEXT
    const missingAltImages = product.images?.filter(img => !img.alt || img.alt.trim() === '') || [];
    if (missingAltImages.length > 0) {
      analysis.hasIssues = true;
      analysis.issues.push(`${missingAltImages.length} imagens sem alt text`);
      analysis.recommendations.push('Adicionar alt text descritivo para SEO e acessibilidade');
      analysis.autoFixActions.push('ADD_ALT_TEXT');
      analysis.severity = 'high';
    }

    // 2. Análise de TAGS SEO
    const currentTags = (product.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const hasSeoTags = currentTags.some(tag => 
      tag.toLowerCase().includes('seo') || 
      tag.toLowerCase().includes('optimized')
    );
    
    if (!hasSeoTags || currentTags.length < 3) {
      analysis.hasIssues = true;
      analysis.issues.push('Tags SEO insuficientes');
      analysis.recommendations.push('Adicionar tags relevantes para melhor categorização');
      analysis.autoFixActions.push('ADD_SEO_TAGS');
      analysis.severity = analysis.severity === 'high' ? 'high' : 'medium';
    }

    // 3. Análise de META TAGS
    if (!product.seo_title || !product.seo_description) {
      analysis.hasIssues = true;
      analysis.issues.push('Meta tags SEO faltando');
      analysis.recommendations.push('Configurar meta title e description para SERP');
      analysis.autoFixActions.push('ADD_META_TAGS');
      analysis.severity = analysis.severity === 'high' ? 'high' : 'medium';
    }

    // 4. Análise de TIPO DE PRODUTO
    if (!product.product_type || product.product_type.trim() === '') {
      analysis.hasIssues = true;
      analysis.issues.push('Tipo de produto não definido');
      analysis.recommendations.push('Definir categoria para melhor organização');
      analysis.autoFixActions.push('SET_PRODUCT_TYPE');
    }

    // 5. Análise de TÍTULO
    if (product.title.length > 70) {
      analysis.hasIssues = true;
      analysis.issues.push('Título muito longo para SEO');
      analysis.recommendations.push('Considerar encurtar título para melhor performance em buscas');
    }

    return analysis;
  }

  async showQAReport() {
    console.log(chalk.blue.bold('\n📊 RELATÓRIO DE QUALITY ASSURANCE'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    
    console.log(chalk.white(`📦 Total de produtos analisados: ${this.qaResults.totalProducts}`));
    console.log(chalk.yellow(`⚠️  Produtos com problemas: ${this.qaResults.issues.length}`));
    console.log(chalk.blue(`🔧 Produtos para correção automática: ${this.qaResults.autoFixQueue.length}`));
    
    if (this.qaResults.issues.length > 0) {
      console.log(chalk.yellow('\n🔍 PRINCIPAIS PROBLEMAS DETECTADOS:'));
      
      const issueTypes = {};
      this.qaResults.issues.forEach(item => {
        item.issues.forEach(issue => {
          issueTypes[issue] = (issueTypes[issue] || 0) + 1;
        });
      });
      
      Object.entries(issueTypes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([issue, count]) => {
          console.log(chalk.gray(`   • ${issue} (${count} produtos)`));
        });
    }
    
    // Salvar relatório QA
    const qaReportFile = `reports/qa-analysis-${Date.now()}.json`;
    await fs.writeFile(qaReportFile, JSON.stringify(this.qaResults, null, 2));
    console.log(chalk.blue(`💾 Relatório QA salvo: ${qaReportFile}`));
  }

  async runAutomation() {
    console.log(chalk.yellow(`Iniciando correções automáticas em ${this.qaResults.autoFixQueue.length} produtos...`));
    
    for (const item of this.qaResults.autoFixQueue) {
      await this.applyAutomatedFixes(item.product, item.fixActions);
    }
  }

  async applyAutomatedFixes(product, fixActions) {
    console.log(chalk.cyan(`\n🔧 Corrigindo: ${product.title.substring(0, 50)}...`));
    
    for (const action of fixActions) {
      this.fixStats.attempted++;
      
      switch (action) {
        case 'ADD_ALT_TEXT':
          await this.fixAltText(product);
          break;
        case 'ADD_SEO_TAGS':
          await this.fixSeoTags(product);
          break;
        case 'ADD_META_TAGS':
          await this.fixMetaTags(product);
          break;
        case 'SET_PRODUCT_TYPE':
          await this.fixProductType(product);
          break;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async fixAltText(product) {
    const imagesToFix = product.images?.filter(img => !img.alt || img.alt.trim() === '') || [];
    
    for (const image of imagesToFix) {
      const altText = this.generateAltText(product.title);
      
      try {
        const response = await fetch(`${CONFIG.shopify.url}/admin/api/2023-10/products/${product.id}/images/${image.id}.json`, {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': CONFIG.shopify.token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: { id: image.id, alt: altText }
          })
        });
        
        if (response.ok) {
          console.log(chalk.green(`  ✅ Alt text adicionado`));
          this.fixStats.successful++;
        } else {
          console.log(chalk.red(`  ❌ Erro alt text: ${response.status}`));
          this.fixStats.failed++;
        }
      } catch (error) {
        console.log(chalk.red(`  ❌ Erro alt text: ${error.message}`));
        this.fixStats.failed++;
      }
    }
  }

  async fixSeoTags(product) {
    const currentTags = (product.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const seoTags = this.generateSeoTags(product.title);
    const newTags = seoTags.filter(tag => !currentTags.some(existing => existing.toLowerCase() === tag.toLowerCase()));
    
    if (newTags.length === 0) {
      this.fixStats.skipped++;
      return;
    }
    
    const allTags = [...currentTags, ...newTags].join(', ');
    
    try {
      const response = await fetch(`${CONFIG.shopify.url}/admin/api/2023-10/products/${product.id}.json`, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': CONFIG.shopify.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product: { id: product.id, tags: allTags }
        })
      });
      
      if (response.ok) {
        console.log(chalk.green(`  ✅ ${newTags.length} tags SEO adicionadas`));
        this.fixStats.successful++;
      } else {
        console.log(chalk.red(`  ❌ Erro tags: ${response.status}`));
        this.fixStats.failed++;
      }
    } catch (error) {
      console.log(chalk.red(`  ❌ Erro tags: ${error.message}`));
      this.fixStats.failed++;
    }
  }

  async fixMetaTags(product) {
    const metaTitle = this.generateMetaTitle(product.title);
    const metaDescription = this.generateMetaDescription(product.title);
    
    try {
      const response = await fetch(`${CONFIG.shopify.url}/admin/api/2023-10/products/${product.id}.json`, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': CONFIG.shopify.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product: {
            id: product.id,
            seo_title: metaTitle,
            seo_description: metaDescription
          }
        })
      });
      
      if (response.ok) {
        console.log(chalk.green(`  ✅ Meta tags SEO configuradas`));
        this.fixStats.successful++;
      } else {
        console.log(chalk.red(`  ❌ Erro meta tags: ${response.status}`));
        this.fixStats.failed++;
      }
    } catch (error) {
      console.log(chalk.red(`  ❌ Erro meta tags: ${error.message}`));
      this.fixStats.failed++;
    }
  }

  async fixProductType(product) {
    const productType = this.generateProductType(product.title);
    
    try {
      const response = await fetch(`${CONFIG.shopify.url}/admin/api/2023-10/products/${product.id}.json`, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': CONFIG.shopify.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product: { id: product.id, product_type: productType }
        })
      });
      
      if (response.ok) {
        console.log(chalk.green(`  ✅ Tipo "${productType}" definido`));
        this.fixStats.successful++;
      } else {
        console.log(chalk.red(`  ❌ Erro tipo: ${response.status}`));
        this.fixStats.failed++;
      }
    } catch (error) {
      console.log(chalk.red(`  ❌ Erro tipo: ${error.message}`));
      this.fixStats.failed++;
    }
  }

  showAutomationResults() {
    console.log(chalk.blue.bold('\n🎉 AUTOMATION CONCLUÍDA!'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.blue(`🔧 Correções tentadas: ${this.fixStats.attempted}`));
    console.log(chalk.green(`✅ Correções bem-sucedidas: ${this.fixStats.successful}`));
    console.log(chalk.yellow(`⏭️  Correções puladas: ${this.fixStats.skipped}`));
    console.log(chalk.red(`❌ Correções com erro: ${this.fixStats.failed}`));
    
    const successRate = this.fixStats.attempted > 0 ? 
      Math.round((this.fixStats.successful / this.fixStats.attempted) * 100) : 0;
    
    console.log(chalk.blue.bold(`\n📈 Taxa de sucesso: ${successRate}%`));
  }

  // Métodos auxiliares (connection, getAllProducts, generate functions)
  async testConnection() {
    const response = await fetch(`${CONFIG.shopify.url}/admin/api/2023-10/shop.json`, {
      headers: { 'X-Shopify-Access-Token': CONFIG.shopify.token }
    });
    
    if (!response.ok) throw new Error(`Conexão falhou: ${response.status}`);
    
    const data = await response.json();
    console.log(chalk.green(`✅ Conectado: ${data.shop.name}`));
  }

  async getAllProducts() {
    const response = await fetch(`${CONFIG.shopify.url}/admin/api/2023-10/products.json?limit=250`, {
      headers: { 'X-Shopify-Access-Token': CONFIG.shopify.token }
    });
    
    const data = await response.json();
    return data.products || [];
  }

  generateAltText(title) {
    return title.replace(/[^\w\s-]/gi, '').trim().split(' ').slice(0, 10).join(' ');
  }

  generateSeoTags(title) {
    const words = title.toLowerCase().replace(/[^\w\s-]/gi, '').split(' ').filter(w => w.length > 3);
    return [...new Set([...words.slice(0, 3), 'SEO Optimized', 'Quality Product'])];
  }

  generateMetaTitle(title) {
    if (title.length <= 57) return title + ' | VitrineTemTudo';
    return title.substring(0, 45) + '... | VitrineTemTudo';
  }

  generateMetaDescription(title) {
    return `Compre ${title} com melhor preço e qualidade garantida. Entrega rápida e segura na VitrineTemTudo.`.substring(0, 157) + '...';
  }

  generateProductType(title) {
    const titleLower = title.toLowerCase();
    const categories = {
      'Electronics': ['phone', 'watch', 'charger', 'smart', 'digital', 'bluetooth'],
      'Home & Garden': ['home', 'kitchen', 'bathroom', 'holder', 'garden'],
      'Fashion': ['clothing', 'jacket', 'fashion', 'wear', 'bracelet'],
      'Health & Beauty': ['beauty', 'massage', 'fitness', 'health'],
      'Sports & Outdoors': ['sport', 'game', 'ball'],
      'Automotive': ['car', 'auto'],
      'Toys & Games': ['toy', 'game', 'children', 'blocks'],
      'Tools': ['tool', 'equipment', 'razor']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        return category;
      }
    }
    return 'General Products';
  }
}

// Iniciar QA Automation
const qaAutomation = new ShopifyQAAutomation();
qaAutomation.start().catch(error => {
  console.error(chalk.red('❌ Erro fatal:'), error.message);
});
