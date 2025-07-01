import { useEffect, useState } from "react"

type Verdict = "Good Match" | "Caution" | "Not Recommended" | "Loading..."

export default function App() {
  const [verdict, setVerdict] = useState<Verdict>("Loading...")

  useEffect(() => {
    // Fetch profile + product info from storage/runtime
    chrome.storage.sync.get(["skinProfile"], async (data) => {
      const profile = data.skinProfile

      if (!profile) {
        setVerdict("Not Recommended")
        return
      }

      // Simulate receiving scraped product data from content script
      chrome.runtime.sendMessage({ action: "GET_PRODUCT_INFO" }, (product) => {
        const match = matchProductToProfile(profile, product)
        setVerdict(match)
      })
    })
  }, [])

  return (
    <div className="p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">BeautyMatch Verdict</h1>
      <p className={`text-lg font-semibold ${verdict === "Good Match" ? "text-green-600" :
        verdict === "Caution" ? "text-yellow-600" :
          verdict === "Not Recommended" ? "text-red-600" :
            "text-gray-600"
        }`}>
        {verdict}
      </p>
    </div>
  )
}

// --- Simple matching logic (to expand later) ---
function matchProductToProfile(profile: any, product: any): Verdict {
  if (!product) return "Not Recommended"

  const { skinTone, skinType, allergies } = profile
  const { ingredients, shade, formulation } = product

  if (shade && shade.toLowerCase().includes(skinTone.toLowerCase())) {
    if (skinType === "oily" && formulation?.includes("oil")) {
      return "Caution"
    }
    if (allergies && ingredients?.some((ing: string) => allergies.includes(ing))) {
      return "Not Recommended"
    }
    return "Good Match"
  }

  return "Not Recommended"
}
