// src/content/scraper.ts

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

// --- ADVANCED BEAUTYMATCH ALGORITHM ---

type ProductInfo = {
  name: string;
  brand: string;
  price?: string;
  shade?: string;
  coverage?: string;
  finish?: string;
  category?: string;
  skinType?: string[];
  ingredients: string[];
  formulation?: string;
};

type SkinProfile = {
  skinType: string;
  skinTone: string;
  allergies: string[];
  dislikedBrands?: string[];
  preferredBrands?: string[];
  skinConcerns?: string[];
  preferredFinish?: string;
  preferredCoverage?: string;
  budgetRange?: string;
};

type Verdict =
  | "PERFECT_MATCH"
  | "EXCELLENT_MATCH"
  | "GOOD_MATCH"
  | "PARTIAL_MATCH"
  | "FAIR_MATCH"
  | "CAUTION"
  | "NOT_RECOMMENDED"
  | "CONTAINS_ALLERGEN"
  | "MISSING_INFORMATION"
  | "USER_PREFERENCE_CONFLICT"
  | "NO_MATCH";

type MatchResult = {
  verdict: Verdict;
  score: number;
  confidence: number;
  reasons: string[];
  warnings: string[];
  recommendations: string[];
  breakdown: {
    skinTypeScore: number;
    ingredientScore: number;
    shadeScore: number;
    brandScore: number;
    priceScore: number;
    preferenceScore: number;
    categoryScore: number;
    concernsScore: number;
    safetyScore: number;
  };
  detailedAnalysis: {
    beneficialIngredients: string[];
    problematicIngredients: string[];
    neutralIngredients: string[];
    missingBeneficials: string[];
    compatibilityNotes: string[];
  };
};

// Enhanced ingredient database
const INGREDIENT_DATABASE = {
  beneficial: {
    dry: [
      { name: "hyaluronic acid", score: 25, description: "Intense hydration, binds moisture" },
      { name: "ceramides", score: 25, description: "Barrier repair and moisture retention" },
      { name: "glycerin", score: 20, description: "Humectant, draws and retains moisture" },
      { name: "hyaluronic acid", score: 20, description: "Multi-weight hydration" },
      { name: "squalane", score: 20, description: "Lightweight emollient, locks hydration" },
      { name: "niacinamide", score: 15, description: "Strengthens barrier, reduces TEWL" },
      { name: "peptides", score: 20, description: "Supports skin repair" },
      { name: "panthenol", score: 15, description: "Soothing hydration and calming" },
      { name: "shea butter", score: 15, description: "Occlusive nourishment" },
      { name: "vitamin E", score: 10, description: "Antioxidant support" }
    ],
    oily: [
      { name: "niacinamide", score: 25, description: "Reduces sebum, minimizes shine" },
      { name: "salicylic acid", score: 20, description: "Exfoliates pores, anti-inflammatory" },
      { name: "zinc oxide", score: 15, description: "Oil control, soothing" },
      { name: "kaolin clay", score: 15, description: "Mattifying absorbent" },
      { name: "retinol", score: 20, description: "Refines pores and texture" },
      { name: "benzoyl peroxide", score: 15, description: "Antibacterial acne action" },
      { name: "tea tree oil", score: 10, description: "Natural antibacterial support" },
      { name: "dimethicone", score: 10, description: "Non-comedogenic emollient" }
    ],
    sensitive: [
      { name: "aloe vera", score: 20, description: "Soothing and cooling" },
      { name: "centella asiatica", score: 20, description: "Calms irritation and inflammation" },
      { name: "panthenol", score: 20, description: "Hydrational calming" },
      { name: "allantoin", score: 15, description: "Gentle healing" },
      { name: "zinc oxide", score: 15, description: "Barrier-protecting mineral" },
      { name: "titanium dioxide", score: 15, description: "Physical UV protection, minimal irritation" },
      { name: "chamomile", score: 15, description: "Anti‑inflammatory botanical" },
      { name: "niacinamide", score: 15, description: "Barrier strengthening, reduces redness" }
    ],
    mature: [
      { name: "retinol", score: 30, description: "Collagen stimulating anti-aging" },
      { name: "vitamin c", score: 25, description: "Antioxidant brightening & collagen support" },
      { name: "peptides", score: 25, description: "Stimulates structural proteins" },
      { name: "hyaluronic acid", score: 20, description: "Plumping hydration" },
      { name: "bakuchiol", score: 20, description: "Retinol alternative with gentler tolerance" },
      { name: "niacinamide", score: 15, description: "Strengthens barrier & hydrates" },
      { name: "coenzyme q10", score: 15, description: "Antioxidant cellular energy" },
      { name: "alpha lipoic acid", score: 15, description: "Broad antioxidant, reduces fine lines" }
    ],
    combination: [
      { name: "niacinamide", score: 25, description: "Balances oil and supports dryness" },
      { name: "hyaluronic acid", score: 20, description: "Hydrates dry zones lightly" },
      { name: "salicylic acid", score: 15, description: "Targets T-zone oil and unclogs pores" },
      { name: "glycerin", score: 15, description: "Humectant for balanced zones" },
      { name: "zinc oxide", score: 10, description: "Gentle mattifying" }
    ],
    "acne-prone": [
      { name: "salicylic acid", score: 30, description: "Deep pore exfoliation" },
      { name: "benzoyl peroxide", score: 25, description: "Kills acne-causing bacteria" },
      { name: "niacinamide", score: 20, description: "Reduces inflammation & sebum" },
      { name: "retinol", score: 20, description: "Prevents comedones, normalizes turnover" },
      { name: "zinc oxide", score: 15, description: "Soothing antimicrobial healing" },
      { name: "tea tree oil", score: 15, description: "Natural acne-fighting support" }
    ]
  },

  problematic: {
    dry: [
      { name: "alcohol denat", score: -20, description: "Drying agent, weakens barrier" },
      { name: "sodium lauryl sulfate", score: -15, description: "Harsh surfactant that strips oils" },
      { name: "menthol", score: -10, description: "Cooling but irritating to dry skin" },
      { name: "high concentration acids", score: -15, description: "Over‑exfoliate and compromise barrier" }
    ],
    oily: [
      { name: "mineral oil", score: -15, description: "Can clog pores in oily skin" },
      { name: "coconut oil", score: -10, description: "Highly comedogenic for oily/acne‑prone" },
      { name: "heavy oils", score: -10, description: "May increase oiliness and clog pores" },
      { name: "lanolin", score: -10, description: "Potentially comedogenic" }
    ],
    sensitive: [
      { name: "fragrance", score: -25, description: "Common irritant and allergen" },
      { name: "essential oils", score: -20, description: "Sensitizers; may trigger reactions" },
      { name: "alcohol denat", score: -20, description: "Drying and irritating on sensitive skin" },
      { name: "retinol", score: -15, description: "Can trigger irritation in sensitive skin" },
      { name: "alpha hydroxy acids", score: -15, description: "May irritate reactive skin" },
      { name: "beta hydroxy acids", score: -15, description: "Can cause inflammation in sensitive skin" }
    ],
    mature: [
      { name: "alcohol denat", score: -15, description: "Drying to aging skin, barrier‑damaging" },
      { name: "harsh sulfates", score: -10, description: "Strip natural oils, exacerbate dryness" }
    ],
    combination: [
      { name: "heavy oils", score: -10, description: "Can worsen oily zones while over-moisturizing dry ones" },
      { name: "alcohol denat", score: -15, description: "May overdry dry patches and imbalance skin" }
    ],
    "acne-prone": [
      { name: "coconut oil", score: -20, description: "Highly comedogenic, clogs follicles" },
      { name: "cocoa butter", score: -15, description: "Can block pores and trigger acne" },
      { name: "lanolin", score: -15, description: "Often causes breakouts in acne‑prone skin" },
      { name: "mineral oil", score: -10, description: "May occlude pores and induce blemishes" }
    ]
  },

  universal_problematic: [
    { name: "parabens", score: -5, description: "Preservative sensitivity" },
    { name: "sulfates", score: -5, description: "Can be harsh" },
    { name: "synthetic fragrance", score: -10, description: "Common allergen" }
  ]
};

const CONCERN_INGREDIENTS = {
  acne: ["salicylic acid", "benzoyl peroxide", "niacinamide", "azelaic acid", "retinoids", "tea tree oil"],
  aging: ["retinoids", "peptides", "vitamin C", "hyaluronic acid", "bakuchiol", "ceramides"],
  hyperpigmentation: ["vitamin C", "niacinamide", "kojic acid", "arbutin", "azelaic acid", "licorice root"],
  dryness: ["hyaluronic acid", "ceramides", "glycerin", "squalane", "shea butter", "niacinamide"],
  sensitivity: ["aloe vera", "chamomile", "centella asiatica", "allantoin", "panthenol", "bakuchiol", "niacinamide"],
  dullness: ["vitamin C", "glycolic acid", "lactic acid", "niacinamide", "retinoids"],
  enlarged_pores: ["niacinamide", "salicylic acid", "retinoids", "zinc oxide"],
  oiliness: ["niacinamide", "salicylic acid", "zinc oxide", "kaolin clay", "retinoids"]
};

// Paste all helper functions and analyzeProductAdvanced here

function analyzeProductAdvanced(product: ProductInfo, profile: SkinProfile): MatchResult {
  // Initialize result structure
  const result: MatchResult = {
    verdict: "NO_MATCH",
    score: 0,
    confidence: 0,
    reasons: [],
    warnings: [],
    recommendations: [],
    breakdown: {
      skinTypeScore: 0,
      ingredientScore: 0,
      shadeScore: 0,
      brandScore: 0,
      priceScore: 0,
      preferenceScore: 0,
      categoryScore: 0,
      concernsScore: 0,
      safetyScore: 100
    },
    detailedAnalysis: {
      beneficialIngredients: [],
      problematicIngredients: [],
      neutralIngredients: [],
      missingBeneficials: [],
      compatibilityNotes: []
    }
  };

  // Normalize inputs
  const normalizedProduct = normalizeProduct(product);
  const normalizedProfile = normalizeProfile(profile);

  // 1. SAFETY CHECK - Allergens (Critical - immediate disqualification)
  const allergyCheck = checkAllergies(normalizedProduct.ingredients, normalizedProfile.allergies);
  if (allergyCheck.hasAllergies) {
    result.verdict = "CONTAINS_ALLERGEN";
    result.warnings = allergyCheck.warnings;
    result.breakdown.safetyScore = 0;
    result.confidence = 100;
    return result;
  }

  // 2. BRAND PREFERENCE CHECK
  const brandCheck = checkBrandPreferences(normalizedProduct.brand, normalizedProfile);
  if (brandCheck.isDisliked) {
    result.verdict = "USER_PREFERENCE_CONFLICT";
    result.warnings = brandCheck.warnings;
    result.breakdown.brandScore = 0;
    result.confidence = 90;
    return result;
  }
  result.breakdown.brandScore = brandCheck.score;
  if (brandCheck.reasons.length > 0) result.reasons.push(...brandCheck.reasons);

  // 3. SKIN TYPE COMPATIBILITY (30% weight)
  const skinTypeAnalysis = analyzeSkinTypeCompatibility(normalizedProduct, normalizedProfile);
  result.breakdown.skinTypeScore = skinTypeAnalysis.score;
  result.reasons.push(...skinTypeAnalysis.reasons);
  result.warnings.push(...skinTypeAnalysis.warnings);

  // 4. INGREDIENT ANALYSIS (40% weight)
  const ingredientAnalysis = analyzeIngredients(normalizedProduct.ingredients, normalizedProfile);
  result.breakdown.ingredientScore = ingredientAnalysis.score;
  result.reasons.push(...ingredientAnalysis.reasons);
  result.warnings.push(...ingredientAnalysis.warnings);
  result.detailedAnalysis.beneficialIngredients = ingredientAnalysis.beneficial;
  result.detailedAnalysis.problematicIngredients = ingredientAnalysis.problematic;
  result.detailedAnalysis.neutralIngredients = ingredientAnalysis.neutral;

  // 5. SKIN CONCERNS ANALYSIS (20% weight)
  const concernsAnalysis = analyzeSkinConcerns(normalizedProduct.ingredients, normalizedProfile.skinConcerns || []);
  result.breakdown.concernsScore = concernsAnalysis.score;
  result.reasons.push(...concernsAnalysis.reasons);
  result.detailedAnalysis.missingBeneficials = concernsAnalysis.missingBeneficials;

  // 6. PREFERENCE MATCHING (10% weight)
  const preferenceAnalysis = analyzePreferences(normalizedProduct, normalizedProfile);
  result.breakdown.preferenceScore = preferenceAnalysis.score;
  result.reasons.push(...preferenceAnalysis.reasons);

  // 7. CALCULATE FINAL SCORE
  const weights = {
    skinType: 0.30,
    ingredients: 0.40,
    concerns: 0.20,
    preferences: 0.10
  };

  result.score = Math.round(
    (result.breakdown.skinTypeScore * weights.skinType) +
    (result.breakdown.ingredientScore * weights.ingredients) +
    (result.breakdown.concernsScore * weights.concerns) +
    (result.breakdown.preferenceScore * weights.preferences) +
    (result.breakdown.brandScore * 0.05) // Bonus for preferred brands
  );
  // Slightly increase the score with a small bonus, max 100
  result.score = Math.min(result.score + 10, 100);

  // 8. DETERMINE VERDICT AND CONFIDENCE
  const verdictAnalysis = determineVerdict(result.score, result.breakdown);
  result.verdict = verdictAnalysis.verdict;
  result.confidence = verdictAnalysis.confidence;

  // 9. GENERATE RECOMMENDATIONS
  result.recommendations = generateRecommendations(result, normalizedProduct, normalizedProfile);

  // 10. ADD COMPATIBILITY NOTES
  result.detailedAnalysis.compatibilityNotes = generateCompatibilityNotes(result, normalizedProduct, normalizedProfile);

  return result;
}

function normalizeProduct(product: ProductInfo): ProductInfo {
  return {
    ...product,
    brand: product.brand?.toLowerCase().trim() || '',
    skinType: product.skinType?.map(s => s.toLowerCase().trim()) || [],
    ingredients: product.ingredients.map(i => i.toLowerCase().trim()),
    coverage: product.coverage?.toLowerCase().trim(),
    finish: product.finish?.toLowerCase().trim(),
    category: product.category?.toLowerCase().trim()
  };
}

function normalizeProfile(profile: SkinProfile): SkinProfile {
  return {
    ...profile,
    skinType: profile.skinType?.toLowerCase().trim() || '',
    allergies: profile.allergies?.map(a => a.toLowerCase().trim()) || [],
    dislikedBrands: profile.dislikedBrands?.map(b => b.toLowerCase().trim()) || [],
    preferredBrands: profile.preferredBrands?.map(b => b.toLowerCase().trim()) || [],
    skinConcerns: profile.skinConcerns?.map(c => c.toLowerCase().trim()) || [],
    preferredFinish: profile.preferredFinish?.toLowerCase().trim(),
    preferredCoverage: profile.preferredCoverage?.toLowerCase().trim()
  };
}

function checkAllergies(ingredients: string[], allergies: string[]): { hasAllergies: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let hasAllergies = false;

  for (const allergy of allergies) {
    for (const ingredient of ingredients) {
      if (ingredient.includes(allergy) || allergy.includes(ingredient)) {
        hasAllergies = true;
        warnings.push(`🚫 Contains ${ingredient} (allergen: ${allergy})`);
      }
    }
  }

  return { hasAllergies, warnings };
}

function checkBrandPreferences(brand: string, profile: SkinProfile): { score: number; isDisliked: boolean; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Check disliked brands
  if (profile.dislikedBrands?.includes(brand)) {
    return {
      score: 0,
      isDisliked: true,
      reasons: [],
      warnings: [`❌ "${brand}" is in your disliked brands list`]
    };
  }

  // Check preferred brands
  if (profile.preferredBrands?.includes(brand)) {
    reasons.push(`💖 "${brand}" is one of your preferred brands`);
    return { score: 20, isDisliked: false, reasons, warnings };
  }

  return { score: 0, isDisliked: false, reasons, warnings };
}

function analyzeSkinTypeCompatibility(product: ProductInfo, profile: SkinProfile): { score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!product.skinType || product.skinType.length === 0) {
    warnings.push("⚠️ No skin type information available for this product");
    return { score: 50, reasons, warnings }; // Neutral score for missing info
  }

  // Perfect match
  if (product.skinType.includes(profile.skinType)) {
    reasons.push(`✅ Perfect match for ${profile.skinType} skin`);
    return { score: 100, reasons, warnings };
  }

  // Universal products
  if (product.skinType.some(type => type.includes('all skin types'))) {
    reasons.push(`✅ Suitable for all skin types, including ${profile.skinType}`);
    return { score: 85, reasons, warnings };
  }

  // Partial matches
  const partialMatches = product.skinType.filter(type =>
    type.includes(profile.skinType) || profile.skinType.includes(type)
  );

  if (partialMatches.length > 0) {
    reasons.push(`⚡ Partial compatibility: ${partialMatches.join(', ')}`);
    return { score: 70, reasons, warnings };
  }

  // No match
  warnings.push(`⚠️ Formulated for ${product.skinType.join(', ')}, you have ${profile.skinType} skin`);
  return { score: 30, reasons, warnings };
}

function analyzeIngredients(ingredients: string[], profile: SkinProfile): {
  score: number;
  reasons: string[];
  warnings: string[];
  beneficial: string[];
  problematic: string[];
  neutral: string[];
} {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const beneficial: string[] = [];
  const problematic: string[] = [];
  const neutral: string[] = [];

  let totalScore = 0;
  let scoreCount = 0;

  const skinTypeKey = normalizeSkinTypeKey(profile.skinType);
  const beneficialIngredients = INGREDIENT_DATABASE.beneficial[skinTypeKey as keyof typeof INGREDIENT_DATABASE.beneficial] || [];
  const problematicIngredients = INGREDIENT_DATABASE.problematic[skinTypeKey as keyof typeof INGREDIENT_DATABASE.problematic] || [];

  // Check beneficial ingredients
  for (const ingredient of ingredients) {
    const beneficialMatch = beneficialIngredients.find(b =>
      ingredient.includes(b.name) || b.name.includes(ingredient)
    );

    if (beneficialMatch) {
      beneficial.push(ingredient);
      totalScore += beneficialMatch.score;
      scoreCount++;
      reasons.push(`✨ ${ingredient} - ${beneficialMatch.description}`);
    } else {
      // Check problematic ingredients
      const problematicMatch = problematicIngredients.find(p =>
        ingredient.includes(p.name) || p.name.includes(ingredient)
      );

      if (problematicMatch) {
        problematic.push(ingredient);
        totalScore += problematicMatch.score; // Negative score
        scoreCount++;
        warnings.push(`⚠️ ${ingredient} - ${problematicMatch.description}`);
      } else {
        neutral.push(ingredient);
      }
    }
  }

  // Check universal problematic ingredients
  for (const ingredient of ingredients) {
    const universalProblematic = INGREDIENT_DATABASE.universal_problematic.find(p =>
      ingredient.includes(p.name) || p.name.includes(ingredient)
    );

    if (universalProblematic && !problematic.includes(ingredient)) {
      problematic.push(ingredient);
      totalScore += universalProblematic.score;
      scoreCount++;
      warnings.push(`⚠️ ${ingredient} - ${universalProblematic.description}`);
    }
  }

  const finalScore = scoreCount > 0 ? Math.max(0, Math.min(100, 50 + (totalScore / scoreCount))) : 50;

  return {
    score: Math.round(finalScore),
    reasons,
    warnings,
    beneficial,
    problematic,
    neutral
  };
}

function analyzeSkinConcerns(ingredients: string[], concerns: string[]): {
  score: number;
  reasons: string[];
  missingBeneficials: string[];
} {
  const reasons: string[] = [];
  const missingBeneficials: string[] = [];
  let totalScore = 0;

  if (concerns.length === 0) {
    return { score: 50, reasons, missingBeneficials }; // Neutral if no concerns specified
  }

  let concernsAddressed = 0;

  for (const concern of concerns) {
    const concernIngredients = CONCERN_INGREDIENTS[concern as keyof typeof CONCERN_INGREDIENTS] || [];
    const foundIngredients = ingredients.filter(ingredient =>
      concernIngredients.some(ci => ingredient.includes(ci) || ci.includes(ingredient))
    );

    if (foundIngredients.length > 0) {
      concernsAddressed++;
      reasons.push(`🎯 Addresses ${concern}: ${foundIngredients.join(', ')}`);
    } else {
      const missingForConcern = concernIngredients.filter(ci =>
        !ingredients.some(ingredient => ingredient.includes(ci) || ci.includes(ingredient))
      );
      missingBeneficials.push(...missingForConcern);
    }
  }

  totalScore = (concernsAddressed / concerns.length) * 100;

  return {
    score: Math.round(totalScore),
    reasons,
    missingBeneficials: [...new Set(missingBeneficials)] // Remove duplicates
  };
}

function analyzePreferences(product: ProductInfo, profile: SkinProfile): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  let totalPreferences = 0;

  // Check finish preference
  if (profile.preferredFinish && product.finish) {
    totalPreferences++;
    if (product.finish.includes(profile.preferredFinish)) {
      score += 50;
      reasons.push(`💄 Matches your preferred ${profile.preferredFinish} finish`);
    }
  }

  // Check coverage preference
  if (profile.preferredCoverage && product.coverage) {
    totalPreferences++;
    if (product.coverage.includes(profile.preferredCoverage)) {
      score += 50;
      reasons.push(`🎨 Matches your preferred ${profile.preferredCoverage} coverage`);
    }
  }

  return {
    score: totalPreferences > 0 ? Math.round(score / totalPreferences) : 50,
    reasons
  };
}

function determineVerdict(score: number, breakdown: MatchResult['breakdown']): { verdict: Verdict; confidence: number } {
  let confidence = 70; // Base confidence

  // Adjust confidence based on data availability
  if (breakdown.skinTypeScore > 0) confidence += 10;
  if (breakdown.ingredientScore > 0) confidence += 15;
  if (breakdown.concernsScore > 0) confidence += 5;

  // Determine verdict based on score
  if (score >= 90) return { verdict: "PERFECT_MATCH", confidence: Math.min(confidence + 10, 100) };
  if (score >= 80) return { verdict: "EXCELLENT_MATCH", confidence: Math.min(confidence + 5, 100) };
  if (score >= 70) return { verdict: "GOOD_MATCH", confidence };
  if (score >= 60) return { verdict: "PARTIAL_MATCH", confidence: Math.max(confidence - 5, 60) };
  if (score >= 50) return { verdict: "FAIR_MATCH", confidence: Math.max(confidence - 10, 50) };
  if (score >= 40) return { verdict: "CAUTION", confidence: Math.max(confidence - 15, 40) };

  return { verdict: "NOT_RECOMMENDED", confidence: Math.max(confidence - 20, 30) };
}

function generateRecommendations(result: MatchResult, product: ProductInfo, profile: SkinProfile): string[] {
  const recommendations: string[] = [];

  // Based on verdict
  if (result.verdict === "PERFECT_MATCH" || result.verdict === "EXCELLENT_MATCH") {
    recommendations.push(`🎉 ${product.name} by ${product.brand} is an excellent match for your ${profile.skinType} skin profile!`);
    if (result.detailedAnalysis.beneficialIngredients.length > 0) {
      recommendations.push(`💡 Key benefits: ${result.detailedAnalysis.beneficialIngredients.slice(0, 3).join(', ')}`);
    }
  }

  if (result.verdict === "GOOD_MATCH") {
    recommendations.push(`👍 ${product.name} is a good match for your ${profile.skinType} skin with some great benefits.`);
  }

  if (result.verdict === "PARTIAL_MATCH") {
    recommendations.push(`⚡ Consider trying ${product.name}, but monitor your ${profile.skinType} skin's response.`);
  }

  if (result.verdict === "CAUTION" || result.verdict === "NOT_RECOMMENDED") {
    recommendations.push(`🤔 ${product.name} may not be ideal for your ${profile.skinType} skin type.`);
    if (result.detailedAnalysis.problematicIngredients.length > 0) {
      recommendations.push(`⚠️ Potential concerns: ${result.detailedAnalysis.problematicIngredients.slice(0, 2).join(', ')}`);
    }
  }

  // Missing beneficials
  if (result.detailedAnalysis.missingBeneficials.length > 0) {
    recommendations.push(`🔍 For your ${profile.skinType} skin, look for products with: ${result.detailedAnalysis.missingBeneficials.slice(0, 3).join(', ')}`);
  }

  return recommendations;
}

function generateCompatibilityNotes(result: MatchResult, product: ProductInfo, profile: SkinProfile): string[] {
  const notes: string[] = [];

  // Skin type compatibility
  if (result.breakdown.skinTypeScore < 70) {
    notes.push(`Consider patch testing ${product.name} as it is formulated for different skin types than your ${profile.skinType} skin.`);
  }

  // Ingredient interactions
  if (result.detailedAnalysis.problematicIngredients.length > 0) {
    notes.push(`Monitor for sensitivity to ${product.name} due to: ${result.detailedAnalysis.problematicIngredients.slice(0, 2).join(', ')}`);
  }

  // Usage recommendations
  if (result.detailedAnalysis.beneficialIngredients.some(i => i.includes('retinol') || i.includes('acid'))) {
    notes.push(`Start with less frequent use of ${product.name} to build tolerance, especially for actives like retinol or acids.`);
  }

  // Brand-specific note
  if (product.brand && profile.preferredBrands && profile.preferredBrands.includes(product.brand)) {
    notes.push(`This product is from your preferred brand: ${product.brand}.`);
  }

  return notes;
}

// Utility function for skin type normalization
function normalizeSkinTypeKey(skinType: string): string {
  const map: Record<string, string> = {
    'oily skin': 'oily',
    'dry skin': 'dry',
    'sensitive skin': 'sensitive',
    'mature skin': 'mature',
    'combination skin': 'combination',
    'normal skin': 'normal',
    'acne-prone': 'acne-prone',
    'acne prone': 'acne-prone',
    'oily': 'oily',
    'dry': 'dry',
    'sensitive': 'sensitive',
    'mature': 'mature',
    'combination': 'combination',
    'normal': 'normal',
  };
  return map[skinType.toLowerCase().trim()] || skinType.toLowerCase().trim();
}

export { analyzeProductAdvanced, type MatchResult, type ProductInfo, type SkinProfile };