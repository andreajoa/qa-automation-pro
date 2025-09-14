import fetch from 'node-fetch';
import chalk from 'chalk';

const CONFIG = {
  shopify: {
    url: 'https://jfu7jv-0i.myshopify.com',
    token: 'process.env.SHOPIFY_ACCESS_TOKEN'
  }
};

let stats = { altText: 0, tags: 0, metaTags: 0, productType: 0, errors: 0 };

async function startRealFix() {
  console.log(chalk.blue.bold('\n🤖 SHOPIFY AUTO-FIX REAL - APLICANDO CORREÇÕES'));
  console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  
  try {
    await testConnection();
    const products = await getProducts();
    
    console.log(chalk.blue(`\n🛍️ Processando ${Math.min(products.length, 5)} produtos...`));
    
    for (const product of products.slice(0, 5)) {
      await fixProduct(product);
    }
    
    showResults();
    
  } catch (error) {
    console.log(chalk.red(`❌ Erro: ${error.message}`));
  }
}

async function testConnection() {
  const response = await fetch(`${CONFIG.shopify.url}/admin/api/2023-10/shop.json`, {
    headers: { 'X-Shopify-Access-Token': CONFIG.shopify.token }
  });
  
  if (!response.ok) throw new Error(`Conexão falhou: ${response.status}`);
  
  const data = await response.json();
  console.log(chalk.green(`✅ Conectado: ${data.shop.name}`));
}

async function getProducts() {
  const response = await fetch(`${CONFIG.shopify.url}/admin/api/2023-10/products.json?limit=50`, {
    headers: { 'X-Shopify-Access-Token': CONFIG.shopify.token }
  });
  
  const data = await response.json();
  return data.products || [];
}

async function fixProduct(product) {
  console.log(chalk.cyan(`\n🔧 ${product.title.substring(0, 40)}...`));
  
  // 1. Corrigir ALT TEXT
  await fixAltText(product);
  
  // 2. Adicionar TAGS
  await fixTags(product);
  
  // 3. Adicionar META TAGS
  await fixMetaTags(product);
  
  // 4. Definir TIPO PRODUTO
  await fixProductType(product);
}

async function fixAltText(product) {
  const imagesToFix = product.images?.filter(img => !img.alt || img.alt.trim() === '') || [];
  
  if (imagesToFix.length === 0) {
    console.log(chalk.gray('  🖼️  Alt text: já otimizado'));
    return;
  }
  
  console.log(chalk.yellow(`  🖼️  Corrigindo ${imagesToFix.length} imagens...`));
  
  for (const image of imagesToFix) {
    const altText = generateAltText(product.title);
    
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
        console.log(chalk.green(`    ✅ "${altText}"`));
        stats.altText++;
      } else {
        console.log(chalk.red(`    ❌ Erro ${response.status}`));
        stats.errors++;
      }
    } catch (error) {
      console.log(chalk.red(`    ❌ Erro: ${error.message}`));
      stats.errors++;
    }
  }
}

async function fixTags(product) {
  const currentTags = (product.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  const seoTags = generateSeoTags(product.title);
  const newTags = seoTags.filter(tag => !currentTags.some(existing => existing.toLowerCase() === tag.toLowerCase()));
  
  if (newTags.length === 0) {
    console.log(chalk.gray('  🏷️  Tags: já otimizadas'));
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
      console.log(chalk.green(`  ✅ Tags adicionadas: ${newTags.join(', ')}`));
      stats.tags++;
    } else {
      console.log(chalk.red(`  ❌ Erro tags: ${response.status}`));
      stats.errors++;
    }
  } catch (error) {
    console.log(chalk.red(`  ❌ Erro tags: ${error.message}`));
    stats.errors++;
  }
}

async function fixMetaTags(product) {
  if (product.seo_title || product.seo_description) {
    console.log(chalk.gray('  📋 Meta tags: já definidas'));
    return;
  }
  
  const metaTitle = generateMetaTitle(product.title);
  const metaDescription = generateMetaDescription(product.title);
  
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
      console.log(chalk.green(`  ✅ Meta title: "${metaTitle}"`));
      console.log(chalk.green(`  ✅ Meta desc: "${metaDescription.substring(0, 40)}..."`));
      stats.metaTags++;
    } else {
      console.log(chalk.red(`  ❌ Erro meta: ${response.status}`));
      stats.errors++;
    }
  } catch (error) {
    console.log(chalk.red(`  ❌ Erro meta: ${error.message}`));
    stats.errors++;
  }
}

async function fixProductType(product) {
  if (product.product_type && product.product_type.trim() !== '') {
    console.log(chalk.gray('  📦 Tipo: já definido'));
    return;
  }
  
  const productType = generateProductType(product.title);
  
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
      console.log(chalk.green(`  ✅ Tipo definido: "${productType}"`));
      stats.productType++;
    } else {
      console.log(chalk.red(`  ❌ Erro tipo: ${response.status}`));
      stats.errors++;
    }
  } catch (error) {
    console.log(chalk.red(`  ❌ Erro tipo: ${error.message}`));
    stats.errors++;
  }
}

function generateAltText(title) {
  return title.replace(/[^\w\s-]/gi, '').trim().split(' ').slice(0, 8).join(' ');
}

function generateSeoTags(title) {
  const words = title.toLowerCase().replace(/[^\w\s-]/gi, '').split(' ').filter(w => w.length > 3);
  return [...new Set([...words.slice(0, 3), 'SEO Optimized', 'Quality Product'])];
}

function generateMetaTitle(title) {
  if (title.length <= 57) return title + ' | VitrineTemTudo';
  return title.substring(0, 45) + '... | VitrineTemTudo';
}

function generateMetaDescription(title) {
  return `Compre ${title} com melhor preço e qualidade garantida. Entrega rápida e segura na VitrineTemTudo.`.substring(0, 157) + '...';
}

function generateProductType(title) {
  const titleLower = title.toLowerCase();
  const categories = {
    'Electronics': ['phone', 'watch', 'charger', 'smart', 'digital', 'bluetooth'],
    'Home & Garden': ['home', 'kitchen', 'bathroom', 'holder', 'garden'],
    'Fashion': ['clothing', 'jacket', 'fashion', 'wear'],
    'Health & Beauty': ['beauty', 'massage', 'fitness'],
    'Sports & Outdoors': ['sport', 'game', 'ball'],
    'Automotive': ['car', 'auto'],
    'Toys & Games': ['toy', 'game', 'children'],
    'Tools': ['tool', 'equipment']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => titleLower.includes(keyword))) {
      return category;
    }
  }
  return 'General Products';
}

function showResults() {
  console.log(chalk.blue.bold('\n📊 RESULTADOS FINAIS:'));
  console.log(chalk.green(`✅ ${stats.altText} alt texts adicionados`));
  console.log(chalk.green(`✅ ${stats.tags} produtos com tags SEO`));
  console.log(chalk.green(`✅ ${stats.metaTags} produtos com meta tags`));
  console.log(chalk.green(`✅ ${stats.productType} tipos de produto definidos`));
  console.log(chalk.red(`❌ ${stats.errors} erros encontrados`));
  
  const total = stats.altText + stats.tags + stats.metaTags + stats.productType;
  console.log(chalk.blue.bold(`\n🎉 TOTAL: ${total} correções aplicadas!`));
}

startRealFix();
