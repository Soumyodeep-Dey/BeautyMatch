// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './public/manifest.json'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        popup: 'index.html',
        onboarding: 'public/onboarding.html',
        background: 'src/background/background.ts'
      }
    }
  }
})


// This configuration file sets up Vite for a Chrome extension project using React.
// It imports necessary plugins and the manifest file, then exports a configuration object.
// The `crx` plugin is used to handle Chrome extension specifics, while the `react` plugin enables React support.

// The `manifest.json` file is expected to be located in the `public` directory, and it contains metadata about the Chrome extension.
// The configuration is structured to allow for easy development and building of the extension with Vite's fast build system.

// To run the project, you would typically use commands like `npm run dev` for development and `npm run build` for production builds.
// Ensure that the necessary dependencies are installed in your project by running `npm install` before starting the development server.

// Note: Make sure to adjust the paths and configurations according to your project structure and requirements.
// This setup is ideal for developing Chrome extensions with modern JavaScript frameworks like React, leveraging Vite's performance and ease of use.

// The `vite.config.ts` file is crucial for configuring the build process and ensuring that the extension works correctly in the Chrome environment.
// It allows for customization of the build process, including handling assets, optimizing performance, and integrating with other tools as needed.

// For more information on Vite and its configuration options, refer to the official Vite documentation: https://vitejs.dev/config/
// For details on the `@crxjs/vite-plugin`, check out its documentation: https://crxjs.github.io/vite-plugin/

// This file is part of the BeautyMatch project, which aims to create a Chrome extension for beauty product recommendations.
// The project structure and configuration are designed to facilitate easy development and deployment of the extension.

// Make sure to keep this file updated with any changes in the project requirements or dependencies.
// Regularly check for updates to the plugins and Vite itself to take advantage of new features and improvements.

// This configuration is a starting point and can be extended with additional plugins or configurations as needed for your specific project requirements.
// Happy coding!    