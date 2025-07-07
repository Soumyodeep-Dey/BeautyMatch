// src/content/scraper.ts
interface ProductInfo {
  name: string;
  brand: string;
  ingredients: string[];
  shade?: string;
  formulation?: string;
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
      const name = document.querySelector('.css-1gc4x7i')?.textContent?.trim() ||
        document.querySelector('h1[data-testid="pdp_product_name"]')?.textContent?.trim() ||
        document.querySelector('h1')?.textContent?.trim() ||
        '';

      const brand = document.querySelector('.css-1y64oha')?.textContent?.trim() ||
        document.querySelector('[data-testid="pdp_product_brand"]')?.textContent?.trim() || '';

      // --- Robust Ingredients Extraction for Nykaa ---
      let ingredients: string[] = [];
      let ingredientsText = "";
      // 1. Try the first <p> in #content-details
      const descContainer = document.querySelector("#content-details");
      if (descContainer) {
        const firstP = descContainer.querySelector("p");
        if (firstP) {
          ingredientsText = firstP.textContent?.trim() || "";
        }
      }
      // 2. Fallback: <p> containing 'Key Ingredients'
      if (!ingredientsText) {
        const keyIngP = Array.from(
          document.querySelectorAll("#content-details p")
        ).find((p) => p.innerHTML.toLowerCase().includes("key ingredients"));
        if (keyIngP) {
          ingredientsText = keyIngP.textContent?.replace(/Key Ingredients:?/i, "").trim() || "";
        }
      }
      // 3. Parse ingredients from text
      if (ingredientsText) {
        ingredients = ingredientsText
          .replace(/^"+|"+$/g, "")
          .split(/,|;|•|\n/)
          .map((i) => i.trim().toLowerCase())
          .filter((i) => i.length > 2 && i.length < 50 && !i.match(/^\d+/) && !i.includes('www.') && !i.includes('http'));
      }
      // 4. If still empty, fallback to parseIngredients on all #content-details text
      if (ingredients.length === 0 && descContainer) {
        ingredients = this.parseIngredients(descContainer.textContent || "");
      }

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
      // Sephora product page selectors - multiple fallbacks for different page layouts
      const name = document.querySelector('[data-test-id="product-name"]')?.textContent?.trim() ||
        document.querySelector('h1[data-test-id="product-name"]')?.textContent?.trim() ||
        document.querySelector('.css-0')?.textContent?.trim() ||
        document.querySelector('h1.css-0')?.textContent?.trim() ||
        document.querySelector('.ProductDisplayName')?.textContent?.trim() ||
        document.querySelector('h1')?.textContent?.trim() || '';

      const brand = document.querySelector('[data-test-id="brand-name"]')?.textContent?.trim() ||
        document.querySelector('a[data-test-id="brand-name"]')?.textContent?.trim() ||
        document.querySelector('.css-1hj8qbb')?.textContent?.trim() ||
        document.querySelector('.ProductBrand')?.textContent?.trim() ||
        this.extractBrandFromTitle(name);

      // --- Robust Ingredients Extraction for Sephora ---
      let ingredients: string[] = [];
      let ingredientsText = "";

      // 1. Try dedicated ingredients section
      const ingredientsElement = document.querySelector('[data-test-id="ingredients"]') ||
        document.querySelector('.css-pz80c5') ||
        document.querySelector('[data-comp="Ingredients"]') ||
        document.querySelector('.Ingredients');
      
      if (ingredientsElement) {
        ingredientsText = ingredientsElement.textContent || '';
      }

      // 2. Look for ingredients in product details section
      if (!ingredientsText) {
        const detailsSection = document.querySelector('[data-test-id="product-details"]') ||
          document.querySelector('.ProductDetails') ||
          document.querySelector('.css-details');
        
        if (detailsSection) {
          const ingredientsParagraph = Array.from(detailsSection.querySelectorAll('p, div')).find(el => 
            el.textContent?.toLowerCase().includes('ingredients:') || 
            el.textContent?.toLowerCase().includes('ingredient list')
          );
          if (ingredientsParagraph) {
            ingredientsText = ingredientsParagraph.textContent || '';
          }
        }
      }

      // 3. Look for ingredients in accordion/expandable sections
      if (!ingredientsText) {
        const accordionButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
        const ingredientsButton = accordionButtons.find(btn => 
          btn.textContent?.toLowerCase().includes('ingredients') ||
          btn.textContent?.toLowerCase().includes('formula')
        );
        
        if (ingredientsButton) {
          // Try to find the associated content
          const buttonId = ingredientsButton.getAttribute('aria-controls');
          if (buttonId) {
            const contentElement = document.getElementById(buttonId);
            if (contentElement) {
              ingredientsText = contentElement.textContent || '';
            }
          } else {
            // Look for sibling or next element
            const nextElement = ingredientsButton.nextElementSibling ||
              ingredientsButton.parentElement?.nextElementSibling;
            if (nextElement) {
              ingredientsText = nextElement.textContent || '';
            }
          }
        }
      }

      // 4. Look in product description as fallback
      if (!ingredientsText) {
        const description = document.querySelector('[data-test-id="product-description"]') ||
          document.querySelector('.ProductDescription') ||
          document.querySelector('.css-description');
        
        if (description) {
          const descText = description.textContent || '';
          if (descText.toLowerCase().includes('ingredients')) {
            ingredientsText = descText;
          }
        }
      }

      // 5. Fallback: Extract ingredients from <b> tags for all shades
      if (!ingredientsText) {
        const mainContent = document.querySelector('[data-test-id="product-details"], .ProductDetails, .css-details, [data-test-id="product-description"], .ProductDescription, .css-description, [data-test-id="ingredients"], .css-pz80c5, [data-comp="Ingredients"], .Ingredients, body');
        if (mainContent) {
          const bolds = Array.from(mainContent.querySelectorAll('b'));
          let allIngredients: string[] = [];
          bolds.forEach(b => {
            let ingText = '';
            let node = b.nextSibling;
            while (node && node.nodeType !== Node.TEXT_NODE) {
              node = node.nextSibling;
            }
            if (node && node.nodeType === Node.TEXT_NODE) {
              ingText = node.textContent?.trim() || '';
            }
            if (!ingText) {
              let br = b.nextElementSibling;
              if (br && br.tagName === 'BR') {
                let next = br.nextSibling;
                if (next && next.nodeType === Node.TEXT_NODE) {
                  ingText = next.textContent?.trim() || '';
                }
              }
            }
            if (ingText) {
              allIngredients = allIngredients.concat(this.parseIngredients(ingText));
            }
          });
          if (allIngredients.length > 0) {
            ingredients = allIngredients;
          }
        }
      }

      // 6. If still not found, look for paragraphs/divs containing 'ingredients'
      if (ingredients.length === 0) {
        const allTextNodes = Array.from(document.querySelectorAll('p, div'));
        const ingNodes = allTextNodes.filter(el => el.textContent && el.textContent.toLowerCase().includes('ingredients'));
        let foundIngredients: string[] = [];
        ingNodes.forEach(node => {
          foundIngredients = foundIngredients.concat(this.parseIngredients(node.textContent || ''));
        });
        if (foundIngredients.length > 0) {
          ingredients = foundIngredients;
        }
      }

      // 7. Parse ingredients from found text if not already set
      if (ingredients.length === 0 && ingredientsText) {
        ingredients = this.parseIngredients(ingredientsText);
      }

      // Deduplicate and normalize
      ingredients = Array.from(new Set(ingredients.map(i => i.toLowerCase().trim())));

      // Shade/variant information - enhanced selectors
      const selectedShade = document.querySelector('[aria-pressed="true"]')?.textContent?.trim() ||
        document.querySelector('.css-1qe8tjm[aria-selected="true"]')?.textContent?.trim() ||
        document.querySelector('[data-test-id="variant-option"][aria-selected="true"]')?.textContent?.trim() ||
        document.querySelector('.VariantOption[aria-selected="true"]')?.textContent?.trim() ||
        document.querySelector('.selected-shade')?.textContent?.trim() ||
        document.querySelector('.sku-selected')?.getAttribute('data-shade') || '';

      // Product category from breadcrumbs
      const category = document.querySelector('[data-test-id="breadcrumb"]')?.textContent?.toLowerCase() ||
        document.querySelector('.Breadcrumb')?.textContent?.toLowerCase() ||
        document.querySelector('.breadcrumb')?.textContent?.toLowerCase() || '';

      // Coverage and finish for makeup products
      const coverage = this.extractCoverage(document.body.textContent || '');
      const finish = this.extractFinish(document.body.textContent || '');

      // Skin type information
      const skinType = this.extractSkinType(document.body.textContent || '');

      // Formulation type (liquid, powder, cream, etc.)
      const formulation = this.extractFormulation(document.body.textContent || '');

      return {
        name,
        brand,
        ingredients,
        shade: selectedShade,
        category,
        skinType,
        coverage,
        finish,
        formulation
      };
    } catch (error) {
      console.error('Sephora scraping error:', error);
      return null;
    }
  }

  private extractFormulation(text: string): string {
    const lowerText = text.toLowerCase();
    const formulationTypes = [
      'liquid', 'powder', 'cream', 'gel', 'stick', 'balm', 'foam', 'serum', 'oil', 'lotion', 'spray', 'mousse', 'cushion', 'sheet', 'patch', 'bar', 'mist', 'paste', 'wax', 'emulsion', 'milk', 'ampoule', 'peel', 'mask', 'clay', 'jelly', 'water', 'drops', 'capsule', 'essence', 'ointment', 'fluid', 'compact', 'pencil', 'pen', 'roll-on', 'roll on', 'solid', 'suspension', 'powder-to-cream', 'powder to cream', 'powder-to-liquid', 'powder to liquid'
    ];
    for (const formulation of formulationTypes) {
      if (lowerText.includes(formulation)) {
        return formulation;
      }
    }
    return '';
  }

  private scrapeAmazon(): ProductInfo | null {
    try {
      // Amazon product page selectors
      const name = document.querySelector('#productTitle')?.textContent?.trim() || '';

      // Brand is usually in the title or separate element
      const brand = document.querySelector('.po-brand .po-break-word')?.textContent?.trim() ||
        document.querySelector('[data-brand]')?.getAttribute('data-brand') ||
        this.extractBrandFromTitle(name);

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
        category
      };
    } catch (error) {
      console.error('Amazon scraping error:', error);
      return null;
    }
  }

  private parseIngredients(text: string): string[] {
    if (!text) return [];

    // Clean up the text
    let cleanText = text.replace(/^[^:]*:/, ''); // Remove everything before first colon
    cleanText = cleanText.replace(/\([^)]*\)/g, ''); // Remove content in parentheses
    cleanText = cleanText.replace(/\[[^\]]*\]/g, ''); // Remove content in brackets
    
    // Split by common separators
    const ingredients = cleanText
      .split(/[,;•\n]/)
      .map(ingredient => ingredient.trim().toLowerCase())
      .filter(ingredient => 
        ingredient.length > 2 && 
        ingredient.length < 50 &&
        !ingredient.match(/^\d+/) && // Remove numbered items
        !ingredient.includes('www.') && // Remove URLs
        !ingredient.includes('http') &&
        !ingredient.includes('may contain') // Remove allergen warnings
      )
      .map(ingredient => ingredient.replace(/^[\d\s]*\.?\s*/, '')) // Remove leading numbers/dots
      .filter(ingredient => ingredient.length > 0)
      .slice(0, 30); // Limit to first 30 ingredients

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