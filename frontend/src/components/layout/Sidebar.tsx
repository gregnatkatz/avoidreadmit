import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  FileCheck, 
  GitCompare, 
  Sparkles, 
  Bot, 
  Settings 
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/worklist', icon: Users, label: 'Worklist' },
  { to: '/decisions', icon: FileCheck, label: 'Decisions' },
  { to: '/compare', icon: GitCompare, label: 'Compare' },
  { to: '/patterns', icon: Sparkles, label: 'Patterns' },
  { to: '/ai-activity', icon: Bot, label: 'AI Activity' },
  { to: '/demo', icon: Settings, label: 'Demo Control' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-72 glass-card m-4 rounded-2xl p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">DCG Context Graph</h1>
        <p className="text-xs text-gray-400 mt-1">Healthcare Decision Intelligence</p>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'sidebar-active text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="pt-4 border-t border-white/10">
        <div className="glass-card p-4 rounded-xl">
          <p className="text-xs text-gray-400 mb-2">Context Graph Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-white">Active & Learning</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
