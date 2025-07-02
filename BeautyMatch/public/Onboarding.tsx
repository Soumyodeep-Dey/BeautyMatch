// src/pages/Onboarding.tsx
import { useState } from "react"

// Add this if you are building a Chrome extension and want TypeScript to recognize 'chrome'
declare const chrome: any;

export default function Onboarding() {
    const [skinTone, setSkinTone] = useState("")
    const [skinType, setSkinType] = useState("")
    const [allergies, setAllergies] = useState("")

    const saveProfile = () => {
        const profile = {
            skinTone: skinTone.trim(),
            skinType: skinType.trim().toLowerCase(),
            allergies: allergies.split(",").map(a => a.trim().toLowerCase())
        }

        chrome.storage.sync.set({ skinProfile: profile }, () => {
            alert("Skin profile saved!")
        })
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4 text-center">Set Up Your Skin Profile</h1>

            <div className="flex flex-col gap-2">
                <input
                    type="text"
                    placeholder="Skin Tone (e.g., Fair, Medium, Dark)"
                    value={skinTone}
                    onChange={(e) => setSkinTone(e.target.value)}
                    className="p-2 border rounded"
                />

                <input
                    type="text"
                    placeholder="Skin Type (e.g., oily, dry, normal)"
                    value={skinType}
                    onChange={(e) => setSkinType(e.target.value)}
                    className="p-2 border rounded"
                />

                <input
                    type="text"
                    placeholder="Allergies (comma-separated)"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    className="p-2 border rounded"
                />

                <button onClick={saveProfile} className="mt-4 p-2 bg-blue-600 text-white rounded">
                    Save Profile
                </button>
            </div>
        </div>
    )
}
