import { FiCheck } from 'react-icons/fi'

export default function Stepper({ steps, current }) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                i < current
                  ? 'bg-green-main text-white'
                  : i === current
                  ? 'bg-orange-point text-white ring-4 ring-orange-50'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {i < current ? <FiCheck /> : i + 1}
            </div>
            <span
              className={`text-xs mt-1 whitespace-nowrap ${
                i === current ? 'text-orange-point font-semibold' : 'text-gray-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 mt-[-16px] ${
                i < current ? 'bg-green-main' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
