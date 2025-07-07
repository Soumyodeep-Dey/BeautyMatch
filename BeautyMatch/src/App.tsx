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
};

type Verdict = "PERFECT_MATCH" | "GOOD_MATCH" | "CAUTION" | "NOT_RECOMMENDED";

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
  let score = 70;
  const reasons: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Allergy check
  const allergyResult = checkAllergies(product.ingredients, profile.allergies);
  if (allergyResult.hasAllergies) {
    score -= 50;
    warnings.push(...allergyResult.warnings);
  }

  // Skin type logic
  const skinTypeResult = checkSkinType(product, profile.skinType);
  score += skinTypeResult.scoreAdjustment;
  reasons.push(...skinTypeResult.reasons);
  warnings.push(...skinTypeResult.warnings);

  // Shade match
  if (isMakeup(product) && product.shade && profile.skinTone) {
    const shadeResult = checkShade(product.shade, profile.skinTone);
    score += shadeResult.scoreAdjustment;
    reasons.push(...shadeResult.reasons);
    if (shadeResult.warning) warnings.push(shadeResult.warning);
  }

  // High-quality ingredients
  const qualityResult = checkQualityIngredients(product.ingredients);
  score += qualityResult.scoreAdjustment;
  reasons.push(...qualityResult.reasons);
  recommendations.push(...qualityResult.recommendations);

  // Category-specific logic
  const categoryResult = checkCategory(product, profile);
  score += categoryResult.scoreAdjustment;
  reasons.push(...categoryResult.reasons);

  // Final verdict
  return {
    verdict: getVerdict(score, warnings.length) as Verdict,
    score: Math.max(0, Math.min(100, score)),
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

function checkSkinType(product: ProductInfo, skinType: string): { scoreAdjustment: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let scoreAdjustment = 0;
  const type = skinType.toLowerCase();
  if (
    product.skinType &&
    product.skinType.length > 0 &&
    product.skinType.some(
      (t: string) => t.toLowerCase().includes(type) || t.toLowerCase().includes("all skin types")
    )
  ) {
    scoreAdjustment += 10;
    reasons.push(`✅ Specifically formulated for ${type} skin`);
  }
  // Irritants
  const irritants = IRRITANTS[type as keyof typeof IRRITANTS] || [];
  const foundIrritants = product.ingredients.filter((i: string) =>
    irritants.some((ir: string) => i.toLowerCase().includes(ir.toLowerCase()))
  );
  if (foundIrritants.length > 0) {
    scoreAdjustment -= foundIrritants.length * 5;
    warnings.push(
      `⚠️ Contains ingredients that may not suit ${type} skin: ${foundIrritants.join(", ")}`
    );
  }
  // Beneficials
  const beneficials = BENEFICIALS[type as keyof typeof BENEFICIALS] || [];
  const foundBeneficials = product.ingredients.filter((i: string) =>
    beneficials.some((b: string) => i.toLowerCase().includes(b.toLowerCase()))
  );
  if (foundBeneficials.length > 0) {
    scoreAdjustment += foundBeneficials.length * 3;
    reasons.push(
      `✨ Contains beneficial ingredients for ${type} skin: ${foundBeneficials.join(", ")}`
    );
  }
  return { scoreAdjustment, reasons, warnings };
}

function checkShade(shade: string, skinTone: string): { scoreAdjustment: number; reasons: string[]; warning?: string } {
  const reasons: string[] = [];
  let scoreAdjustment = 0;
  const shadeLower = shade.toLowerCase();
  const toneLower = skinTone.toLowerCase();
  const userTones = Object.keys(SHADE_MATCH).filter((k) =>
    SHADE_MATCH[k as keyof typeof SHADE_MATCH].some((t) => toneLower.includes(t))
  );
  const shadeTones = Object.keys(SHADE_MATCH).filter((k) =>
    SHADE_MATCH[k as keyof typeof SHADE_MATCH].some((t) => shadeLower.includes(t))
  );
  if (userTones.filter((t) => shadeTones.includes(t)).length > 0) {
    scoreAdjustment += 15;
    reasons.push(`🎨 Shade "${shade}" matches your ${skinTone} skin tone`);
    return { scoreAdjustment, reasons };
  } else {
    return {
      scoreAdjustment: -10,
      reasons,
      warning: `🎨 Shade "${shade}" might not match your ${skinTone} skin tone`,
    };
  }
}

function checkQualityIngredients(ingredients: string[]): { scoreAdjustment: number; reasons: string[]; recommendations: string[] } {
  const reasons: string[] = [];
  const recommendations: string[] = [];
  let scoreAdjustment = 0;
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
  const found = ingredients.filter((i: string) =>
    highQuality.some((h: string) => i.toLowerCase().includes(h.toLowerCase()))
  );
  if (found.length > 0) {
    scoreAdjustment += found.length * 2;
    reasons.push(`💎 Contains high-quality ingredients: ${found.join(", ")}`);
  }
  if (ingredients.length > 30) {
    recommendations.push("💡 This product has many ingredients - consider patch testing first");
  }
  return { scoreAdjustment, reasons, recommendations };
}

function checkCategory(product: ProductInfo, profile: SkinProfile): { scoreAdjustment: number; reasons: string[] } {
  const reasons: string[] = [];
  let scoreAdjustment = 0;
  const category = product.category?.toLowerCase() || "";
  const skinType = profile.skinType.toLowerCase();
  if (category.includes("foundation") || category.includes("concealer")) {
    if (product.coverage) {
      if (skinType.includes("oily") && product.coverage.includes("full")) {
        scoreAdjustment += 5;
        reasons.push("💄 Full coverage is great for oily skin");
      }
      if (skinType.includes("dry") && product.coverage.includes("light")) {
        scoreAdjustment += 5;
        reasons.push("💄 Light coverage works well with dry skin");
      }
    }
    if (product.finish) {
      if (skinType.includes("oily") && product.finish.includes("matte")) {
        scoreAdjustment += 8;
        reasons.push("💄 Matte finish is perfect for oily skin");
      }
      if (skinType.includes("dry") && product.finish.includes("dewy")) {
        scoreAdjustment += 8;
        reasons.push("💄 Dewy finish is ideal for dry skin");
      }
    }
  }
  return { scoreAdjustment, reasons };
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

function getVerdict(score: number, warningCount: number): Verdict {
  if (warningCount > 2 || score < 40) return "NOT_RECOMMENDED";
  if (warningCount > 0 || score < 60) return "CAUTION";
  if (score >= 85) return "PERFECT_MATCH";
  return "GOOD_MATCH";
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

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'PERFECT_MATCH': return 'text-green-600 bg-green-50'
      case 'GOOD_MATCH': return 'text-blue-600 bg-blue-50'
      case 'CAUTION': return 'text-yellow-600 bg-yellow-50'
      case 'NOT_RECOMMENDED': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getVerdictEmoji = (verdict: string) => {
    switch (verdict) {
      case 'PERFECT_MATCH': return '✨'
      case 'GOOD_MATCH': return '👍'
      case 'CAUTION': return '⚠️'
      case 'NOT_RECOMMENDED': return '❌'
      default: return '🤔'
    }
  }

  const formatVerdict = (verdict: string) => {
    return verdict.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
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