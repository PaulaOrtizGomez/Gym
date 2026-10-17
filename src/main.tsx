import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import './index.css'

import { initializeDatabase } from './db/initializeDatabase'
import { seedInitialData } from './db/seedInitialData'

async function startApp() {
  try {
    await initializeDatabase()
    await seedInitialData()
  } catch (error) {
    console.error(
      'No se pudo inicializar la aplicación:',
      error,
    )
  }

  createRoot(
    document.getElementById('root')!,
  ).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void startApp()