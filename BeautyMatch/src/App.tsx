// src/App.tsx
import { useState, useEffect } from "react";
import { analyzeProductAdvanced, type MatchResult, type ProductInfo, type SkinProfile } from "./content/scraper";

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
    // Listen for changes to skinProfile in storage
    function handleStorageChange(
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) {
      if (area === 'sync' && changes.skinProfile) {
        setSkinProfile(changes.skinProfile.newValue)
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
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
          const result = analyzeProductAdvanced(response.data, skinProfile)
          setMatchResult(result)
        }
      } else {
        setError(response.error || 'No product found on this page')
      }
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as any).message === 'string' &&
        (err as any).message.includes('Could not establish connection')
      ) {
        setError('Could not analyze this page. Please make sure you are on a supported product page.');
      } else {
        setError('Failed to analyze page. Make sure you\'re on a beauty product page.');
      }
      console.error('Analysis error:', err);
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
            className="w-full py-2 px-4 bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-400 text-white rounded-md font-medium transition-all duration-200 shadow-sm"
            aria-label="Set up skin profile"
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
            className="text-xs text-gray-500 hover:text-gray-700 underline focus:outline-none focus:ring-2 focus:ring-pink-400 rounded"
            aria-label="Edit skin profile"
          >
            Edit Profile
          </button>
        </div>

        {/* Profile Summary */}
        <div className="bg-white rounded-lg p-3 mb-4 shadow-sm transition-all duration-200 hover:shadow-md">
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
          className="w-full py-3 px-4 bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:bg-gray-300 text-white rounded-lg font-medium transition-all duration-200 mb-4 shadow-sm"
          aria-busy={loading}
          aria-label="Analyze this product for compatibility"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="sr-only">Analyzing...</span>
              <span aria-live="polite">Analyzing...</span>
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
          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm transition-all duration-200 hover:shadow-md">
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
          <div className="rounded-xl p-4 mb-4 flex items-center justify-between shadow transition-all duration-200 bg-gradient-to-r from-yellow-50 to-white border border-yellow-200">
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {matchResult.verdict === "CAUTION" ? "⚠️" : "🔍"}
              </span>
              <div>
                <span className="block font-bold text-lg text-yellow-700">
                  {matchResult.verdict === "CAUTION" ? "Needs Review" : matchResult.verdict.replace("_", " ")}
                </span>
                <span className="block text-xs text-gray-500">
                  Confidence: {matchResult.confidence || 0}%
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-extrabold text-2xl text-yellow-800 drop-shadow">{matchResult.score}/100</span>
              {/* Progress bar */}
              <div className="w-20 h-2 bg-yellow-100 rounded-full mt-1">
                <div
                  className="h-2 rounded-full bg-yellow-400 transition-all"
                  style={{ width: `${matchResult.score}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
        {matchResult?.verdict === "CAUTION" && (
          <div className="text-yellow-700 text-xs mb-4 px-2">
            This product isn’t a perfect match for your profile, but it’s not necessarily bad! Check the recommendations below to see how it could work for you.
          </div>
        )}

        {/* Reasons */}
        {matchResult && matchResult.reasons.length > 0 && (
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
        {matchResult && matchResult.warnings.length > 0 && (
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
        {matchResult && matchResult.recommendations.length > 0 && (
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
        {/* Detailed Analysis */}
        {matchResult && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md">
            <h3 className="font-semibold text-pink-700 mb-3 text-base">Detailed Analysis</h3>
            <div className="mb-2 flex flex-wrap items-center">
              <span className="font-medium text-green-700 mr-2">Beneficial:</span>
              {(matchResult.detailedAnalysis?.beneficialIngredients?.length > 0)
                ? matchResult.detailedAnalysis.beneficialIngredients.map((item, idx) => (
                  <span key={idx} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">{item}</span>
                ))
                : <span className="text-gray-500 text-xs">None</span>
              }
            </div>
            <div className="mb-2 flex flex-wrap items-center">
              <span className="font-medium text-red-700 mr-2">Problematic:</span>
              {(matchResult.detailedAnalysis?.problematicIngredients?.length > 0)
                ? matchResult.detailedAnalysis.problematicIngredients.map((item, idx) => (
                  <span key={idx} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">{item}</span>
                ))
                : <span className="text-gray-500 text-xs">None</span>
              }
            </div>
            <div className="mb-2">
              <span className="font-medium text-blue-700">Missing Beneficials:</span>
              <span className="text-xs text-blue-800 ml-2">
                {matchResult.detailedAnalysis?.missingBeneficials?.join(', ') || 'None'}
              </span>
            </div>
            <div>
              <span className="font-medium text-purple-700">Compatibility Notes:</span>
              <span className="text-xs text-purple-800 ml-2">
                {matchResult.detailedAnalysis?.compatibilityNotes?.join('; ') || 'None'}
              </span>
            </div>
          </div>
        )}

        {/* Score Breakdown */}
        {matchResult && (
          <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md">
            <h3 className="font-semibold text-pink-700 mb-3 text-base">Score Breakdown</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="font-medium text-gray-700">Skin Type:</span> <span className="text-gray-800">{matchResult.breakdown.skinTypeScore}</span></div>
              <div><span className="font-medium text-gray-700">Ingredients:</span> <span className="text-gray-800">{matchResult.breakdown.ingredientScore}</span></div>
              <div><span className="font-medium text-gray-700">Concerns:</span> <span className="text-gray-800">{matchResult.breakdown.concernsScore}</span></div>
              <div><span className="font-medium text-gray-700">Preferences:</span> <span className="text-gray-800">{matchResult.breakdown.preferenceScore}</span></div>
              <div><span className="font-medium text-gray-700">Brand:</span> <span className="text-gray-800">{matchResult.breakdown.brandScore}</span></div>
              <div><span className="font-medium text-gray-700">Safety:</span> <span className="text-gray-800">{matchResult.breakdown.safetyScore}</span></div>
            </div>
          </div>
        )}
      </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <a
            href="https://soumyodeep-dey.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-pink-600 transition-colors underline"
          >
            BeautyMatch • Personalized beauty analysis
            <br />
            Built by Soumyodeep Dey
          </a>
        </div>
    </div>
  )
}

export default App;

