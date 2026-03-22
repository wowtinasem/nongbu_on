import { useState, useRef, useEffect } from 'react'
import { FiArrowLeft, FiArrowRight, FiVolume2, FiDownload, FiStar, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import useStore from '../store'

const VOICES = [
  // 여성
  { name: 'Sulafat',       ko: '수라팟',         gender: 'F', desc: '따뜻하고 친근함',          recommended: true  },
  { name: 'Aoede',         ko: '아오데',          gender: 'F', desc: '자연스럽고 산뜻함',        recommended: true  },
  { name: 'Kore',          ko: '코레',            gender: 'F', desc: '자신감 있고 단단함',       recommended: false },
  { name: 'Zephyr',        ko: '제피르',          gender: 'F', desc: '밝고 명랑함',              recommended: false },
  { name: 'Leda',          ko: '레다',            gender: 'F', desc: '젊고 생기 있음',           recommended: false },
  { name: 'Autonoe',       ko: '아우토노에',      gender: 'F', desc: '밝고 긍정적',              recommended: false },
  { name: 'Callirrhoe',    ko: '칼리로에',        gender: 'F', desc: '여유롭고 편안함',          recommended: false },
  { name: 'Despina',       ko: '데스피나',        gender: 'F', desc: '부드럽게 흘러가는',        recommended: false },
  { name: 'Erinome',       ko: '에리노메',        gender: 'F', desc: '명확하고 정확함',          recommended: false },
  { name: 'Laomedeia',     ko: '라오메데이아',    gender: 'F', desc: '활발하고 생동감',          recommended: false },
  { name: 'Pulcherrima',   ko: '풀케리마',        gender: 'F', desc: '표현력 풍부하고 적극적',   recommended: false },
  { name: 'Vindemiatrix',  ko: '빈데미아트릭스',  gender: 'F', desc: '부드럽고 친절함',          recommended: false },
  { name: 'Achernar',      ko: '아케르나르',      gender: 'F', desc: '조용하고 온화함',          recommended: false },
  { name: 'Sadachbia',     ko: '사다크비아',      gender: 'F', desc: '활기차고 생동감',          recommended: false },
  { name: 'Umbriel',       ko: '엄브리엘',        gender: 'F', desc: '신비롭고 독특함',          recommended: false },
  // 남성
  { name: 'Puck',          ko: '퍽',              gender: 'M', desc: '활기차고 에너지 넘침',     recommended: true  },
  { name: 'Charon',        ko: '카론',            gender: 'M', desc: '명확하고 정보 전달',       recommended: false },
  { name: 'Fenrir',        ko: '펜리르',          gender: 'M', desc: '흥분되고 역동적',          recommended: false },
  { name: 'Orus',          ko: '오루스',          gender: 'M', desc: '단호하고 결단력',          recommended: false },
  { name: 'Achird',        ko: '아키르드',        gender: 'M', desc: '친근하고 다가가기 쉬움',   recommended: false },
  { name: 'Algenib',       ko: '알게니브',        gender: 'M', desc: '묵직한 질감',              recommended: false },
  { name: 'Algieba',       ko: '알기에바',        gender: 'M', desc: '부드럽고 쾌적함',          recommended: false },
  { name: 'Alnilam',       ko: '알닐람',          gender: 'M', desc: '단단하고 강한 느낌',       recommended: false },
  { name: 'Enceladus',     ko: '엔셀라두스',      gender: 'M', desc: '숨결 있고 부드러움',       recommended: false },
  { name: 'Gacrux',        ko: '가크룩스',        gender: 'M', desc: '성숙하고 경험 있음',       recommended: false },
  { name: 'Iapetus',       ko: '이아페투스',      gender: 'M', desc: '명확하고 또렷함',          recommended: false },
  { name: 'Rasalgethi',    ko: '라살게티',        gender: 'M', desc: '전문적이고 정보 전달',     recommended: false },
  { name: 'Sadaltager',    ko: '사달타거',        gender: 'M', desc: '자신감 있고 노련함',       recommended: false },
  { name: 'Schedar',       ko: '쉐다르',          gender: 'M', desc: '안정적이고 믿음직함',      recommended: false },
  { name: 'Zubenelgenubi', ko: '주베넬게누비',    gender: 'M', desc: '차분하고 균형잡힘',        recommended: false },
]

const RECOMMENDED = VOICES.filter((v) => v.recommended)
const NON_RECOMMENDED = VOICES.filter((v) => !v.recommended)

const TONE_PRESETS = [
  { label: '기본', prompt: '' },
  { label: '밝고 활기차게', prompt: 'Speak in a bright and energetic tone.' },
  { label: '차분하고 진지하게', prompt: 'Speak in a calm and serious tone.' },
  { label: '따뜻하고 친근하게', prompt: 'Speak in a warm and friendly tone.' },
]

const SPECIAL_STYLES = [
  { emoji: '\uD83D\uDC74', label: '어르신처럼', prompt: 'Speak like an elderly Korean grandfather, slow and wise' },
  { emoji: '\uD83D\uDC67', label: '어린아이처럼', prompt: 'Speak like a young child, bright and innocent' },
  { emoji: '\uD83D\uDCFA', label: '뉴스 앵커처럼', prompt: 'Speak like a professional Korean news anchor, clear and authoritative' },
  { emoji: '\uD83C\uDFA4', label: '다큐멘터리처럼', prompt: 'Speak like a Korean documentary narrator, calm and storytelling' },
  { emoji: '\uD83D\uDE04', label: '유쾌하고 재미있게', prompt: 'Speak in a fun and cheerful tone, energetic' },
  { emoji: '\uD83C\uDF3E', label: '농부처럼 자연스럽게', prompt: 'Speak naturally like a Korean farmer talking about their crops' },
]

export default function AudioGenerate() {
  const narration = useStore((s) => s.narration)
  const audioUrl = useStore((s) => s.audioUrl)
  const voiceName = useStore((s) => s.voiceName)
  const isGenerating = useStore((s) => s.isGeneratingAudio)
  const generateAudio = useStore((s) => s.generateAudio)
  const setVoiceName = useStore((s) => s.setVoiceName)
  const setStep = useStore((s) => s.setStep)

  const [showAll, setShowAll] = useState(false)
  const [genderFilter, setGenderFilter] = useState('all')
  const [stylePrompt, setStylePrompt] = useState('')
  const [activePreset, setActivePreset] = useState(0) // index into TONE_PRESETS, 0=기본
  const audioRef = useRef(null)

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }, [audioUrl])

  const downloadAudio = (ext = 'wav') => {
    if (!audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `narration.${ext}`
    a.click()
  }

  const handlePreset = (idx) => {
    setActivePreset(idx)
    setStylePrompt(TONE_PRESETS[idx].prompt)
  }

  const handleSpecial = (prompt) => {
    setActivePreset(-1)
    setStylePrompt(prompt)
  }

  const handleGenerate = () => {
    generateAudio(stylePrompt)
  }

  const filteredOthers = NON_RECOMMENDED.filter(
    (v) => genderFilter === 'all' || v.gender === genderFilter
  )

  const selectedVoice = VOICES.find((v) => v.name === voiceName)

  const VoiceCard = ({ voice }) => {
    const isSelected = voiceName === voice.name
    const isFemale = voice.gender === 'F'

    return (
      <button
        onClick={() => setVoiceName(voice.name)}
        className={`relative text-left p-3 rounded-xl border-2 transition-all ${
          isSelected
            ? 'border-green-main bg-green-50 shadow-sm'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {/* Gender badge */}
        <span
          className="absolute -top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={isFemale
            ? { backgroundColor: '#FFE4F0', color: '#C2185B' }
            : { backgroundColor: '#E3F2FD', color: '#1565C0' }
          }
        >
          {isFemale ? '여성' : '남성'}
        </span>

        {/* Recommended badge */}
        {voice.recommended && (
          <span className="absolute -top-2 right-2 text-[10px] bg-green-main text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <FiStar className="text-[8px]" /> 추천
          </span>
        )}

        <p className={`text-sm font-semibold mt-1 ${isSelected ? 'text-green-main' : 'text-gray-700'}`}>
          {voice.name}
        </p>
        <p className="text-[11px] text-gray-400">{voice.ko}</p>
        <p className={`text-xs mt-0.5 ${isSelected ? 'text-green-main/70' : 'text-gray-400'}`}>
          {voice.desc}
        </p>
      </button>
    )
  }

  const FILTER_TABS = [
    { key: 'all', label: '전체' },
    { key: 'F', label: '여성' },
    { key: 'M', label: '남성' },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-green-main">AI 음성 생성</h2>
        <p className="text-gray-500 mt-1">나레이션을 자연스러운 음성으로 변환합니다</p>
      </div>

      {/* Narration Preview */}
      <div className="bg-green-50 rounded-xl p-4">
        <p className="text-sm font-semibold text-green-main mb-2">나레이션 내용</p>
        <p className="text-gray-700 text-sm leading-relaxed line-clamp-4">{narration}</p>
      </div>

      {/* Voice Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          AI 성우 선택
          <span className="font-normal text-gray-400 ml-1">
            (현재: {voiceName}{selectedVoice ? ` / ${selectedVoice.ko}` : ''})
          </span>
        </label>

        {/* Recommended */}
        <p className="text-xs text-orange-point font-semibold mb-2">농업 홍보 추천 성우</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {RECOMMENDED.map((v) => (
            <VoiceCard key={v.name} voice={v} />
          ))}
        </div>

        {/* All voices toggle */}
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 py-2 transition"
        >
          {showAll ? (
            <>전체 목록 접기 <FiChevronUp /></>
          ) : (
            <>전체 {VOICES.length}개 성우 보기 <FiChevronDown /></>
          )}
        </button>

        {showAll && (
          <div className="mt-2 space-y-3">
            {/* Gender Filter Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setGenderFilter(tab.key)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                    genderFilter === tab.key
                      ? 'bg-white text-green-main shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredOthers.map((v) => (
                <VoiceCard key={v.name} voice={v} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Voice Style / Tone */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">
          목소리 스타일
        </label>

        {/* Basic presets */}
        <div className="flex flex-wrap gap-2">
          {TONE_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => handlePreset(i)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                activePreset === i
                  ? 'border-green-main bg-green-50 text-green-main font-semibold'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Special styles */}
        <div className="grid grid-cols-3 gap-2">
          {SPECIAL_STYLES.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSpecial(s.prompt)}
              className={`text-xs p-2 rounded-lg border transition text-center ${
                stylePrompt === s.prompt && activePreset === -1
                  ? 'border-green-main bg-green-50 text-green-main font-semibold'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-base">{s.emoji}</span>
              <br />
              {s.label}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <input
          type="text"
          value={stylePrompt}
          onChange={(e) => { setStylePrompt(e.target.value); setActivePreset(-1) }}
          placeholder="예) 차분하고 신뢰감 있는 목소리로 말해주세요"
          className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-200 focus:border-green-main focus:outline-none transition text-sm"
        />
        <p className="text-[11px] text-gray-400">프리셋을 선택하거나 직접 입력할 수 있습니다. 비워두면 기본 톤으로 생성됩니다.</p>
      </div>

      {/* Generate Button */}
      {!audioUrl && (
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-5 bg-green-main text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-green-dark disabled:opacity-60 transition-all shadow-lg shadow-green-main/20"
        >
          {isGenerating ? (
            <>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {voiceName} 성우로 음성 생성 중...
            </>
          ) : (
            <>
              <FiVolume2 className="text-xl" />
              {voiceName} 성우로 음성 생성하기
            </>
          )}
        </button>
      )}

      {/* Audio Player */}
      {audioUrl && (
        <div className="bg-white border-2 border-green-main/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-green-main font-semibold">
            <FiVolume2 />
            <span>{voiceName} 성우 음성이 생성되었습니다!</span>
          </div>
          <audio ref={audioRef} controls src={audioUrl} className="w-full" />
          <div className="flex gap-2">
            <button
              onClick={() => downloadAudio('wav')}
              className="flex-1 py-3 border-2 border-orange-point text-orange-point rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-orange-50 transition"
            >
              <FiDownload /> WAV 다운로드
            </button>
            <button
              onClick={() => downloadAudio('mp3')}
              className="flex-1 py-3 border-2 border-green-main text-green-main rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-green-50 transition"
            >
              <FiDownload /> MP3 다운로드
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => setStep(2)}
          className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition"
        >
          <FiArrowLeft /> 이전
        </button>
        <button
          onClick={() => setStep(4)}
          disabled={!audioUrl}
          className="flex-[2] py-3 bg-orange-point text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-point/20"
        >
          영상 제작 <FiArrowRight />
        </button>
      </div>
    </div>
  )
}
