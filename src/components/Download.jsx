import { useState, useRef, useEffect } from 'react'
import { FiDownload, FiArrowLeft, FiFilm, FiRefreshCw, FiUpload, FiPlay, FiSquare, FiX, FiMusic, FiType, FiVolume2 } from 'react-icons/fi'
import useStore from '../store'

const MODE_OPTIONS = [
  { key: 'A', icon: '🎤', label: 'AI 음성', desc: '나레이션\n(기존)' },
  { key: 'B', icon: '🌿', label: '자연음', desc: '+자막' },
  { key: 'C', icon: '🎭', label: '자연음+음악', desc: '+자막' },
]

export default function Download() {
  const videoUrl = useStore((s) => s.videoUrl)
  const isGenerating = useStore((s) => s.isGeneratingVideo)
  const generateVideo = useStore((s) => s.generateVideo)
  const photos = useStore((s) => s.photos)
  const narration = useStore((s) => s.narration)
  const videoFormat = useStore((s) => s.videoFormat)
  const farmName = useStore((s) => s.farmProfile?.farmName || s.farmName)
  const setStep = useStore((s) => s.setStep)
  const reset = useStore((s) => s.reset)

  // Common state
  const [audioMode, setAudioMode] = useState('A')
  const [bgmFile, setBgmFile] = useState(null)
  const [bgmUrl, setBgmUrl] = useState(null)
  const [bgmVolume, setBgmVolume] = useState(0.2)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [photoEffect, setPhotoEffect] = useState('kenburns')
  const [subtitlePos, setSubtitlePos] = useState('upper')
  const [subtitleColor, setSubtitleColor] = useState('default')
  const previewAudioRef = useRef(null)
  const fileInputRef = useRef(null)

  // Mode A state
  const [subtitleMode, setSubtitleMode] = useState('auto')
  const [editedSubtitle, setEditedSubtitle] = useState('')

  // Mode B/C state
  const [bcSubMode, setBcSubMode] = useState('auto')
  const [bcCustomSubtitle, setBcCustomSubtitle] = useState('')
  const [titleSubtitle, setTitleSubtitle] = useState('')
  const [originalVolume, setOriginalVolume] = useState(1.0)

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause()
        previewAudioRef.current = null
      }
      if (bgmUrl) URL.revokeObjectURL(bgmUrl)
    }
  }, [])

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (bgmUrl) URL.revokeObjectURL(bgmUrl)
    stopPreview()
    const url = URL.createObjectURL(file)
    setBgmFile(file)
    setBgmUrl(url)
  }

  const removeBgm = () => {
    stopPreview()
    if (bgmUrl) URL.revokeObjectURL(bgmUrl)
    setBgmFile(null)
    setBgmUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current = null
    }
    setIsPreviewing(false)
  }

  const togglePreview = () => {
    if (isPreviewing) { stopPreview(); return }
    if (!bgmUrl) return
    const audio = new Audio(bgmUrl)
    audio.volume = 0.5
    audio.play().catch(() => {})
    previewAudioRef.current = audio
    setIsPreviewing(true)
    audio.onended = () => { previewAudioRef.current = null; setIsPreviewing(false) }
  }

  const handleGenerate = () => {
    stopPreview()
    let subtitleText
    if (audioMode === 'A') {
      subtitleText = subtitleMode === 'auto' ? narration
        : subtitleMode === 'edit' ? editedSubtitle
        : null
    } else {
      subtitleText = bcSubMode === 'auto' ? narration
        : bcSubMode === 'custom' ? bcCustomSubtitle
        : null
    }
    const title = audioMode !== 'A' ? titleSubtitle || null : null
    generateVideo(bgmUrl, bgmVolume, subtitleText, photoEffect, subtitlePos, subtitleColor, audioMode, originalVolume, title)
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const ext = videoFormat || 'mp4'
  const safeName = (farmName || '농부ON').replace(/[\\/:*?"<>|]/g, '_')
  const fileName = `${safeName}_${today}.${ext}`

  const downloadVideo = () => {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = fileName
    a.click()
  }

  // Shared subtitle position & color UI
  const subtitlePosColorUI = (
    <div className="space-y-3 pt-2">
      <div>
        <p className="text-xs text-gray-500 mb-1.5">자막 위치</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'upper', label: '위쪽 (권장)', desc: '숏츠 프로필 안겨침' },
            { key: 'lower', label: '아래쪽', desc: '전통적 자막 위치' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSubtitlePos(opt.key)}
              className={`p-2.5 rounded-xl border-2 transition-all text-center ${
                subtitlePos === opt.key
                  ? 'border-green-main bg-green-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className={`text-sm font-semibold ${subtitlePos === opt.key ? 'text-green-main' : 'text-gray-700'}`}>
                {opt.label}
              </p>
              <p className="text-[10px] text-gray-400">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1.5">자막 색상</p>
        <div className="flex gap-2">
          {[
            { key: 'default', label: '기본', bg: 'bg-black/60', text: 'text-white' },
            { key: 'yellow', label: '노랑', bg: 'bg-yellow-400', text: 'text-black' },
            { key: 'green', label: '초록', bg: 'bg-green-500', text: 'text-white' },
            { key: 'blue', label: '파랑', bg: 'bg-blue-500', text: 'text-white' },
            { key: 'white', label: '흰색', bg: 'bg-white border border-gray-300', text: 'text-black' },
          ].map((opt) => {
            const sel = subtitleColor === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => setSubtitleColor(opt.key)}
                className={`flex-1 py-2 rounded-xl border-2 transition-all text-center ${
                  sel ? 'border-green-main shadow-sm' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`mx-auto w-8 h-5 rounded ${opt.bg} mb-1 flex items-center justify-center`}>
                  <span className={`text-[9px] font-bold ${opt.text}`}>가</span>
                </div>
                <p className={`text-[10px] font-semibold ${sel ? 'text-green-main' : 'text-gray-600'}`}>{opt.label}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  // Shared BGM UI
  const bgmUI = (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">
        🎵 배경음악
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      {!bgmFile ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 hover:border-green-main rounded-xl p-6 flex flex-col items-center gap-2 transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-green-50 group-hover:bg-green-100 flex items-center justify-center transition-colors">
            <FiMusic className="text-xl text-green-main" />
          </div>
          <p className="text-sm font-semibold text-gray-600 group-hover:text-green-main transition-colors">
            음악 파일 업로드
          </p>
          <p className="text-xs text-gray-400">MP3, WAV, OGG 등 지원</p>
        </button>
      ) : (
        <div className="border-2 border-green-main bg-green-50 rounded-xl p-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <FiMusic className="text-green-main" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-700 truncate">{bgmFile.name}</p>
              <p className="text-xs text-gray-400">{(bgmFile.size / (1024 * 1024)).toFixed(1)} MB</p>
            </div>
            <button
              type="button"
              onClick={togglePreview}
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition ${
                isPreviewing ? 'bg-red-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-100'
              }`}
              title={isPreviewing ? '중지' : '미리듣기'}
            >
              {isPreviewing ? <FiSquare className="text-xs" /> : <FiPlay className="text-xs" />}
            </button>
            <button
              type="button"
              onClick={removeBgm}
              className="shrink-0 w-8 h-8 rounded-full bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition"
              title="삭제"
            >
              <FiX className="text-sm" />
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">배경음악 음량</span>
              <span className="text-xs font-semibold text-green-main">{Math.round(bgmVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={Math.round(bgmVolume * 100)}
              onChange={(e) => setBgmVolume(Number(e.target.value) / 100)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-main"
            />
            <p className="text-[11px] text-gray-400">{audioMode === 'A' ? '나레이션보다 낮게 유지 권장 (기본 20%)' : '원본 소리와 균형을 맞춰주세요 (기본 20%)'}</p>
          </div>
        </div>
      )}
      {audioMode === 'A' && (
        <p className="text-[11px] text-gray-400">
          음악 없이 나레이션만으로도 영상 생성이 가능합니다
        </p>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-green-main">영상 제작</h2>
        <p className="text-gray-500 mt-1">사진과 음성을 합성하여 숏폼 영상을 만듭니다</p>
      </div>

      {/* Preview Info */}
      <div className="bg-green-50 rounded-xl p-4 flex items-center gap-4">
        <div className="grid grid-cols-3 gap-1 w-20 shrink-0">
          {photos.slice(0, 3).map((p) =>
            p.type === 'video' ? (
              <video key={p.id} src={p.preview} muted className="w-full aspect-square object-cover rounded" />
            ) : (
              <img key={p.id} src={p.preview} alt="" className="w-full aspect-square object-cover rounded" />
            )
          )}
        </div>
        <div className="text-sm">
          <p className="text-green-main font-semibold">준비 완료</p>
          <p className="text-gray-500">
            {(() => {
              const vc = photos.filter((p) => p.type === 'video').length
              const ic = photos.filter((p) => p.type !== 'video').length
              const parts = []
              if (ic > 0) parts.push(`사진 ${ic}장`)
              if (vc > 0) parts.push(`영상 ${vc}개`)
              return parts.join(' + ') + (audioMode === 'A' ? ' + AI 음성' : ' + 자연음')
            })()}
          </p>
        </div>
      </div>

      {/* Audio Mode Selection */}
      {!videoUrl && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            🎬 영상 출력 방식 선택
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setAudioMode(opt.key)}
                className={`p-3 rounded-xl border-2 transition-all text-center ${
                  audioMode === opt.key
                    ? 'border-green-main bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-xl mb-1">{opt.icon}</p>
                <p className={`text-sm font-semibold ${audioMode === opt.key ? 'text-green-main' : 'text-gray-700'}`}>
                  {opt.label}
                </p>
                <p className="text-[10px] text-gray-400 whitespace-pre-line">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== Mode A Options ===== */}
      {!videoUrl && audioMode === 'A' && (
        <>
          {/* BGM */}
          {bgmUI}

          {/* Photo Effect */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              🎞 사진 효과
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'kenburns', label: 'Ken Burns', desc: '줌+패닝' },
                { key: 'zoomin', label: '줌 인', desc: '점점 확대' },
                { key: 'zoomout', label: '줌 아웃', desc: '점점 축소' },
                { key: 'slide', label: '슬라이드', desc: '좌→우 이동' },
                { key: 'fade', label: '페이드', desc: '밝기 전환' },
                { key: 'none', label: '효과 없음', desc: '정지 화면' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPhotoEffect(opt.key)}
                  className={`p-2.5 rounded-xl border-2 transition-all text-center ${
                    photoEffect === opt.key
                      ? 'border-green-main bg-green-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-semibold ${photoEffect === opt.key ? 'text-green-main' : 'text-gray-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-gray-400">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Subtitle - Mode A */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              <FiType className="inline mr-1.5 -mt-0.5" />
              자막 설정
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'auto', label: '자동 자막', desc: '대본 기반' },
                { key: 'edit', label: '자막 수정', desc: '대본 편집' },
                { key: 'none', label: '자막 없음', desc: '음성만' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setSubtitleMode(opt.key)
                    if (opt.key === 'edit' && !editedSubtitle && narration) setEditedSubtitle(narration)
                  }}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    subtitleMode === opt.key
                      ? 'border-green-main bg-green-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-semibold ${subtitleMode === opt.key ? 'text-green-main' : 'text-gray-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-gray-400">{opt.desc}</p>
                </button>
              ))}
            </div>

            {subtitleMode === 'auto' && narration && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-[11px] text-gray-400 mb-1">대본 미리보기</p>
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{narration}</p>
              </div>
            )}

            {subtitleMode === 'edit' && (
              <textarea
                value={editedSubtitle}
                onChange={(e) => setEditedSubtitle(e.target.value)}
                placeholder={"자막을 수정하세요.\n문장 단위로 줄바꿈하면 순서대로 표시됩니다."}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-main resize-none"
                rows={6}
              />
            )}

            {subtitleMode !== 'none' && subtitlePosColorUI}
          </div>
        </>
      )}

      {/* ===== Mode B/C Options ===== */}
      {!videoUrl && audioMode !== 'A' && (
        <>
          {/* Subtitle Settings for B/C */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              <FiType className="inline mr-1.5 -mt-0.5" />
              자막 설정
            </label>

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'auto', label: 'AI 자동 자막', desc: '나레이션 텍스트' },
                { key: 'custom', label: '직접 입력', desc: '원하는 자막' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setBcSubMode(opt.key)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    bcSubMode === opt.key
                      ? 'border-green-main bg-green-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-semibold ${bcSubMode === opt.key ? 'text-green-main' : 'text-gray-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-gray-400">{opt.desc}</p>
                </button>
              ))}
            </div>

            {bcSubMode === 'auto' && narration && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-[11px] text-gray-400 mb-1">나레이션 텍스트를 자막으로 표시</p>
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{narration}</p>
              </div>
            )}

            {bcSubMode === 'custom' && (
              <textarea
                value={bcCustomSubtitle}
                onChange={(e) => setBcCustomSubtitle(e.target.value)}
                placeholder={"원하는 자막을 입력하세요\n예) 2024 가을 첫 수확"}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-main resize-none"
                rows={4}
              />
            )}

            {/* Title subtitle (상황 설명) */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-600">상황 설명 자막 (선택사항)</p>
              <input
                type="text"
                value={titleSubtitle}
                onChange={(e) => setTitleSubtitle(e.target.value)}
                placeholder="예) 충청남도 예산군 정성농원"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-main"
              />
              <p className="text-[11px] text-gray-400">영상 상단에 장소·상황 설명이 표시됩니다</p>
            </div>

            {subtitlePosColorUI}
          </div>

          {/* Original Volume */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              <FiVolume2 className="inline mr-1.5 -mt-0.5" />
              원본 소리 음량
            </label>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">영상 원본 소리</span>
                <span className="text-xs font-semibold text-green-main">{Math.round(originalVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(originalVolume * 100)}
                onChange={(e) => setOriginalVolume(Number(e.target.value) / 100)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-main"
              />
              <p className="text-[11px] text-gray-400">직접 촬영한 영상의 원본 소리 음량 (기본 100%)</p>
            </div>
          </div>

          {/* BGM */}
          {bgmUI}

          {/* Photo Effect */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              🎞 사진 효과
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'kenburns', label: 'Ken Burns', desc: '줌+패닝' },
                { key: 'zoomin', label: '줌 인', desc: '점점 확대' },
                { key: 'zoomout', label: '줌 아웃', desc: '점점 축소' },
                { key: 'slide', label: '슬라이드', desc: '좌→우 이동' },
                { key: 'fade', label: '페이드', desc: '밝기 전환' },
                { key: 'none', label: '효과 없음', desc: '정지 화면' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPhotoEffect(opt.key)}
                  className={`p-2.5 rounded-xl border-2 transition-all text-center ${
                    photoEffect === opt.key
                      ? 'border-green-main bg-green-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-semibold ${photoEffect === opt.key ? 'text-green-main' : 'text-gray-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-gray-400">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Copyright notice */}
          <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs">
            ✅ 영상 원본 소리 사용 — 직접 촬영한 영상이므로 저작권 문제 없음
          </div>
        </>
      )}

      {/* Generate Video */}
      {!videoUrl && (
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-5 bg-green-main text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-green-dark disabled:opacity-60 transition-all shadow-lg shadow-green-main/20"
        >
          {isGenerating ? (
            <>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              영상 합성 중... (소리가 재생됩니다)
            </>
          ) : (
            <>
              <FiFilm className="text-xl" />
              영상 생성하기
            </>
          )}
        </button>
      )}

      {/* Video Player & Download */}
      {videoUrl && (
        <div className="space-y-4">
          <div className="bg-black rounded-2xl overflow-hidden">
            <video controls src={videoUrl} className="w-full" />
          </div>

          <button
            onClick={downloadVideo}
            className="w-full py-4 bg-orange-point text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-orange-dark transition-all shadow-lg shadow-orange-point/20"
          >
            <FiDownload /> {ext.toUpperCase()} 다운로드
          </button>

        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => setStep(3)}
          className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition"
        >
          <FiArrowLeft /> 이전
        </button>
        <button
          onClick={reset}
          className="flex-[2] py-3 border-2 border-green-main text-green-main rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-50 transition"
        >
          <FiRefreshCw /> 새 영상 만들기
        </button>
      </div>
    </div>
  )
}
