import { FiSun, FiSettings } from 'react-icons/fi'
import useStore from '../store'

export default function Header() {
  const step = useStore((s) => s.step)
  const reset = useStore((s) => s.reset)
  const openProfileSetup = useStore((s) => s.openProfileSetup)

  return (
    <header className="bg-green-main text-white shadow-lg">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <button onClick={reset} className="flex items-center gap-2 hover:opacity-80 transition">
          <div className="w-10 h-10 bg-orange-point rounded-full flex items-center justify-center">
            <FiSun className="text-white text-xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">농부ON</h1>
            <p className="text-xs text-green-100 opacity-80">숏폼 영상 제작</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={openProfileSetup}
            className="text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
            title="농장 프로필 설정"
          >
            <FiSettings className="text-sm" /> 설정
          </button>
          {step > 0 && (
            <button
              onClick={reset}
              className="text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition"
            >
              처음부터
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
