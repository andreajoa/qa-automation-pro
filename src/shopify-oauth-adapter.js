// shopify-oauth-adapter.js
// Adicione este arquivo à pasta src/ do seu projeto

import fetch from 'node-fetch';
import crypto from 'crypto';

export class ShopifyOAuthManager {
  constructor() {
    // Suas credenciais do Partner Dashboard
    this.CLIENT_ID = 'process.env.SHOPIFY_CLIENT_ID';
    this.CLIENT_SECRET = 'process.env.SHOPIFY_CLIENT_SECRET';
    this.REDIRECT_URI = 'https://localhost:3000/auth/callback';
    
    // Banco de dados em memória para tokens (em produção, use um DB real)
    this.storeTokens = new Map();
    this.scopes = [
      'read_products',
      'write_products',
      'read_orders',
      'read_analytics',
      'read_themes'
    ].join(',');
  }

  // Middleware para verificar se a requisição vem do Shopify
  verifyWebhook(req, res, next) {
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    const body = JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha256', this.CLIENT_SECRET)
      .update(body, 'utf8')
      .digest('base64');

    if (hash === hmac) {
      next();
    } else {
      res.status(401).send('Unauthorized');
    }
  }

  // Iniciar processo OAuth
  getAuthUrl(shop, state) {
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    
    const authUrl = `https://${shopDomain}/admin/oauth/authorize?` +
      `client_id=${this.CLIENT_ID}&` +
      `scope=${this.scopes}&` +
      `redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&` +
      `state=${state}`;
    
    return authUrl;
  }

  // Trocar code por access_token
  async exchangeCodeForToken(shop, code) {
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    
    const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.CLIENT_ID,
        client_secret: this.CLIENT_SECRET,
        code: code
      })
    });

    if (!response.ok) {
      throw new Error(`Erro OAuth: ${response.status}`);
    }

    const data = await response.json();
    
    // Salvar token para esta loja
    this.storeTokens.set(shopDomain, {
      token: data.access_token,
      scope: data.scope,
      installedAt: new Date(),
      shopInfo: await this.getShopInfo(shopDomain, data.access_token)
    });

    return data.access_token;
  }

  // Obter informações da loja
  async getShopInfo(shopDomain, token) {
    const response = await fetch(`https://${shopDomain}/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return data.shop;
  }

  // Verificar se a loja tem token válido
  hasValidToken(shop) {
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    return this.storeTokens.has(shopDomain);
  }

  // Obter token da loja
  getStoreToken(shop) {
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    const storeData = this.storeTokens.get(shopDomain);
    return storeData?.token;
  }

  // Obter configuração da loja para seu sistema existente
  getStoreConfig(shop) {
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    const storeData = this.storeTokens.get(shopDomain);
    
    if (!storeData) return null;

    return {
      url: `https://${shopDomain}`,
      token: storeData.token,
      name: storeData.shopInfo?.name || shopDomain,
      shopInfo: storeData.shopInfo
    };
  }

  // Listar todas as lojas instaladas
  getAllInstalledStores() {
    const stores = [];
    for (const [domain, data] of this.storeTokens.entries()) {
      stores.push({
        url: `https://${domain}`,
        token: data.token,
        name: data.shopInfo?.name || domain,
        installedAt: data.installedAt
      });
    }
    return stores;
  }

  // Remover loja (quando app é desinstalado)
  removeStore(shop) {
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    return this.storeTokens.delete(shopDomain);
  }

  // Middleware para verificar autenticação
  requireAuth(req, res, next) {
    const shop = req.query.shop || req.headers['x-shopify-shop-domain'];
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop domain required' });
    }

    if (!this.hasValidToken(shop)) {
      // Redirecionar para OAuth
      const state = crypto.randomBytes(32).toString('hex');
      const authUrl = this.getAuthUrl(shop, state);
      
      return res.json({ 
        needsAuth: true, 
        authUrl: authUrl,
        message: 'App needs to be installed in this store'
      });
    }

    // Adicionar dados da loja ao request
    req.shopify = this.getStoreConfig(shop);
    next();
  }
}

// Função para adaptar sua ferramenta existente
export function adaptExistingQASystem(qaSystem, oauthManager) {
  // Substituir SHOPIFY_STORES fixas por lojas OAuth
  const originalRunAnalysis = qaSystem.runCuttingEdgeAnalysis.bind(qaSystem);
  
  qaSystem.runCuttingEdgeAnalysis = async function(shopDomain = null) {
    // Se shopDomain especificado, usar apenas essa loja
    if (shopDomain) {
      const storeConfig = oauthManager.getStoreConfig(shopDomain);
      if (!storeConfig) {
        throw new Error('Loja não instalada ou token inválido');
      }
      
      // Usar apenas esta loja
      const originalStores = qaSystem.constructor.prototype.SHOPIFY_STORES;
      qaSystem.constructor.prototype.SHOPIFY_STORES = [storeConfig];
      
      const result = await originalRunAnalysis();
      
      // Restaurar lojas originais
      qaSystem.constructor.prototype.SHOPIFY_STORES = originalStores;
      return result;
    }
    
    // Executar para todas as lojas instaladas
    const installedStores = oauthManager.getAllInstalledStores();
    qaSystem.constructor.prototype.SHOPIFY_STORES = installedStores;
    
    return await originalRunAnalysis();
  };

  return qaSystem;
}

// Middleware para App Bridge (funcionar dentro do admin Shopify)
export function createAppBridgeMiddleware() {
  return (req, res, next) => {
    // Adicionar cabeçalhos necessários para App Bridge
    res.setHeader('Content-Security-Policy', 
      "frame-ancestors https://*.shopify.com https://admin.shopify.com");
    
    // Verificar se está sendo carregado dentro do admin
    const isEmbedded = req.query.embedded === '1';
    const shop = req.query.shop;
    
    if (isEmbedded && shop) {
      req.isEmbedded = true;
      req.shopDomain = shop;
    }
    
    next();
  };
}