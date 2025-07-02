// src/pages/onboarding-main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import Onboarding from './Onboarding'
import '../index.css'

ReactDOM.createRoot(document.getElementById('onboarding-root')!).render(
    <React.StrictMode>
        <Onboarding />
    </React.StrictMode>,
)