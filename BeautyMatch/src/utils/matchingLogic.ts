// src/utils/matchingLogic.ts
interface SkinProfile {
    skinTone: string;
    skinType: string;
    allergies: string[];
  }
  
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
  
  interface MatchResult {
    verdict: 'PERFECT_MATCH' | 'GOOD_MATCH' | 'CAUTION' | 'NOT_RECOMMENDED';
    score: number; // 0-100
    reasons: string[];
    warnings: string[];
    recommendations: string[];
  }
  
  // Common problematic ingredients for different skin types
  const PROBLEMATIC_INGREDIENTS = {
    sensitive: [
      'alcohol denat', 'denatured alcohol', 'fragrance', 'parfum', 'essential oils',
      'menthol', 'eucalyptus', 'citrus acids', 'alpha hydroxy acid', 'salicylic acid'
    ],
    dry: [
      'alcohol denat', 'denatured alcohol', 'witch hazel', 'menthol', 'eucalyptus'
    ],
    oily: [
      'coconut oil', 'palm oil', 'isopropyl myristate', 'oleic acid'
    ],
    'acne-prone': [
      'coconut oil', 'cocoa butter', 'palm oil', 'isopropyl myristate', 
      'sodium lauryl sulfate', 'oleic acid'
    ]
  };
  
  // Beneficial ingredients for different skin types
  const BENEFICIAL_INGREDIENTS = {
    dry: [
      'hyaluronic acid', 'glycerin', 'ceramides', 'squalane', 'shea butter', 
      'jojoba oil', 'vitamin e', 'niacinamide'
    ],
    oily: [
      'niacinamide', 'salicylic acid', 'zinc oxide', 'kaolin clay', 
      'tea tree oil', 'retinol'
    ],
    sensitive: [
      'aloe vera', 'chamomile', 'allantoin', 'panthenol', 'zinc oxide',
      'titanium dioxide'
    ],
    mature: [
      'retinol', 'peptides', 'vitamin c', 'hyaluronic acid', 'niacinamide',
      'antioxidants'
    ]
  };
  
  // Shade matching helpers
  const SHADE_KEYWORDS = {
    fair: ['fair', 'light', 'porcelain', 'ivory', 'vanilla', 'pearl'],
    light: ['light', 'beige', 'sand', 'honey', 'golden'],
    medium: ['medium', 'tan', 'caramel', 'amber', 'bronze'],
    dark: ['dark', 'deep', 'espresso', 'cocoa', 'mahogany'],
    neutral: ['neutral', 'natural', 'true'],
    warm: ['warm', 'golden', 'yellow', 'peachy', 'honey'],
    cool: ['cool', 'pink', 'rose', 'berry', 'rosy']
  };
  
  export function matchProductToProfile(product: ProductInfo, profile: SkinProfile): MatchResult {
    let score = 70; // Start with neutral score
    const reasons: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
  
    // 1. Check for allergic ingredients (CRITICAL)
    const allergyMatch = checkAllergies(product.ingredients, profile.allergies);
    if (allergyMatch.hasAllergies) {
      score -= 50;
      warnings.push(...allergyMatch.warnings);
    }
  
    // 2. Skin type compatibility
    const skinTypeMatch = checkSkinTypeCompatibility(product, profile.skinType);
    score += skinTypeMatch.scoreAdjustment;
    reasons.push(...skinTypeMatch.reasons);
    warnings.push(...skinTypeMatch.warnings);
  
    // 3. Shade matching (for makeup products)
    if (isColorProduct(product) && product.shade && profile.skinTone) {
      const shadeMatch = checkShadeCompatibility(product.shade, profile.skinTone);
      score += shadeMatch.scoreAdjustment;
      reasons.push(...shadeMatch.reasons);
      if (shadeMatch.warning) warnings.push(shadeMatch.warning);
    }
  
    // 4. Ingredient analysis
    const ingredientAnalysis = analyzeIngredients(product.ingredients);
    score += ingredientAnalysis.scoreAdjustment;
    reasons.push(...ingredientAnalysis.reasons);
    recommendations.push(...ingredientAnalysis.recommendations);
  
    // 5. Product category specific checks
    const categoryMatch = checkCategorySpecific(product, profile);
    score += categoryMatch.scoreAdjustment;
    reasons.push(...categoryMatch.reasons);
  
    // Determine final verdict
    const verdict = determineVerdict(score, warnings.length);
  
    return {
      verdict,
      score: Math.max(0, Math.min(100, score)),
      reasons: reasons.filter(r => r.length > 0),
      warnings: warnings.filter(w => w.length > 0),
      recommendations: recommendations.filter(r => r.length > 0)
    };
  }
  
  function checkAllergies(ingredients: string[], allergies: string[]): {
    hasAllergies: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let hasAllergies = false;
  
    for (const allergy of allergies) {
      const allergyLower = allergy.toLowerCase().trim();
      for (const ingredient of ingredients) {
        if (ingredient.toLowerCase().includes(allergyLower)) {
          hasAllergies = true;
          warnings.push(`⚠️ Contains ${ingredient} (matches your allergy: ${allergy})`);
        }
      }
    }
  
    return { hasAllergies, warnings };
  }
  
  function checkSkinTypeCompatibility(product: ProductInfo, userSkinType: string): {
    scoreAdjustment: number;
    reasons: string[];
    warnings: string[];
  } {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let scoreAdjustment = 0;
  
    const skinTypeLower = userSkinType.toLowerCase();
  
    // Check if product explicitly mentions suitable skin types
    if (product.skinType && product.skinType.length > 0) {
      const suitableForUser = product.skinType.some(type => 
        type.toLowerCase().includes(skinTypeLower) || 
        type.toLowerCase().includes('all skin types')
      );
      
      if (suitableForUser) {
        scoreAdjustment += 10;
        reasons.push(`✅ Specifically formulated for ${skinTypeLower} skin`);
      }
    }
  
    // Check problematic ingredients for skin type
    const problematicForSkinType = PROBLEMATIC_INGREDIENTS[skinTypeLower as keyof typeof PROBLEMATIC_INGREDIENTS] || [];
    const foundProblematic = product.ingredients.filter(ingredient => 
      problematicForSkinType.some(problematic => 
        ingredient.toLowerCase().includes(problematic.toLowerCase())
      )
    );
  
    if (foundProblematic.length > 0) {
      scoreAdjustment -= foundProblematic.length * 5;
      warnings.push(`⚠️ Contains ingredients that may not suit ${skinTypeLower} skin: ${foundProblematic.join(', ')}`);
    }
  
    // Check beneficial ingredients
    const beneficialForSkinType = BENEFICIAL_INGREDIENTS[skinTypeLower as keyof typeof BENEFICIAL_INGREDIENTS] || [];
    const foundBeneficial = product.ingredients.filter(ingredient => 
      beneficialForSkinType.some(beneficial => 
        ingredient.toLowerCase().includes(beneficial.toLowerCase())
      )
    );
  
    if (foundBeneficial.length > 0) {
      scoreAdjustment += foundBeneficial.length * 3;
      reasons.push(`✨ Contains beneficial ingredients for ${skinTypeLower} skin: ${foundBeneficial.join(', ')}`);
    }
  
    return { scoreAdjustment, reasons, warnings };
  }
  
  function checkShadeCompatibility(productShade: string, userSkinTone: string): {
    scoreAdjustment: number;
    reasons: string[];
    warning?: string;
  } {
    const reasons: string[] = [];
    let scoreAdjustment = 0;
  
    const productShadeLower = productShade.toLowerCase();
    const userSkinToneLower = userSkinTone.toLowerCase();
  
    // Check if shade matches user's general tone
    const userToneCategories = Object.keys(SHADE_KEYWORDS).filter(category =>
      SHADE_KEYWORDS[category as keyof typeof SHADE_KEYWORDS].some(keyword =>
        userSkinToneLower.includes(keyword)
      )
    );
  
    const productToneCategories = Object.keys(SHADE_KEYWORDS).filter(category =>
      SHADE_KEYWORDS[category as keyof typeof SHADE_KEYWORDS].some(keyword =>
        productShadeLower.includes(keyword)
      )
    );
  
    const matchingCategories = userToneCategories.filter(cat => 
      productToneCategories.includes(cat)
    );
  
    if (matchingCategories.length > 0) {
      scoreAdjustment += 15;
      reasons.push(`🎨 Shade "${productShade}" matches your ${userSkinTone} skin tone`);
    } else {
      const warning = `🎨 Shade "${productShade}" might not match your ${userSkinTone} skin tone`;
      return { scoreAdjustment: -10, reasons, warning };
    }
  
    return { scoreAdjustment, reasons };
  }
  
  function analyzeIngredients(ingredients: string[]): {
    scoreAdjustment: number;
    reasons: string[];
    recommendations: string[];
  } {
    const reasons: string[] = [];
    const recommendations: string[] = [];
    let scoreAdjustment = 0;
  
    // Check for high-quality/premium ingredients
    const premiumIngredients = [
      'hyaluronic acid', 'retinol', 'peptides', 'vitamin c', 'niacinamide',
      'ceramides', 'squalane', 'bakuchiol'
    ];
  
    const foundPremium = ingredients.filter(ingredient => 
      premiumIngredients.some(premium => 
        ingredient.toLowerCase().includes(premium.toLowerCase())
      )
    );
  
    if (foundPremium.length > 0) {
      scoreAdjustment += foundPremium.length * 2;
      reasons.push(`💎 Contains high-quality ingredients: ${foundPremium.join(', ')}`);
    }
  
    // Check ingredient list length (very long lists might indicate over-formulation)
    if (ingredients.length > 30) {
      recommendations.push('💡 This product has many ingredients - consider patch testing first');
    }
  
    return { scoreAdjustment, reasons, recommendations };
  }
  
  function checkCategorySpecific(product: ProductInfo, profile: SkinProfile): {
    scoreAdjustment: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let scoreAdjustment = 0;
  
    const category = product.category?.toLowerCase() || '';
    const skinType = profile.skinType.toLowerCase();
  
    // Foundation-specific checks
    if (category.includes('foundation') || category.includes('concealer')) {
      if (product.coverage) {
        if (skinType.includes('oily') && product.coverage.includes('full')) {
          scoreAdjustment += 5;
          reasons.push('💄 Full coverage is great for oily skin');
        }
        if (skinType.includes('dry') && product.coverage.includes('light')) {
          scoreAdjustment += 5;
          reasons.push('💄 Light coverage works well with dry skin');
        }
      }
  
      if (product.finish) {
        if (skinType.includes('oily') && product.finish.includes('matte')) {
          scoreAdjustment += 8;
          reasons.push('💄 Matte finish is perfect for oily skin');
        }
        if (skinType.includes('dry') && product.finish.includes('dewy')) {
          scoreAdjustment += 8;
          reasons.push('💄 Dewy finish is ideal for dry skin');
        }
      }
    }
  
    return { scoreAdjustment, reasons };
  }
  
  function isColorProduct(product: ProductInfo): boolean {
    const colorCategories = [
      'foundation', 'concealer', 'lipstick', 'eyeshadow', 'blush', 
      'bronzer', 'highlighter', 'lip gloss', 'tinted moisturizer'
    ];
    
    const category = product.category?.toLowerCase() || '';
    const name = product.name.toLowerCase();
    
    return colorCategories.some(cat => category.includes(cat) || name.includes(cat));
  }
  
  function determineVerdict(score: number, warningCount: number): 'PERFECT_MATCH' | 'GOOD_MATCH' | 'CAUTION' | 'NOT_RECOMMENDED' {
    if (warningCount > 2 || score < 40) return 'NOT_RECOMMENDED';
    if (warningCount > 0 || score < 60) return 'CAUTION';
    if (score >= 85) return 'PERFECT_MATCH';
    return 'GOOD_MATCH';
  }