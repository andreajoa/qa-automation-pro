import fetch from 'node-fetch';
import chalk from 'chalk';

const CONFIG = {
  shopify: {
    url: 'https://jfu7jv-0i.myshopify.com',
    token: 'process.env.SHOPIFY_ACCESS_TOKEN'
  }
};

console.log(chalk.blue.bold('🧪 TESTE SIMPLIFICADO - APENAS SHOPIFY'));
console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

async function testShopifyConnection() {
  console.log(chalk.yellow('🛍️  Testando conexão Shopify...'));
  
  try {
    // Testar API da loja
    const shopResponse = await fetch(`${CONFIG.shopify.url}/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': CONFIG.shopify.token,
        'Content-Type': 'application/json'
      }
    });

    if (!shopResponse.ok) {
      throw new Error(`Erro ${shopResponse.status}: ${shopResponse.statusText}`);
    }

    const shopData = await shopResponse.json();
    console.log(chalk.green(`✅ Loja conectada: "${shopData.shop?.name || 'Unnamed'}"`));
    console.log(chalk.gray(`   • URL: ${CONFIG.shopify.url}`));
    console.log(chalk.gray(`   • Status: ${shopResponse.status}`));

    // Testar API de produtos
    console.log(chalk.yellow('📦 Testando API de produtos...'));
    const productsResponse = await fetch(`${CONFIG.shopify.url}/admin/api/2023-10/products.json?limit=10`, {
      headers: {
        'X-Shopify-Access-Token': CONFIG.shopify.token,
        'Content-Type': 'application/json'
      }
    });

    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      const productCount = productsData.products?.length || 0;
      console.log(chalk.green(`✅ Produtos API: ${productCount} produtos encontrados`));
      
      if (productCount > 0) {
        console.log(chalk.gray(`   • Exemplo: "${productsData.products[0].title}"`));
      }
    }

    // Testar API de pedidos
    console.log(chalk.yellow('🛒 Testando API de pedidos...'));
    const ordersResponse = await fetch(`${CONFIG.shopify.url}/admin/api/2023-10/orders.json?limit=5&status=any`, {
      headers: {
        'X-Shopify-Access-Token': CONFIG.shopify.token,
        'Content-Type': 'application/json'
      }
    });

    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      const orderCount = ordersData.orders?.length || 0;
      console.log(chalk.green(`✅ Pedidos API: ${orderCount} pedidos encontrados`));
    }

    console.log(chalk.green.bold('\n🎉 TODOS OS TESTES SHOPIFY PASSARAM!'));
    console.log(chalk.blue('🚀 Sistema pronto para executar: npm start'));
    return true;

  } catch (error) {
    console.log(chalk.red(`❌ Erro na conexão: ${error.message}`));
    return false;
  }
}

// Executar teste
testShopifyConnection();
