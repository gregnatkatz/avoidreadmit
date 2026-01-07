import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Worklist from './pages/Worklist'
import Decisions from './pages/Decisions'
import Compare from './pages/Compare'
import Patterns from './pages/Patterns'
import AIActivity from './pages/AIActivity'
import DemoControl from './pages/DemoControl'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="worklist" element={<Worklist />} />
          <Route path="decisions" element={<Decisions />} />
          <Route path="compare" element={<Compare />} />
          <Route path="patterns" element={<Patterns />} />
          <Route path="ai-activity" element={<AIActivity />} />
          <Route path="demo" element={<DemoControl />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
