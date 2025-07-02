// src/content/scraper.ts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "GET_PRODUCT_INFO") {
        const ingredients = document.querySelector("#ingredients")?.textContent || ""
        const shade = document.querySelector(".shade-selector .active")?.textContent || ""
        const formulation = document.querySelector(".formulation")?.textContent || ""

        sendResponse({
            ingredients: ingredients.split(",").map(i => i.trim().toLowerCase()),
            shade: shade.toLowerCase(),
            formulation: formulation.toLowerCase()
        })

        return true // keep sendResponse alive for async
    }
})
