import { useState, useEffect, useRef, useCallback } from 'react'
import { FiArrowLeft, FiArrowRight, FiRefreshCw, FiAlertCircle } from 'react-icons/fi'
import useStore from '../store'

export default function Narration() {
  const narration = useStore((s) => s.narration)
  const isGenerating = useStore((s) => s.isGeneratingNarration)
  const setNarration = useStore((s) => s.setNarration)
  const generateNarration = useStore((s) => s.generateNarration)
  const setStep = useStore((s) => s.setStep)
  const farmName = useStore((s) => s.farmName)
  const geminiKey = useStore((s) => s.geminiKey)
  const photos = useStore((s) => s.photos)

  const [userPrompt, setUserPrompt] = useState('')
  const [selectedMode, setSelectedMode] = useState(null) // 'direct' | 'refine' | 'photo'
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState([])
  const [selectedWeather, setSelectedWeather] = useState([])
  const [selectedSeasons, setSelectedSeasons] = useState([])
  const recognitionRef = useRef(null)

  const MONTHS = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, label: `${i + 1}월` }))
  const WEATHER = [
    { id: 'sunny', label: '맑음', icon: '☀️' },
    { id: 'cloudy', label: '흐림', icon: '☁️' },
    { id: 'rain', label: '비', icon: '🌧️' },
    { id: 'snow', label: '눈', icon: '❄️' },
    { id: 'wind', label: '바람', icon: '💨' },
    { id: 'fog', label: '안개', icon: '🌫️' },
    { id: 'hot', label: '무더위', icon: '🥵' },
    { id: 'cold', label: '한파', icon: '🥶' },
  ]
  const SEASONS = [
    { id: 'spring', label: '봄', icon: '🌸' },
    { id: 'summer', label: '여름', icon: '☀️' },
    { id: 'autumn', label: '가을', icon: '🍂' },
    { id: 'winter', label: '겨울', icon: '⛄' },
  ]

  const toggleMulti = (arr, setArr, val) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val])
  }

  const buildContextString = () => {
    const parts = []
    if (selectedSeasons.length > 0) {
      parts.push('계절: ' + selectedSeasons.map((id) => SEASONS.find((s) => s.id === id)?.label).filter(Boolean).join(', '))
    }
    if (selectedMonths.length > 0) {
      parts.push('월: ' + selectedMonths.map((m) => `${m}월`).join(', '))
    }
    if (selectedWeather.length > 0) {
      parts.push('날씨: ' + selectedWeather.map((id) => WEATHER.find((w) => w.id === id)?.label).filter(Boolean).join(', '))
    }
    return parts.join(' / ')
  }

  useEffect(() => {
    const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    setSpeechSupported(supported)
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true

    // Preserve text typed before mic activation
    const textBeforeMic = userPrompt.trimEnd()

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += t
        } else {
          interimText += t
        }
      }
      const spokenText = (finalText + interimText).trim()
      const sep = textBeforeMic && spokenText ? ' ' : ''
      setUserPrompt(textBeforeMic + sep + spokenText)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [isListening, userPrompt])

  const handleDirect = () => {
    setNarration(userPrompt.trim())
    setSelectedMode(null)
  }

  const handleRefine = () => {
    generateNarration(userPrompt, 'refine', buildContextString())
  }

  const handlePhoto = () => {
    generateNarration('', 'photo', buildContextString())
  }

  const noApiKey = !geminiKey
  const hasInput = userPrompt.trim().length > 0

  const MODES = [
    {
      id: 'direct',
      icon: '\u270F\uFE0F',
      title: '직접 입력',
      desc: '내가 쓴 문장 그대로 사용',
      needsInput: true,
      needsApi: false,
    },
    {
      id: 'refine',
      icon: '\u2728',
      title: 'AI 다듬기',
      desc: '키워드나 문장을 AI가 나레이션으로',
      needsInput: true,
      needsApi: true,
    },
    {
      id: 'photo',
      icon: '\uD83D\uDCF8',
      title: '사진 자동분석',
      desc: '사진 보고 AI가 알아서 생성',
      needsInput: false,
      needsApi: true,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-green-main">AI 나레이션</h2>
        <p className="text-gray-500 mt-1">
          {farmName}의 이야기를 만들어 보세요
        </p>
      </div>

      {/* API Key Warning */}
      {noApiKey && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          <FiAlertCircle className="text-lg shrink-0" />
          <span>농장 정보 화면에서 Gemini API 키를 먼저 입력해주세요</span>
        </div>
      )}

      {/* Before narration is generated */}
      {!narration && !isGenerating && (
        <>
          {/* Text Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">
              키워드나 문장을 입력하세요
            </label>
            <p className="text-xs text-gray-400">
              키워드만 넣어도 AI가 나레이션을 만들어 드려요
            </p>
            <div className="flex items-center gap-2">
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                rows={3}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-main focus:outline-none transition resize-none text-base leading-relaxed"
                placeholder="예) 사과 수확, 날씨 맑음, 탐스러운 사과&#10;또는: 오늘 사과 수확을 시작했어요."
              />
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                      : 'bg-green-main text-white hover:bg-green-600 shadow-lg shadow-green-main/20'
                  }`}
                  title={isListening ? '녹음 중지' : '음성 입력'}
                >
                  🎤
                </button>
              )}
            </div>
            {isListening && (
              <p className="text-xs text-red-500 font-medium animate-pulse">
                음성을 인식하고 있습니다... 말씀해 주세요
              </p>
            )}
          </div>

          {/* Season / Month / Weather Selection */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-600">계절 · 날씨 설정 (선택)</p>
            <p className="text-xs text-gray-400">AI가 계절감과 날씨를 반영한 나레이션을 만들어줍니다</p>

            {/* Seasons */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">계절</p>
              <div className="flex gap-2">
                {SEASONS.map((s) => {
                  const sel = selectedSeasons.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleMulti(selectedSeasons, setSelectedSeasons, s.id)}
                      className={`flex-1 py-2 rounded-xl border-2 text-center transition-all ${
                        sel
                          ? 'border-green-main bg-green-50 shadow-sm'
                          : 'border-gray-200 hover:border-green-main/50'
                      }`}
                    >
                      <span className="text-lg">{s.icon}</span>
                      <p className={`text-xs font-semibold ${sel ? 'text-green-main' : 'text-gray-600'}`}>{s.label}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Months */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">월</p>
              <div className="grid grid-cols-6 gap-1.5">
                {MONTHS.map((m) => {
                  const sel = selectedMonths.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleMulti(selectedMonths, setSelectedMonths, m.id)}
                      className={`py-1.5 rounded-lg border-2 text-xs font-semibold transition-all ${
                        sel
                          ? 'border-green-main bg-green-50 text-green-main shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-green-main/50'
                      }`}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Weather */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">날씨</p>
              <div className="grid grid-cols-4 gap-1.5">
                {WEATHER.map((w) => {
                  const sel = selectedWeather.includes(w.id)
                  return (
                    <button
                      key={w.id}
                      onClick={() => toggleMulti(selectedWeather, setSelectedWeather, w.id)}
                      className={`py-2 rounded-xl border-2 text-center transition-all ${
                        sel
                          ? 'border-green-main bg-green-50 shadow-sm'
                          : 'border-gray-200 hover:border-green-main/50'
                      }`}
                    >
                      <span className="text-sm">{w.icon}</span>
                      <p className={`text-[11px] font-semibold ${sel ? 'text-green-main' : 'text-gray-600'}`}>{w.label}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected summary */}
            {(selectedSeasons.length > 0 || selectedMonths.length > 0 || selectedWeather.length > 0) && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-xs text-green-700 flex-1">{buildContextString()}</span>
                <button
                  onClick={() => { setSelectedSeasons([]); setSelectedMonths([]); setSelectedWeather([]) }}
                  className="text-xs text-gray-400 hover:text-red-500 transition"
                >
                  초기화
                </button>
              </div>
            )}
          </div>

          {/* Mode Selection Cards */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-600">나레이션 생성 방법 선택</p>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((mode) => {
                const disabled =
                  (mode.needsInput && !hasInput) ||
                  (mode.needsApi && noApiKey) ||
                  (mode.id === 'photo' && photos.length === 0)
                const selected = selectedMode === mode.id

                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(selected ? null : mode.id)}
                    disabled={disabled}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      selected
                        ? 'border-green-main bg-green-50 shadow-sm'
                        : disabled
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-green-main/50 hover:bg-green-50/30'
                    }`}
                  >
                    <div className="text-2xl mb-1">{mode.icon}</div>
                    <p className={`text-xs font-bold ${selected ? 'text-green-main' : 'text-gray-700'}`}>
                      {mode.title}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{mode.desc}</p>
                  </button>
                )
              })}
            </div>
            {/* Hints */}
            {!hasInput && (
              <p className="text-[11px] text-gray-400">
                * "직접 입력"과 "AI 다듬기"는 위 입력창에 문장을 먼저 작성해주세요
              </p>
            )}
            {photos.length === 0 && (
              <p className="text-[11px] text-gray-400">
                * "사진 자동분석"은 이전 단계에서 사진을 먼저 업로드해주세요
              </p>
            )}
          </div>

          {/* Action Button */}
          {selectedMode && (
            <button
              onClick={
                selectedMode === 'direct'
                  ? handleDirect
                  : selectedMode === 'refine'
                  ? handleRefine
                  : handlePhoto
              }
              className="w-full py-5 bg-green-main text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-green-600 transition-all shadow-lg shadow-green-main/20"
            >
              {selectedMode === 'direct' && <>이 문장으로 음성 생성 <FiArrowRight /></>}
              {selectedMode === 'refine' && <><span className="text-xl">✨</span> AI 나레이션 생성하기</>}
              {selectedMode === 'photo' && <><span className="text-xl">📸</span> 사진 보고 AI가 자동 생성</>}
            </button>
          )}
        </>
      )}

      {/* Generating Spinner */}
      {isGenerating && (
        <div className="w-full py-10 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-main border-t-transparent rounded-full animate-spin" />
          <span className="text-green-main font-semibold">
            AI가 나레이션을 작성 중입니다...
          </span>
        </div>
      )}

      {/* Narration Editor */}
      {narration && !isGenerating && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">나레이션 내용</span>
            <button
              onClick={() => {
                setNarration('')
                setSelectedMode(null)
              }}
              className="text-sm text-orange-point hover:text-orange-dark flex items-center gap-1 transition"
            >
              <FiRefreshCw />
              처음부터 다시
            </button>
          </div>
          <textarea
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-main focus:outline-none transition resize-none text-base leading-relaxed"
            placeholder="나레이션을 입력하거나 AI가 생성한 내용을 수정하세요"
          />
          <p className="text-xs text-gray-400 text-right">
            {narration.length}자 | 자유롭게 수정 가능합니다
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => setStep(1)}
          className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition"
        >
          <FiArrowLeft /> 이전
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={!narration || !narration.trim()}
          className="flex-[2] py-3 bg-orange-point text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-point/20"
        >
          음성 생성 <FiArrowRight />
        </button>
      </div>
    </div>
  )
}
