import { useState, useEffect, useRef } from 'react'
import useStore from '../store'
import { FiArrowRight, FiKey, FiChevronDown, FiChevronUp, FiCheck, FiEdit2 } from 'react-icons/fi'

export default function Onboarding() {
  const farmName = useStore((s) => s.farmName)
  const geminiKey = useStore((s) => s.geminiKey)
  const farmProfile = useStore((s) => s.farmProfile)
  const setFarmName = useStore((s) => s.setFarmName)
  const setGeminiKey = useStore((s) => s.setGeminiKey)
  const setStep = useStore((s) => s.setStep)
  const openProfileSetup = useStore((s) => s.openProfileSetup)

  const [apiOpen, setApiOpen] = useState(!geminiKey)

  // Auto-fill farmName from profile (once)
  const prefilled = useRef(false)
  useEffect(() => {
    if (farmProfile && !prefilled.current) {
      prefilled.current = true
      if (!farmName && farmProfile.farmName) setFarmName(farmProfile.farmName)
    }
  }, [farmProfile])

  const canProceed = farmName.trim()

  // Build profile summary line
  const profileParts = []
  if (farmProfile?.farmName) profileParts.push(farmProfile.farmName)
  if (farmProfile?.crops) profileParts.push(farmProfile.crops)
  if (farmProfile?.region) {
    const regionStr = [farmProfile.region.도, farmProfile.region.시군구, farmProfile.region.읍면동].filter(Boolean).join(' ')
    if (regionStr) profileParts.push(regionStr)
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-green-main">농장 정보를 알려주세요</h2>
        <p className="text-gray-500 mt-1">영상 나레이션에 활용됩니다</p>
      </div>

      {/* Farm Profile Summary */}
      {farmProfile && profileParts.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-green-50 border border-green-main/20 rounded-xl">
          <p className="text-sm text-green-main font-medium truncate">
            🌾 {profileParts.join(' | ')}
          </p>
          <button
            onClick={openProfileSetup}
            className="shrink-0 ml-3 text-xs text-green-main hover:text-green-600 flex items-center gap-1 transition"
          >
            <FiEdit2 className="text-[11px]" /> 수정
          </button>
        </div>
      )}

      {/* API Key Settings */}
      <div className="border-2 border-orange-point/30 rounded-2xl overflow-hidden">
        <button
          onClick={() => setApiOpen(!apiOpen)}
          className="w-full px-4 py-3 flex items-center justify-between bg-orange-50 hover:bg-orange-50/80 transition"
        >
          <div className="flex items-center gap-2">
            <FiKey className="text-orange-point" />
            <span className="font-semibold text-sm text-gray-700">API 키 설정</span>
            {geminiKey ? (
              <span className="text-xs bg-green-main text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                <FiCheck className="text-[10px]" /> 설정 완료
              </span>
            ) : (
              <span className="text-xs bg-orange-point text-white px-2 py-0.5 rounded-full">
                필수
              </span>
            )}
          </div>
          {apiOpen ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
        </button>

        {apiOpen && (
          <div className="px-4 py-4 space-y-4 bg-white">
            <p className="text-xs text-gray-400">
              Google AI Studio에서 발급한 Gemini API 키 하나로 나레이션 생성과 음성 생성을 모두 사용할 수 있습니다.
              키는 브라우저에만 저장됩니다.
            </p>

            {/* Gemini API Key */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                Gemini API 키
                <span className="font-normal text-gray-400 ml-1">(나레이션 + 음성 생성)</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  className={`w-full px-3 py-2.5 rounded-lg border-2 text-sm focus:outline-none transition ${
                    geminiKey
                      ? 'border-green-main/30 bg-green-50/30 focus:border-green-main'
                      : 'border-gray-200 focus:border-orange-point'
                  }`}
                />
                {geminiKey && (
                  <FiCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-green-main" />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Google AI Studio (aistudio.google.com)에서 무료로 발급받을 수 있습니다
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Farm Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          농장 이름
        </label>
        <input
          type="text"
          value={farmName}
          onChange={(e) => setFarmName(e.target.value)}
          placeholder="예: 행복한 농장"
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-main focus:outline-none transition text-lg"
        />
      </div>

      {/* Next */}
      <button
        onClick={() => setStep(1)}
        disabled={!canProceed}
        className="w-full py-4 bg-orange-point text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-orange-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-point/20"
      >
        다음 단계 <FiArrowRight />
      </button>
    </div>
  )
}
