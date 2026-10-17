import { useState } from 'react'

import AppShell from './components/layout/AppShell'
import type { AppTab } from './components/layout/navigation'
import TodayPage from './pages/TodayPage'

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('today')

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      <TodayPage onNavigate={setActiveTab} />
    </AppShell>
  )
}

export default App
