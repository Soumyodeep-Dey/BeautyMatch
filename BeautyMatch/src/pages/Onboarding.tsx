// src/pages/Onboarding.tsx
import { useState, useEffect } from "react"

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [skinTone, setSkinTone] = useState("")
  const [skinType, setSkinType] = useState("")
  const [allergies, setAllergies] = useState("")
  const [concerns, setConcerns] = useState<string[]>([])
  const [coverage, setCoverage] = useState("")
  const [finish, setFinish] = useState("")
  const [favoriteBrands, setFavoriteBrands] = useState("")
  const [dislikedBrands, setDislikedBrands] = useState("")
  const [formulations, setFormulations] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Add useEffect to load profile on mount
  useEffect(() => {
    async function loadProfile() {
      let profile = null;
      if (typeof chrome !== 'undefined' && chrome.storage) {
        profile = await new Promise(resolve => {
          chrome.storage.sync.get(['skinProfile'], (result) => {
            resolve(result.skinProfile || null);
          });
        });
      } else {
        // Fallback for local dev
        const local = localStorage.getItem('skinProfile');
        if (local) profile = JSON.parse(local);
      }
      if (profile) {
        setSkinTone(profile.skinTone || "");
        setSkinType(profile.skinType || "");
        setAllergies((profile.allergies && profile.allergies.length > 0) ? profile.allergies.join(", ") : "");
        setConcerns(profile.concerns || profile.skinConcerns || []);
        setCoverage(profile.preferredCoverage || "");
        setFinish(profile.preferredFinish || "");
        setFavoriteBrands((profile.favoriteBrands && profile.favoriteBrands.length > 0) ? profile.favoriteBrands.join(", ") : "");
        setDislikedBrands((profile.dislikedBrands && profile.dislikedBrands.length > 0) ? profile.dislikedBrands.join(", ") : "");
        setFormulations(profile.formulationPreferences || []);
      }
    }
    loadProfile();
  }, []);

  const skinToneOptions = [
    { value: "fair cool", label: "Fair Cool", description: "Light with pink/blue undertones" },
    { value: "fair warm", label: "Fair Warm", description: "Light with yellow/golden undertones" },
    { value: "fair neutral", label: "Fair Neutral", description: "Light with balanced undertones" },
    { value: "light cool", label: "Light Cool", description: "Light-medium with pink undertones" },
    { value: "light warm", label: "Light Warm", description: "Light-medium with golden undertones" },
    { value: "light neutral", label: "Light Neutral", description: "Light-medium with balanced undertones" },
    { value: "medium cool", label: "Medium Cool", description: "Medium with pink/red undertones" },
    { value: "medium warm", label: "Medium Warm", description: "Medium with golden/yellow undertones" },
    { value: "medium neutral", label: "Medium Neutral", description: "Medium with balanced undertones" },
    { value: "tan cool", label: "Tan Cool", description: "Medium-deep with cool undertones" },
    { value: "tan warm", label: "Tan Warm", description: "Medium-deep with warm undertones" },
    { value: "deep cool", label: "Deep Cool", description: "Deep with cool undertones" },
    { value: "deep warm", label: "Deep Warm", description: "Deep with warm undertones" },
    { value: "deep neutral", label: "Deep Neutral", description: "Deep with balanced undertones" }
  ]

  const skinTypeOptions = [
    { value: "oily", label: "Oily", description: "Shiny T-zone, large pores, prone to breakouts" },
    { value: "dry", label: "Dry", description: "Tight feeling, flaky, small pores" },
    { value: "combination", label: "Combination", description: "Oily T-zone, normal/dry cheeks" },
    { value: "normal", label: "Normal", description: "Balanced, not too oily or dry" },
    { value: "sensitive", label: "Sensitive", description: "Easily irritated, reactive to products" },
    { value: "mature", label: "Mature", description: "Shows signs of aging, may be drier" }
  ]

  const concernOptions = [
    "Acne/Breakouts", "Dark Spots", "Fine Lines", "Large Pores", "Dullness",
    "Redness", "Dark Circles", "Uneven Texture", "Hyperpigmentation", "Sensitivity"
  ]

  const coverageOptions = [
    { value: "light", label: "Light" },
    { value: "medium", label: "Medium" },
    { value: "full", label: "Full" },
    { value: "buildable", label: "Buildable" }
  ]

  const finishOptions = [
    { value: "matte", label: "Matte" },
    { value: "dewy", label: "Dewy" },
    { value: "natural", label: "Natural" },
    { value: "radiant", label: "Radiant" },
    { value: "satin", label: "Satin" }
  ]

  const formulationOptions = [
    "Liquid", "Powder", "Cream", "Gel", "Stick", "Balm", "Foam", "Serum", "Oil", "Lotion", "Spray", "Mousse", "Cushion", "Sheet", "Patch", "Bar", "Mist", "Paste", "Wax", "Emulsion", "Milk", "Ampoule", "Peel", "Mask", "Clay", "Jelly", "Water", "Drops", "Capsule", "Essence", "Ointment", "Fluid", "Compact", "Pencil", "Pen", "Roll-on", "Solid", "Suspension"
  ]

  const toggleConcern = (concern: string) => {
    setConcerns(prev =>
      prev.includes(concern)
        ? prev.filter(c => c !== concern)
        : [...prev, concern]
    )
  }

  const toggleFormulation = (formulation: string) => {
    setFormulations(prev =>
      prev.includes(formulation)
        ? prev.filter(f => f !== formulation)
        : [...prev, formulation]
    )
  }

  const saveProfile = async () => {
    setIsLoading(true)

    const profile = {
      skinTone: skinTone.trim(),
      skinType: skinType.trim().toLowerCase(),
      allergies: allergies.split(",").map(a => a.trim().toLowerCase()).filter(a => a.length > 0),
      concerns: concerns,
      skinConcerns: concerns, // <-- add this line
      preferredCoverage: coverage,
      preferredFinish: finish,
      favoriteBrands: favoriteBrands.split(",").map(b => b.trim()).filter(b => b.length > 0),
      dislikedBrands: dislikedBrands.split(",").map(b => b.trim()).filter(b => b.length > 0),
      formulationPreferences: formulations
    }

    try {
      // Check if we're in a Chrome extension context
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await new Promise<void>((resolve, reject) => {
          chrome.storage.sync.set({ skinProfile: profile }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError)
            } else {
              resolve()
            }
          })
        })
      } else {
        // Fallback to localStorage for development/testing
        localStorage.setItem('skinProfile', JSON.stringify(profile))
      }

      // Show success message
      setStep(6)
    } catch (error) {
      console.error('Failed to save profile:', error)
      alert("Failed to save profile. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => {
    if (step < 6) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const totalSteps = 6
  const canProceed = () => {
    switch (step) {
      case 1: return skinTone !== ""
      case 2: return skinType !== ""
      default: return true // All new fields are optional
    }
  }

  const handleComplete = () => {
    // Try to close the tab/window if we're in extension context
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.getCurrent((tab) => {
        if (tab?.id) {
          chrome.tabs.remove(tab.id)
        }
      })
    } else {
      // Fallback - redirect or close
      window.close()
    }
  }

  if (step === 6) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center transition-all duration-200 hover:shadow-xl">
          <div className="text-6xl mb-4">✨</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Profile Created!</h1>
          <p className="text-gray-600 mb-6">
            Your BeautyMatch profile is ready. You can now get personalized product recommendations on beauty sites.
          </p>
          <button
            onClick={handleComplete}
            className="w-full py-3 px-4 bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-400 text-white rounded-lg font-medium transition-all duration-200 shadow-sm"
            aria-label="Start shopping with your new profile"
          >
            Start Shopping
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">💄</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">BeautyMatch Setup</h1>
          <p className="text-gray-600">Let's create your personalized skin profile</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Step {step} of {totalSteps}</span>
            <span className="text-sm text-gray-500">{Math.round((step / totalSteps) * 100)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-200 hover:shadow-xl">
          {/* Step 1: Skin Tone */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">What's your skin tone?</h2>
              <p className="text-gray-600 mb-6">Choose the option that best matches your skin tone and undertone</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {skinToneOptions.map(option => (
                  <label key={option.value} className="relative block focus-within:ring-2 focus-within:ring-pink-400 transition-all duration-200">
                    <input
                      type="radio"
                      name="skinTone"
                      value={option.value}
                      checked={skinTone === option.value}
                      onChange={(e) => setSkinTone(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${skinTone === option.value
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="font-medium text-gray-800">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Skin Type */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">What's your skin type?</h2>
              <p className="text-gray-600 mb-6">Select the description that best fits your skin</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {skinTypeOptions.map(option => (
                  <label key={option.value} className="relative">
                    <input
                      type="radio"
                      name="skinType"
                      value={option.value}
                      checked={skinType === option.value}
                      onChange={(e) => setSkinType(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${skinType === option.value
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="font-medium text-gray-800">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Allergies & Concerns */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Final touches</h2>

              {/* Allergies */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Known allergies or ingredients to avoid (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., fragrance, parabens, sulfates"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                />
                <p className="text-sm text-gray-500 mt-1">Separate multiple items with commas</p>
              </div>

              {/* Skin Concerns */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What are your main skin concerns? (optional)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {concernOptions.map(concern => (
                    <button
                      key={concern}
                      type="button"
                      onClick={() => toggleConcern(concern)}
                      className={`p-2 text-sm border rounded-lg transition-all ${concerns.includes(concern)
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                    >
                      {concern}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Preferred Coverage & Finish (optional) */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Makeup Preferences <span className="text-sm text-gray-500">(optional)</span></h2>
              {/* Coverage */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred coverage</label>
                <div className="flex flex-wrap gap-2">
                  {coverageOptions.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="coverage"
                        value={opt.value}
                        checked={coverage === opt.value}
                        onChange={() => setCoverage(opt.value)}
                        className="accent-pink-500"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Finish */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred finish</label>
                <div className="flex flex-wrap gap-2">
                  {finishOptions.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="finish"
                        value={opt.value}
                        checked={finish === opt.value}
                        onChange={() => setFinish(opt.value)}
                        className="accent-pink-500"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Brand Preferences (optional) */}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Brand Preferences <span className="text-sm text-gray-500">(optional)</span></h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Favorite brands</label>
                <input
                  type="text"
                  placeholder="e.g., Maybelline, L'Oreal, The Ordinary"
                  value={favoriteBrands}
                  onChange={e => setFavoriteBrands(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                />
                <p className="text-sm text-gray-500 mt-1">Separate multiple brands with commas</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brands to avoid</label>
                <input
                  type="text"
                  placeholder="e.g., BrandX, BrandY"
                  value={dislikedBrands}
                  onChange={e => setDislikedBrands(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                />
                <p className="text-sm text-gray-500 mt-1">Separate multiple brands with commas</p>
              </div>
            </div>
          )}

          {/* Step 6: Formulation Preferences (optional) */}
          {step === 6 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Formulation Preferences <span className="text-sm text-gray-500">(optional)</span></h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {formulationOptions.map(formulation => (
                  <button
                    key={formulation}
                    type="button"
                    onClick={() => toggleFormulation(formulation)}
                    className={`p-2 text-sm border rounded-lg transition-all ${formulations.includes(formulation)
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                  >
                    {formulation}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={step === 1}
              className="mr-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400 rounded transition-all duration-200"
              aria-label="Previous step"
            >
              ← Back
            </button>

            {step === totalSteps ? (
              <button
                onClick={saveProfile}
                disabled={isLoading}
                className="px-8 py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </div>
                ) : (
                  'Complete Setup'
                )}
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="px-4 py-2 bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-400 text-white rounded transition-all duration-200 disabled:bg-gray-300"
                aria-label="Next step"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}