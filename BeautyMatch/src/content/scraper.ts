// src/content/scraper.ts
interface ProductInfo {
  name: string;
  brand: string;
  ingredients: string[];
  shade?: string;
  formulation?: string;
  price?: string;
  category?: string;
  skinType?: string[];
  coverage?: string;
  finish?: string;
}

class BeautyProductScraper {
  getCurrentSite(): string {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('nykaa')) return 'nykaa';
    if (hostname.includes('sephora')) return 'sephora';
    if (hostname.includes('amazon')) return 'amazon';
    return 'unknown';
  }

  private scrapeNykaa(): ProductInfo | null {
    try {
      // Nykaa product page selectors
      const name = document.querySelector('.css-1gc4zul')?.textContent?.trim() ||
        document.querySelector('h1[data-testid="pdp_product_name"]')?.textContent?.trim() || '';

      const brand = document.querySelector('.css-1y64oha')?.textContent?.trim() ||
        document.querySelector('[data-testid="pdp_product_brand"]')?.textContent?.trim() || '';

      const price = document.querySelector('.css-1d0jf8e')?.textContent?.trim() ||
        document.querySelector('[data-testid="pdp_price"]')?.textContent?.trim() || '';

      // Ingredients from description or dedicated section
      const ingredientsText = document.querySelector('.css-1l5j6ho')?.textContent ||
        document.querySelector('.ingredient-list')?.textContent ||
        document.querySelector('[data-testid="pdp_ingredients"]')?.textContent || '';

      const ingredients = this.parseIngredients(ingredientsText);

      // Shade information
      const activeShade = document.querySelector('.css-1n8i4of.selected')?.textContent?.trim() ||
        document.querySelector('.shade-selected')?.getAttribute('data-shade') || '';

      // Product details
      const category = document.querySelector('.breadcrumb')?.textContent?.toLowerCase() || '';
      const skinType = this.extractSkinType(document.body.textContent || '');

      return {
        name,
        brand,
        ingredients,
        shade: activeShade,
        price,
        category,
        skinType
      };
    } catch (error) {
      console.error('Nykaa scraping error:', error);
      return null;
    }
  }

  private scrapeSephora(): ProductInfo | null {
    try {
      // Sephora product page selectors
      const name = document.querySelector('[data-test-id="product-name"]')?.textContent?.trim() ||
        document.querySelector('.css-0')?.textContent?.trim() || '';

      const brand = document.querySelector('[data-test-id="brand-name"]')?.textContent?.trim() ||
        document.querySelector('.css-1hj8qbb')?.textContent?.trim() || '';

      const price = document.querySelector('[data-test-id="product-price"]')?.textContent?.trim() || '';

      // Ingredients - Sephora usually has a dedicated ingredients section
      const ingredientsElement = document.querySelector('[data-test-id="ingredients"]') ||
        document.querySelector('.css-pz80c5');
      const ingredientsText = ingredientsElement?.textContent || '';
      const ingredients = this.parseIngredients(ingredientsText);

      // Shade/variant information
      const selectedShade = document.querySelector('[aria-pressed="true"]')?.textContent?.trim() ||
        document.querySelector('.css-1qe8tjm[aria-selected="true"]')?.textContent?.trim() || '';

      // Coverage and finish for makeup products
      const coverage = this.extractCoverage(document.body.textContent || '');
      const finish = this.extractFinish(document.body.textContent || '');

      return {
        name,
        brand,
        ingredients,
        shade: selectedShade,
        price,
        coverage,
        finish
      };
    } catch (error) {
      console.error('Sephora scraping error:', error);
      return null;
    }
  }

  private scrapeAmazon(): ProductInfo | null {
    try {
      // Amazon product page selectors
      const name = document.querySelector('#productTitle')?.textContent?.trim() || '';

      // Brand is usually in the title or separate element
      const brand = document.querySelector('.po-brand .po-break-word')?.textContent?.trim() ||
        document.querySelector('[data-brand]')?.getAttribute('data-brand') ||
        this.extractBrandFromTitle(name);

      const price = document.querySelector('.a-price-whole')?.textContent?.trim() ||
        document.querySelector('.a-offscreen')?.textContent?.trim() || '';

      // Amazon ingredients are often in product details or description
      const featuresText = Array.from(document.querySelectorAll('#feature-bullets li span'))
        .map(el => el.textContent).join(' ') || '';
      const descriptionText = document.querySelector('#productDescription')?.textContent || '';
      const detailsText = Array.from(document.querySelectorAll('.prodDetTable tr'))
        .map(row => row.textContent).join(' ') || '';

      const combinedText = `${featuresText} ${descriptionText} ${detailsText}`;
      const ingredients = this.parseIngredients(combinedText);

      // Variant/shade selection on Amazon
      const selectedVariant = document.querySelector('[class*="selection"]:not([class*="unselected"])')?.textContent?.trim() || '';

      const category = document.querySelector('#wayfinding-breadcrumbs_feature_div')?.textContent?.toLowerCase() || '';

      return {
        name,
        brand,
        ingredients,
        shade: selectedVariant,
        price,
        category
      };
    } catch (error) {
      console.error('Amazon scraping error:', error);
      return null;
    }
  }

  private parseIngredients(text: string): string[] {
    if (!text) return [];

    // Common ingredient section identifiers
    const ingredientMarkers = [
      'ingredients:',
      'key ingredients:',
      'full ingredients:',
      'ingredient list:',
      'contains:'
    ];

    let ingredientText = text.toLowerCase();

    // Find ingredient section
    for (const marker of ingredientMarkers) {
      const index = ingredientText.indexOf(marker);
      if (index !== -1) {
        ingredientText = ingredientText.substring(index + marker.length);
        break;
      }
    }

    // Split by common separators and clean up
    const ingredients = ingredientText
      .split(/[,;]/)
      .map(ingredient => ingredient.trim())
      .filter(ingredient =>
        ingredient.length > 2 &&
        ingredient.length < 50 &&
        !ingredient.match(/^\d+/) && // Remove numbered items
        !ingredient.includes('www.') // Remove URLs
      )
      .slice(0, 20); // Limit to first 20 ingredients

    return ingredients;
  }

  private extractBrandFromTitle(title: string): string {
    // Common brand extraction patterns
    const brandPatterns = [
      /^([A-Z][a-zA-Z\s&]+?)\s+/,  // Brand at start
      /by\s+([A-Z][a-zA-Z\s&]+)/i,  // "by Brand"
    ];

    for (const pattern of brandPatterns) {
      const match = title.match(pattern);
      if (match) return match[1].trim();
    }

    return '';
  }

  private extractSkinType(text: string): string[] {
    const skinTypes: string[] = [];
    const lowerText = text.toLowerCase();

    const skinTypeKeywords = [
      'oily skin', 'dry skin', 'combination skin', 'sensitive skin',
      'normal skin', 'mature skin', 'acne-prone', 'all skin types'
    ];

    skinTypeKeywords.forEach(skinType => {
      if (lowerText.includes(skinType)) {
        skinTypes.push(skinType);
      }
    });

    return skinTypes;
  }

  private extractCoverage(text: string): string {
    const lowerText = text.toLowerCase();
    const coverageTypes = ['light coverage', 'medium coverage', 'full coverage', 'buildable coverage'];

    for (const coverage of coverageTypes) {
      if (lowerText.includes(coverage)) {
        return coverage;
      }
    }
    return '';
  }

  private extractFinish(text: string): string {
    const lowerText = text.toLowerCase();
    const finishTypes = ['matte finish', 'dewy finish', 'satin finish', 'natural finish', 'radiant finish'];

    for (const finish of finishTypes) {
      if (lowerText.includes(finish)) {
        return finish;
      }
    }
    return '';
  }

  public getProductInfo(): ProductInfo | null {
    const site = this.getCurrentSite();

    switch (site) {
      case 'nykaa':
        return this.scrapeNykaa();
      case 'sephora':
        return this.scrapeSephora();
      case 'amazon':
        return this.scrapeAmazon();
      default:
        console.log('Unsupported site for product scraping');
        return null;
    }
  }
}

// Initialize scraper
const scraper = new BeautyProductScraper();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "GET_PRODUCT_INFO") {
    try {
      const productInfo = scraper.getProductInfo();

      if (productInfo) {
        console.log('BeautyMatch: Product detected', productInfo);
        sendResponse({ success: true, data: productInfo });
      } else {
        console.log('BeautyMatch: No product found on this page');
        sendResponse({ success: false, error: 'No product detected on this page' });
      }
    } catch (error) {
      console.error('BeautyMatch: Scraping error', error);
      sendResponse({ success: false, error: 'Failed to scrape product information' });
    }

    return true; // Keep sendResponse alive for async operations
  }
});

// Auto-detect when user navigates to product pages
const detectProductPage = () => {
  const site = new BeautyProductScraper().getCurrentSite();
  if (site !== 'unknown') {
    const productInfo = scraper.getProductInfo();
    if (productInfo && productInfo.name) {
      // Show a subtle indicator that BeautyMatch is ready
      console.log('BeautyMatch: Ready to analyze', productInfo.name);
    }
  }
};

// Run detection when page loads and when URL changes (for SPAs)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', detectProductPage);
} else {
  detectProductPage();
}

// Watch for URL changes in single-page applications
let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    setTimeout(detectProductPage, 1000); // Wait for page to load
  }
});

observer.observe(document.body, { childList: true, subtree: true });