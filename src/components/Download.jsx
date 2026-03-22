import { useState, useRef, useEffect } from 'react'
import { FiDownload, FiArrowLeft, FiFilm, FiRefreshCw, FiUpload, FiPlay, FiSquare, FiX, FiMusic, FiType } from 'react-icons/fi'
import useStore from '../store'

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

  const [bgmFile, setBgmFile] = useState(null) // uploaded File object
  const [bgmUrl, setBgmUrl] = useState(null)   // object URL for preview/playback
  const [bgmVolume, setBgmVolume] = useState(0.2)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [subtitleMode, setSubtitleMode] = useState('auto') // 'auto' | 'edit' | 'none'
  const [editedSubtitle, setEditedSubtitle] = useState('')
  const [photoEffect, setPhotoEffect] = useState('kenburns') // 'none' | 'kenburns' | 'zoomin' | 'zoomout' | 'slide'
  const [subtitlePos, setSubtitlePos] = useState('upper') // 'upper' | 'lower'
  const [subtitleColor, setSubtitleColor] = useState('default') // 'default' | 'yellow' | 'green' | 'blue' | 'white'
  const previewAudioRef = useRef(null)
  const fileInputRef = useRef(null)

  // Cleanup on unmount
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
    // Revoke previous URL
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
    if (isPreviewing) {
      stopPreview()
      return
    }
    if (!bgmUrl) return
    const audio = new Audio(bgmUrl)
    audio.volume = 0.5
    audio.play().catch(() => {})
    previewAudioRef.current = audio
    setIsPreviewing(true)
    audio.onended = () => {
      previewAudioRef.current = null
      setIsPreviewing(false)
    }
  }

  const handleGenerate = () => {
    stopPreview()
    const subtitleText = subtitleMode === 'auto' ? narration
      : subtitleMode === 'edit' ? editedSubtitle
      : null
    generateVideo(bgmUrl, bgmVolume, subtitleText, photoEffect, subtitlePos, subtitleColor)
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
              return parts.join(' + ') + ' + AI 음성'
            })()}
          </p>
        </div>
      </div>

      {/* BGM Upload */}
      {!videoUrl && (
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
                    isPreviewing
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-100'
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

              {/* Volume slider */}
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
                <p className="text-[11px] text-gray-400">나레이션보다 낮게 유지 권장 (기본 20%)</p>
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-400">
            음악 없이 나레이션만으로도 영상 생성이 가능합니다
          </p>
        </div>
      )}

      {/* Photo Effect */}
      {!videoUrl && (
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
      )}

      {/* Subtitle Selection */}
      {!videoUrl && (
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
                  if (opt.key === 'edit' && !editedSubtitle && narration) {
                    setEditedSubtitle(narration)
                  }
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
              placeholder="자막을 수정하세요.&#10;문장 단위로 줄바꿈하면 순서대로 표시됩니다."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-main resize-none"
              rows={6}
            />
          )}

          {/* Subtitle Position & Color (only when subtitles are on) */}
          {subtitleMode !== 'none' && (
            <div className="space-y-3 pt-2">
              {/* Position */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5">자막 위치</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'upper', label: '위쪽 (권장)', desc: '숏츠 프로필 안겹침' },
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

              {/* Color */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5">자막 색상</p>
                <div className="flex gap-2">
                  {[
                    { key: 'default', label: '기본', bg: 'bg-black/60', text: 'text-white', ring: 'ring-gray-400' },
                    { key: 'yellow', label: '노랑', bg: 'bg-yellow-400', text: 'text-black', ring: 'ring-yellow-400' },
                    { key: 'green', label: '초록', bg: 'bg-green-500', text: 'text-white', ring: 'ring-green-500' },
                    { key: 'blue', label: '파랑', bg: 'bg-blue-500', text: 'text-white', ring: 'ring-blue-500' },
                    { key: 'white', label: '흰색', bg: 'bg-white border border-gray-300', text: 'text-black', ring: 'ring-white' },
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
          )}
        </div>
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

          {/* YouTube Shorts guide */}
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiUpload className="text-red-500" />
              <span className="text-sm font-bold text-red-600">YouTube Shorts 업로드</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              다운로드한 영상을 YouTube Shorts에 바로 업로드하세요!
              세로 비율(9:16)로 제작되어 Shorts에 최적화되어 있습니다.
            </p>
          </div>
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
