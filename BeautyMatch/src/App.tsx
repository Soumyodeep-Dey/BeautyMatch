// src/App.tsx
import { useState, useEffect } from 'react'
import { matchProductToProfile } from './utils/matchingLogic'

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
  score: number;
  reasons: string[];
  warnings: string[];
  recommendations: string[];
}

export default function App() {
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
          const result = matchProductToProfile(response.data, skinProfile)
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