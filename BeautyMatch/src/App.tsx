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
  preferredBrands?: string[];
};

type Verdict =
  | "PERFECT_MATCH"
  | "EXCELLENT_MATCH"
  | "GOOD_MATCH"
  | "PARTIAL_MATCH"
  | "MATCH"
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
  breakdown: {
    skinTypeScore: number;
    ingredientScore: number;
    shadeScore: number;
    brandScore: number;
    priceScore: number;
    ratingScore: number;
    preferenceScore: number;
  };
};

// Minimal beneficials list for each skin type
const BENEFICIALS = {
  dry: ["hyaluronic acid", "glycerin", "ceramides", "squalane", "shea butter", "jojoba oil", "vitamin e", "niacinamide"],
  oily: ["niacinamide", "salicylic acid", "zinc oxide", "kaolin clay", "tea tree oil", "retinol"],
  sensitive: ["aloe vera", "chamomile", "allantoin", "panthenol", "zinc oxide", "titanium dioxide"],
  mature: ["retinol", "peptides", "vitamin c", "hyaluronic acid", "niacinamide", "antioxidants"],
};

// Main matching logic
function analyzeProduct(product: ProductInfo, profile: SkinProfile): MatchResult {
  // Normalize product.skinType to array
  let normalizedSkinType: string[] = [];
  if (product.skinType) {
    if (Array.isArray(product.skinType)) {
      normalizedSkinType = product.skinType
        .filter((s): s is string => typeof s === 'string')
        .map((s: string) => s.toLowerCase().trim())
        .filter((s: string) => Boolean(s));
    } else if (typeof product.skinType === 'string' && (product.skinType as string).length > 0) {
      normalizedSkinType = [(product.skinType as string).toLowerCase().trim()];
    }
    product.skinType = normalizedSkinType;
  }

  // Normalize brand
  if (typeof product.brand === 'string') product.brand = product.brand.toLowerCase().trim();
  if (profile.preferredBrands) profile.preferredBrands = profile.preferredBrands
    .filter((b): b is string => typeof b === 'string')
    .map(b => b.toLowerCase().trim())
    .filter(Boolean);
  if (profile.dislikedBrands) profile.dislikedBrands = profile.dislikedBrands
    .filter((b): b is string => typeof b === 'string')
    .map(b => b.toLowerCase().trim())
    .filter(Boolean);

  // Normalize skinType in profile
  if (typeof profile.skinType === 'string' && profile.skinType.length > 0) {
    profile.skinType = profile.skinType.toLowerCase().trim();
  }

  // 1. Allergy check
  const allergyResult = checkAllergies(product.ingredients, profile.allergies);
  if (allergyResult.hasAllergies) {
    return {
      verdict: "CONTAINS_ALLERGEN",
      score: 0,
      reasons: [],
      warnings: allergyResult.warnings,
      recommendations: [],
      breakdown: {
        skinTypeScore: 0,
        ingredientScore: 0,
        shadeScore: 0,
        brandScore: 0,
        priceScore: 0,
        ratingScore: 0,
        preferenceScore: 0
      }
    };
  }

  // 2. Disliked brand check
  if (profile.dislikedBrands && product.brand && profile.dislikedBrands.includes(product.brand)) {
    return {
      verdict: "USER_PREFERENCE_CONFLICT",
      score: 0,
      reasons: [],
      warnings: [`Brand "${product.brand}" is in your disliked brands.`],
      recommendations: [],
      breakdown: {
        skinTypeScore: 0,
        ingredientScore: 0,
        shadeScore: 0,
        brandScore: 0,
        priceScore: 0,
        ratingScore: 0,
        preferenceScore: 0
      }
    };
  }

  // 3. Skin type match logic + beneficials
  let score = 0;
  let reasons: string[] = [];
  let foundBeneficials: string[] = [];
  if (product.skinType && profile.skinType) {
    // 100: exact match
    if (product.skinType.some(s => s === profile.skinType)) {
      score = 100;
      reasons.push(`Perfect match for your skin type (${profile.skinType})`);
    }
    // 70: all skin types
    else if (product.skinType.some(s => s.includes('all skin types'))) {
      score = 70;
      reasons.push('Suitable for all skin types');
    }
    // 50: partial/related match (e.g., "dry to normal" for "dry")
    else if (product.skinType.some(s => s.includes(profile.skinType))) {
      score = 50;
      reasons.push(`Partial match for your skin type (${profile.skinType})`);
    }
  }

  // Check for beneficial ingredients
  const type = profile.skinType || "";
  const beneficials = BENEFICIALS[type as keyof typeof BENEFICIALS] || [];
  foundBeneficials = product.ingredients.filter((i: string) =>
    beneficials.some((b: string) => i.toLowerCase().includes(b.toLowerCase()))
  );
  if (foundBeneficials.length > 0) {
    score += 20;
    reasons.push(`✨ Contains beneficial ingredients for ${type} skin: ${foundBeneficials.join(", ")}`);
    // Cap at 100
    if (score > 100) score = 100;
    // If there was no skin type match, but beneficials found, set to PARTIAL_MATCH
    if (score === 20) {
      score = 50;
      return {
        verdict: "PARTIAL_MATCH",
        score,
        reasons,
        warnings: [],
        recommendations: [],
        breakdown: {
          skinTypeScore: 0,
          ingredientScore: 50,
          shadeScore: 0,
          brandScore: 0,
          priceScore: 0,
          ratingScore: 0,
          preferenceScore: 0
        }
      };
    }
  }

  if (score > 0) {
    return {
      verdict: score === 100 ? "MATCH" : score >= 90 ? "GOOD_MATCH" : score >= 50 ? "PARTIAL_MATCH" : "NO_MATCH",
      score,
      reasons,
      warnings: [],
      recommendations: [],
      breakdown: {
        skinTypeScore: score,
        ingredientScore: foundBeneficials.length > 0 ? 20 : 0,
        shadeScore: 0,
        brandScore: 0,
        priceScore: 0,
        ratingScore: 0,
        preferenceScore: 0
      }
    };
  }

  // 4. No match
  return {
    verdict: "NO_MATCH",
    score: 0,
    reasons: [],
    warnings: ["No significant match found for your profile."],
    recommendations: [],
    breakdown: {
      skinTypeScore: 0,
      ingredientScore: 0,
      shadeScore: 0,
      brandScore: 0,
      priceScore: 0,
      ratingScore: 0,
      preferenceScore: 0
    }
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

// Minimal verdict helpers for simplified logic
function getVerdictColor(verdict: string) {
  switch (verdict) {
    case 'MATCH': return 'text-green-700 bg-green-50';
    case 'GOOD_MATCH': return 'text-blue-700 bg-blue-50';
    case 'PARTIAL_MATCH': return 'text-yellow-700 bg-yellow-50';
    case 'CONTAINS_ALLERGEN': return 'text-red-800 bg-red-100';
    case 'USER_PREFERENCE_CONFLICT': return 'text-pink-700 bg-pink-100';
    case 'NO_MATCH': return 'text-gray-500 bg-gray-100';
    default: return 'text-gray-600 bg-gray-50';
  }
}

function getVerdictEmoji(verdict: string) {
  switch (verdict) {
    case 'MATCH': return '✅';
    case 'GOOD_MATCH': return '👍';
    case 'PARTIAL_MATCH': return '👌';
    case 'CONTAINS_ALLERGEN': return '🚫';
    case 'USER_PREFERENCE_CONFLICT': return '🙅';
    case 'NO_MATCH': return '🤷';
    default: return '🤔';
  }
}

function formatVerdict(verdict: string) {
  if (verdict === 'NO_MATCH') return 'No Match';
  if (verdict === 'MATCH') return 'Perfect Match';
  if (verdict === 'GOOD_MATCH') return 'Good Match';
  if (verdict === 'PARTIAL_MATCH') return 'Partial Match';
  if (verdict === 'CONTAINS_ALLERGEN') return 'Contains Allergen';
  if (verdict === 'USER_PREFERENCE_CONFLICT') return 'Preference Conflict';
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