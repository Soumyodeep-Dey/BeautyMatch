// src/App.tsx
import { useState, useEffect, StrictMode } from "react";
import { createRoot } from "react-dom/client";

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
};

type SkinProfile = {
  skinType: string;
  skinTone: string;
  allergies: string[];
  dislikedBrands?: string[];
};

type Verdict =
  | "PERFECT_MATCH"
  | "EXCELLENT_MATCH"
  | "GOOD_MATCH"
  | "FAIR_MATCH"
  | "CAUTION"
  | "NOT_RECOMMENDED"
  | "CONTAINS_ALLERGEN"
  | "MISSING_INFORMATION"
  | "USER_PREFERENCE_CONFLICT"
  | "NO_MATCH"
  | "UNKNOWN";

type MatchResult = {
  verdict: Verdict;
  score: number;
  reasons: string[];
  warnings: string[];
  recommendations: string[];
};

// Ingredient lists for different skin types and concerns
const IRRITANTS = {
  sensitive: [
    "alcohol denat",
    "denatured alcohol",
    "fragrance",
    "parfum",
    "essential oils",
    "menthol",
    "eucalyptus",
    "citrus acids",
    "alpha hydroxy acid",
    "salicylic acid",
  ],
  dry: ["alcohol denat", "denatured alcohol", "witch hazel", "menthol", "eucalyptus"],
  oily: ["coconut oil", "palm oil", "isopropyl myristate", "oleic acid"],
  "acne-prone": [
    "coconut oil",
    "cocoa butter",
    "palm oil",
    "isopropyl myristate",
    "sodium lauryl sulfate",
    "oleic acid",
  ],
};

const BENEFICIALS = {
  dry: ["hyaluronic acid", "glycerin", "ceramides", "squalane", "shea butter", "jojoba oil", "vitamin e", "niacinamide"],
  oily: ["niacinamide", "salicylic acid", "zinc oxide", "kaolin clay", "tea tree oil", "retinol"],
  sensitive: ["aloe vera", "chamomile", "allantoin", "panthenol", "zinc oxide", "titanium dioxide"],
  mature: ["retinol", "peptides", "vitamin c", "hyaluronic acid", "niacinamide", "antioxidants"],
};

const SHADE_MATCH = {
  fair: ["fair", "light", "porcelain", "ivory", "vanilla", "pearl"],
  light: ["light", "beige", "sand", "honey", "golden"],
  medium: ["medium", "tan", "caramel", "amber", "bronze"],
  dark: ["dark", "deep", "espresso", "cocoa", "mahogany"],
  neutral: ["neutral", "natural", "true"],
  warm: ["warm", "golden", "yellow", "peachy", "honey"],
  cool: ["cool", "pink", "rose", "berry", "rosy"],
};

// Main matching logic
function analyzeProduct(product: ProductInfo, profile: SkinProfile): MatchResult {
  // 1. Check for missing info
  if (!product.ingredients.length || !profile.skinType) {
    return {
      verdict: "MISSING_INFORMATION",
      score: 0,
      reasons: [],
      warnings: ["Not enough information to analyze this product."],
      recommendations: [],
    };
  }

  let score = 0; // Start with 0
  const reasons: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let hasAllergen = false;
  let userPrefConflict = false;

  console.log("Product:", product);
  console.log("Profile:", profile);
  console.log("Product skinType:", product.skinType, "Profile skinType:", profile.skinType);

  // 2. Allergies (major negative, but cap min score at 10)
  const allergyResult = checkAllergies(product.ingredients, profile.allergies);
  if (allergyResult.hasAllergies) {
    score -= 60;
    hasAllergen = true;
    warnings.push(...allergyResult.warnings);
  }

  // 3. Disliked brands (major negative, but cap min score at 10)
  if (profile.dislikedBrands && product.brand && profile.dislikedBrands.includes(product.brand.toLowerCase())) {
    score -= 30;
    userPrefConflict = true;
    warnings.push(`Brand "${product.brand}" is in your disliked brands.`);
  }

  // 4. Skin type match (major positive)
  if (product.skinType && profile.skinType && product.skinType.map(s => s.toLowerCase()).includes(profile.skinType.toLowerCase())) {
    score += 30;
    reasons.push(`Perfect match for your skin type (${profile.skinType})`);
  } else if (product.skinType && product.skinType.map(s => s.toLowerCase()).includes("all skin types")) {
    score += 15;
    reasons.push("Suitable for all skin types");
  }

  // 5. Beneficial and irritant ingredients
  const type = profile.skinType?.toLowerCase() || "";
  const irritants = IRRITANTS[type as keyof typeof IRRITANTS] || [];
  const beneficials = BENEFICIALS[type as keyof typeof BENEFICIALS] || [];
  const foundIrritants = product.ingredients.filter((i: string) =>
    irritants.some((ir: string) => i.toLowerCase().includes(ir.toLowerCase()))
  );
  if (foundIrritants.length > 0) {
    score -= foundIrritants.length * 5;
    warnings.push(
      `⚠️ Contains ingredients that may not suit ${type} skin: ${foundIrritants.join(", ")}`
    );
  }
  const foundBeneficials = product.ingredients.filter((i: string) =>
    beneficials.some((b: string) => i.toLowerCase().includes(b.toLowerCase()))
  );
  if (foundBeneficials.length > 0) {
    score += foundBeneficials.length * 5;
    reasons.push(
      `✨ Contains beneficial ingredients for ${type} skin: ${foundBeneficials.join(", ")}`
    );
  }

  console.log("Beneficials found:", foundBeneficials);

  // 6. High-quality ingredients
  const highQuality = [
    "hyaluronic acid",
    "retinol",
    "peptides",
    "vitamin c",
    "niacinamide",
    "ceramides",
    "squalane",
    "bakuchiol",
  ];
  const foundHighQuality = product.ingredients.filter((i: string) =>
    highQuality.some((h: string) => i.toLowerCase().includes(h.toLowerCase()))
  );
  if (foundHighQuality.length > 0) {
    score += foundHighQuality.length * 2;
    reasons.push(`💎 Contains high-quality ingredients: ${foundHighQuality.join(", ")}`);
  }
  if (product.ingredients.length > 30) {
    recommendations.push("💡 This product has many ingredients - consider patch testing first");
  }

  console.log("High quality found:", foundHighQuality);

  // 7. Shade match
  if (isMakeup(product) && product.shade && profile.skinTone) {
    const shadeLower = product.shade.toLowerCase();
    const toneLower = profile.skinTone.toLowerCase();
    const userTones = Object.keys(SHADE_MATCH).filter((k) =>
      SHADE_MATCH[k as keyof typeof SHADE_MATCH].some((t) => toneLower.includes(t))
    );
    const shadeTones = Object.keys(SHADE_MATCH).filter((k) =>
      SHADE_MATCH[k as keyof typeof SHADE_MATCH].some((t) => shadeLower.includes(t))
    );
    if (userTones.filter((t) => shadeTones.includes(t)).length > 0) {
      score += 15;
      reasons.push(`🎨 Shade "${product.shade}" matches your ${profile.skinTone} skin tone`);
    } else {
      score -= 10;
      warnings.push(`🎨 Shade "${product.shade}" might not match your ${profile.skinTone} skin tone`);
    }
  }

  console.log("Shade match reasons:", reasons);

  // 8. Category-specific logic (coverage/finish)
  const category = product.category?.toLowerCase() || "";
  const skinType = profile.skinType?.toLowerCase() || "";
  if (category.includes("foundation") || category.includes("concealer")) {
    if (product.coverage) {
      if (skinType.includes("oily") && product.coverage.includes("full")) {
        score += 8;
        reasons.push("💄 Full coverage is great for oily skin");
      }
      if (skinType.includes("dry") && product.coverage.includes("light")) {
        score += 8;
        reasons.push("💄 Light coverage works well with dry skin");
      }
    }
    if (product.finish) {
      if (skinType.includes("oily") && product.finish.includes("matte")) {
        score += 8;
        reasons.push("💄 Matte finish is perfect for oily skin");
      }
      if (skinType.includes("dry") && product.finish.includes("dewy")) {
        score += 8;
        reasons.push("💄 Dewy finish is ideal for dry skin");
      }
    }
  }

  // Custom logic: if product name or brand contains a plus sign (+), add 20 points
  if ((product.name && product.name.includes("+")) || (product.brand && product.brand.includes("+"))) {
    score += 20;
    reasons.push('Contains a plus sign (+) in name or brand: bonus points awarded.');
  }

  // Cap penalties: don't let score go below 10 unless multiple negatives
  if (score < 10 && (hasAllergen || userPrefConflict)) {
    score = 10;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // If score is 0 and there are no reasons or warnings, set verdict to NO_MATCH
  let verdict: Verdict;
  if (score === 0 && reasons.length === 0 && warnings.length === 0) {
    verdict = "NO_MATCH";
  } else {
    verdict = getVerdict(score, warnings.length, { hasAllergen, userPrefConflict });
  }

  console.log("Score:", score);

  return {
    verdict,
    score,
    reasons: reasons.filter(Boolean),
    warnings: warnings.filter(Boolean),
    recommendations: recommendations.filter(Boolean),
  };
}

function checkAllergies(ingredients: string[], allergies: string[]): { hasAllergies: boolean; warnings: string[] } {
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

function isMakeup(product: ProductInfo): boolean {
  const makeupCategories = [
    "foundation",
    "concealer",
    "lipstick",
    "eyeshadow",
    "blush",
    "bronzer",
    "highlighter",
    "lip gloss",
    "tinted moisturizer",
  ];
  const category = product.category?.toLowerCase() || "";
  const name = product.name.toLowerCase();
  return makeupCategories.some((c) => category.includes(c) || name.includes(c));
}

function getVerdict(score: number, warningCount: number, context?: { hasAllergen?: boolean; userPrefConflict?: boolean }): Verdict {
  if (context?.userPrefConflict) return "USER_PREFERENCE_CONFLICT";
  if (context?.hasAllergen) return "CONTAINS_ALLERGEN";
  if (score >= 95) return "PERFECT_MATCH";
  if (score >= 85) return "EXCELLENT_MATCH";
  if (score >= 70) return "GOOD_MATCH";
  if (score >= 55) return "FAIR_MATCH";
  if (warningCount > 2 || score < 40) return "NOT_RECOMMENDED";
  if (warningCount > 0 || score < 60) return "CAUTION";
  return "UNKNOWN";
}

function getVerdictColor(verdict: string) {
  switch (verdict) {
    case 'PERFECT_MATCH': return 'text-green-700 bg-green-50';
    case 'EXCELLENT_MATCH': return 'text-emerald-700 bg-emerald-50';
    case 'GOOD_MATCH': return 'text-blue-700 bg-blue-50';
    case 'FAIR_MATCH': return 'text-yellow-700 bg-yellow-50';
    case 'CAUTION': return 'text-orange-700 bg-orange-50';
    case 'NOT_RECOMMENDED': return 'text-red-700 bg-red-50';
    case 'CONTAINS_ALLERGEN': return 'text-red-800 bg-red-100';
    case 'MISSING_INFORMATION': return 'text-gray-700 bg-gray-100';
    case 'USER_PREFERENCE_CONFLICT': return 'text-pink-700 bg-pink-100';
    case 'NO_MATCH': return 'text-gray-500 bg-gray-100';
    default: return 'text-gray-600 bg-gray-50';
  }
}

function getVerdictEmoji(verdict: string) {
  switch (verdict) {
    case 'PERFECT_MATCH': return '🌟';
    case 'EXCELLENT_MATCH': return '✨';
    case 'GOOD_MATCH': return '👍';
    case 'FAIR_MATCH': return '👌';
    case 'CAUTION': return '⚠️';
    case 'NOT_RECOMMENDED': return '❌';
    case 'CONTAINS_ALLERGEN': return '🚫';
    case 'MISSING_INFORMATION': return '❓';
    case 'USER_PREFERENCE_CONFLICT': return '🙅';
    case 'NO_MATCH': return '🤷';
    default: return '🤔';
  }
}

function formatVerdict(verdict: string) {
  if (verdict === 'NO_MATCH') return 'No Match';
  return verdict
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
}

// Main Popup Component
function App() {
  const [skinProfile, setSkinProfile] = useState<SkinProfile | null>(null)
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null)
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // Load skin profile when popup opens
    chrome.storage.sync.get(['skinProfile'], (result) => {
      if (result.skinProfile) {
        setSkinProfile(result.skinProfile)
      }
    })
  }, [])

  const analyzeCurrentPage = async () => {
    setLoading(true)
    setError('')

    try {
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab.id) {
        throw new Error('Cannot access current tab')
      }

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: "GET_PRODUCT_INFO" })

      if (response.success && response.data) {
        setProductInfo(response.data)

        if (skinProfile) {
          const result = analyzeProduct(response.data, skinProfile)
          setMatchResult(result)
        }
      } else {
        setError(response.error || 'No product found on this page')
      }
    } catch (err) {
      setError('Failed to analyze page. Make sure you\'re on a beauty product page.')
      console.error('Analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  const openOnboarding = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') })
  }

  // Show onboarding screen if no profile exists
  if (!skinProfile) {
    return (
      <div className="w-80 p-4 bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="text-4xl mb-3">💄</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">BeautyMatch</h1>
          <p className="text-gray-600 text-sm mb-4">
            Set up your skin profile to get personalized product recommendations
          </p>
          <button
            onClick={openOnboarding}
            className="w-full py-2 px-4 bg-pink-500 hover:bg-pink-600 text-white rounded-md font-medium transition-colors"
          >
            Set Up Profile
          </button>
        </div>
      </div>
    )
  }

  // Main app interface with profile
  return (
    <div className="w-96 max-h-96 overflow-y-auto bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl">💄</div>
            <h1 className="text-lg font-bold text-gray-800">BeautyMatch</h1>
          </div>
          <button
            onClick={openOnboarding}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Edit Profile
          </button>
        </div>

        {/* Profile Summary */}
        <div className="bg-white rounded-lg p-3 mb-4 shadow-sm">
          <div className="text-sm text-gray-600">
            <div><strong>Skin:</strong> {skinProfile.skinTone} • {skinProfile.skinType}</div>
            {skinProfile.allergies.length > 0 && (
              <div><strong>Allergies:</strong> {skinProfile.allergies.join(', ')}</div>
            )}
          </div>
        </div>

        {/* Analysis Button */}
        <button
          onClick={analyzeCurrentPage}
          disabled={loading}
          className="w-full py-3 px-4 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors mb-4"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Analyzing...
            </div>
          ) : (
            'Analyze This Product'
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="text-red-700 text-sm">{error}</div>
          </div>
        )}

        {/* Product Info */}
        {productInfo && (
          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-2">Product Found</h2>
            <div className="space-y-1 text-sm text-gray-600">
              <div><strong>{productInfo.brand}</strong> {productInfo.name}</div>
              {productInfo.price && <div className="text-pink-600 font-medium">{productInfo.price}</div>}
              {productInfo.shade && <div><strong>Shade:</strong> {productInfo.shade}</div>}
              {productInfo.coverage && <div><strong>Coverage:</strong> {productInfo.coverage}</div>}
              {productInfo.finish && <div><strong>Finish:</strong> {productInfo.finish}</div>}
              <div><strong>Ingredients:</strong> {productInfo.ingredients.length} found</div>
            </div>
          </div>
        )}

        {/* Match Result */}
        {matchResult && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            {/* Verdict */}
            <div className={`rounded-lg p-3 mb-3 ${getVerdictColor(matchResult.verdict)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getVerdictEmoji(matchResult.verdict)}</span>
                  <span className="font-semibold">{formatVerdict(matchResult.verdict)}</span>
                </div>
                <div className="text-sm font-medium">{matchResult.score}/100</div>
              </div>
            </div>
            {matchResult.verdict === 'NO_MATCH' && (
              <div className="mb-3 text-sm text-gray-700">
                This product does not match your profile or preferences in any significant way.
              </div>
            )}
            {/* Special verdict messages */}
            {matchResult.verdict === 'MISSING_INFORMATION' && (
              <div className="mb-3 text-sm text-gray-700">
                Not enough information to make a confident recommendation. Please provide more details in your profile or ensure the product page is complete.
              </div>
            )}
            {matchResult.verdict === 'USER_PREFERENCE_CONFLICT' && (
              <div className="mb-3 text-sm text-pink-700">
                This product conflicts with your stated preferences (e.g., disliked brand or formulation).
              </div>
            )}
            {matchResult.verdict === 'CONTAINS_ALLERGEN' && (
              <div className="mb-3 text-sm text-red-700">
                This product contains an ingredient you want to avoid or are allergic to.
              </div>
            )}
            {/* Reasons */}
            {matchResult.reasons.length > 0 && (
              <div className="mb-3">
                <h3 className="font-medium text-gray-800 mb-2">Why this matches:</h3>
                <div className="space-y-1">
                  {matchResult.reasons.map((reason, idx) => (
                    <div key={idx} className="text-sm text-gray-600 flex items-start gap-1">
                      <div className="mt-1 w-1 h-1 bg-green-400 rounded-full flex-shrink-0"></div>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Warnings */}
            {matchResult.warnings.length > 0 && (
              <div className="mb-3">
                <h3 className="font-medium text-red-700 mb-2">Important warnings:</h3>
                <div className="space-y-1">
                  {matchResult.warnings.map((warning, idx) => (
                    <div key={idx} className="text-sm text-red-600 flex items-start gap-1">
                      <div className="mt-1 w-1 h-1 bg-red-400 rounded-full flex-shrink-0"></div>
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Recommendations */}
            {matchResult.recommendations.length > 0 && (
              <div>
                <h3 className="font-medium text-blue-700 mb-2">Recommendations:</h3>
                <div className="space-y-1">
                  {matchResult.recommendations.map((rec, idx) => (
                    <div key={idx} className="text-sm text-blue-600 flex items-start gap-1">
                      <div className="mt-1 w-1 h-1 bg-blue-400 rounded-full flex-shrink-0"></div>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 text-center">
          <div className="text-xs text-gray-500">
            BeautyMatch • Personalized beauty analysis
          </div>
        </div>
      </div>
    </div>
  )
}

export default App;

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}