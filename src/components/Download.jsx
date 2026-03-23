import { useState, useRef, useEffect } from 'react'
import { FiDownload, FiArrowLeft, FiFilm, FiRefreshCw, FiUpload, FiPlay, FiSquare, FiX, FiMusic, FiType, FiVolume2 } from 'react-icons/fi'
import useStore from '../store'

const MODE_OPTIONS = [
  { key: 'A', icon: '\uD83C\uDFA4', label: 'AI \uC74C\uC131', desc: '\uB098\uB808\uC774\uC158\n(\uAE30\uC874)' },
  { key: 'B', icon: '\uD83C\uDF3F', label: '\uC790\uC5F0\uC74C', desc: '+\uC790\uB9C9' },
  { key: 'C', icon: '\uD83C\uDFAD', label: '\uC790\uC5F0\uC74C+\uC74C\uC545', desc: '+\uC790\uB9C9' },
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
  const safeName = (farmName || '\uB18D\uBD80ON').replace(/[\\/:*?"<>|]/g, '_')
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
        <p className="text-xs text-gray-500 mb-1.5">\uC790\uB9C9 \uC704\uCE58</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'upper', label: '\uC704\uCABD (\uAD8C\uC7A5)', desc: '\uC21B\uCE20 \uD504\uB85C\uD544 \uC548\uACA8\uCE68' },
            { key: 'lower', label: '\uC544\uB798\uCABD', desc: '\uC804\uD1B5\uC801 \uC790\uB9C9 \uC704\uCE58' },
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
        <p className="text-xs text-gray-500 mb-1.5">\uC790\uB9C9 \uC0C9\uC0C1</p>
        <div className="flex gap-2">
          {[
            { key: 'default', label: '\uAE30\uBCF8', bg: 'bg-black/60', text: 'text-white' },
            { key: 'yellow', label: '\uB178\uB791', bg: 'bg-yellow-400', text: 'text-black' },
            { key: 'green', label: '\uCD08\uB85D', bg: 'bg-green-500', text: 'text-white' },
            { key: 'blue', label: '\uD30C\uB791', bg: 'bg-blue-500', text: 'text-white' },
            { key: 'white', label: '\uD770\uC0C9', bg: 'bg-white border border-gray-300', text: 'text-black' },
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
                  <span className={`text-[9px] font-bold ${opt.text}`}>\uAC00</span>
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
        \uD83C\uDFB5 \uBC30\uACBD\uC74C\uC545
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
            \uC74C\uC545 \uD30C\uC77C \uC5C5\uB85C\uB4DC
          </p>
          <p className="text-xs text-gray-400">MP3, WAV, OGG \uB4F1 \uC9C0\uC6D0</p>
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
              title={isPreviewing ? '\uC911\uC9C0' : '\uBBF8\uB9AC\uB4E3\uAE30'}
            >
              {isPreviewing ? <FiSquare className="text-xs" /> : <FiPlay className="text-xs" />}
            </button>
            <button
              type="button"
              onClick={removeBgm}
              className="shrink-0 w-8 h-8 rounded-full bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition"
              title="\uC0AD\uC81C"
            >
              <FiX className="text-sm" />
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">\uBC30\uACBD\uC74C\uC545 \uC74C\uB7C9</span>
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
            <p className="text-[11px] text-gray-400">{audioMode === 'A' ? '\uB098\uB808\uC774\uC158\uBCF4\uB2E4 \uB0AE\uAC8C \uC720\uC9C0 \uAD8C\uC7A5 (\uAE30\uBCF8 20%)' : '\uC6D0\uBCF8 \uC18C\uB9AC\uC640 \uADE0\uD615\uC744 \uB9DE\uCDB0\uC8FC\uC138\uC694 (\uAE30\uBCF8 20%)'}</p>
          </div>
        </div>
      )}
      {audioMode === 'A' && (
        <p className="text-[11px] text-gray-400">
          \uC74C\uC545 \uC5C6\uC774 \uB098\uB808\uC774\uC158\uB9CC\uC73C\uB85C\uB3C4 \uC601\uC0C1 \uC0DD\uC131\uC774 \uAC00\uB2A5\uD569\uB2C8\uB2E4
        </p>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-green-main">\uC601\uC0C1 \uC81C\uC791</h2>
        <p className="text-gray-500 mt-1">\uC0AC\uC9C4\uACFC \uC74C\uC131\uC744 \uD569\uC131\uD558\uC5EC \uC21B\uD3FC \uC601\uC0C1\uC744 \uB9CC\uB4ED\uB2C8\uB2E4</p>
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
          <p className="text-green-main font-semibold">\uC900\uBE44 \uC644\uB8CC</p>
          <p className="text-gray-500">
            {(() => {
              const vc = photos.filter((p) => p.type === 'video').length
              const ic = photos.filter((p) => p.type !== 'video').length
              const parts = []
              if (ic > 0) parts.push(`\uC0AC\uC9C4 ${ic}\uC7A5`)
              if (vc > 0) parts.push(`\uC601\uC0C1 ${vc}\uAC1C`)
              return parts.join(' + ') + (audioMode === 'A' ? ' + AI \uC74C\uC131' : ' + \uC790\uC5F0\uC74C')
            })()}
          </p>
        </div>
      </div>

      {/* Audio Mode Selection */}
      {!videoUrl && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            \uD83C\uDFAC \uC601\uC0C1 \uCD9C\uB825 \uBC29\uC2DD \uC120\uD0DD
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
              \uD83C\uDF9E \uC0AC\uC9C4 \uD6A8\uACFC
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'kenburns', label: 'Ken Burns', desc: '\uC90C+\uD328\uB2DD' },
                { key: 'zoomin', label: '\uC90C \uC778', desc: '\uC810\uC810 \uD655\uB300' },
                { key: 'zoomout', label: '\uC90C \uC544\uC6C3', desc: '\uC810\uC810 \uCD95\uC18C' },
                { key: 'slide', label: '\uC2AC\uB77C\uC774\uB4DC', desc: '\uC88C\u2192\uC6B0 \uC774\uB3D9' },
                { key: 'fade', label: '\uD398\uC774\uB4DC', desc: '\uBC1D\uAE30 \uC804\uD658' },
                { key: 'none', label: '\uD6A8\uACFC \uC5C6\uC74C', desc: '\uC815\uC9C0 \uD654\uBA74' },
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
              \uC790\uB9C9 \uC124\uC815
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'auto', label: '\uC790\uB3D9 \uC790\uB9C9', desc: '\uB300\uBCF8 \uAE30\uBC18' },
                { key: 'edit', label: '\uC790\uB9C9 \uC218\uC815', desc: '\uB300\uBCF8 \uD3B8\uC9D1' },
                { key: 'none', label: '\uC790\uB9C9 \uC5C6\uC74C', desc: '\uC74C\uC131\uB9CC' },
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
                <p className="text-[11px] text-gray-400 mb-1">\uB300\uBCF8 \uBBF8\uB9AC\uBCF4\uAE30</p>
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{narration}</p>
              </div>
            )}

            {subtitleMode === 'edit' && (
              <textarea
                value={editedSubtitle}
                onChange={(e) => setEditedSubtitle(e.target.value)}
                placeholder={"\uC790\uB9C9\uC744 \uC218\uC815\uD558\uC138\uC694.\n\uBB38\uC7A5 \uB2E8\uC704\uB85C \uC904\uBC14\uAFC8\uD558\uBA74 \uC21C\uC11C\uB300\uB85C \uD45C\uC2DC\uB429\uB2C8\uB2E4."}
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
              \uC790\uB9C9 \uC124\uC815
            </label>

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'auto', label: 'AI \uC790\uB3D9 \uC790\uB9C9', desc: '\uB098\uB808\uC774\uC158 \uD14D\uC2A4\uD2B8' },
                { key: 'custom', label: '\uC9C1\uC811 \uC785\uB825', desc: '\uC6D0\uD558\uB294 \uC790\uB9C9' },
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
                <p className="text-[11px] text-gray-400 mb-1">\uB098\uB808\uC774\uC158 \uD14D\uC2A4\uD2B8\uB97C \uC790\uB9C9\uC73C\uB85C \uD45C\uC2DC</p>
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{narration}</p>
              </div>
            )}

            {bcSubMode === 'custom' && (
              <textarea
                value={bcCustomSubtitle}
                onChange={(e) => setBcCustomSubtitle(e.target.value)}
                placeholder={"\uC6D0\uD558\uB294 \uC790\uB9C5\uC744 \uC785\uB825\uD558\uC138\uC694\n\uC608) 2024 \uAC00\uC744 \uCCAB \uC218\uD655"}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-main resize-none"
                rows={4}
              />
            )}

            {/* Title subtitle (상황 설명) */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-600">\uC0C1\uD669 \uC124\uBA85 \uC790\uB9C5 (\uC120\uD0DD\uC0AC\uD56D)</p>
              <input
                type="text"
                value={titleSubtitle}
                onChange={(e) => setTitleSubtitle(e.target.value)}
                placeholder="\uC608) \uCDA9\uCCAD\uB0A8\uB3C4 \uC608\uC0B0\uAD70 \uC815\uC131\uB18D\uC6D0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-main"
              />
              <p className="text-[11px] text-gray-400">\uC601\uC0C1 \uC0C1\uB2E8\uC5D0 \uC7A5\uC18C\xB7\uC0C1\uD669 \uC124\uBA85\uC774 \uD45C\uC2DC\uB429\uB2C8\uB2E4</p>
            </div>

            {subtitlePosColorUI}
          </div>

          {/* Original Volume */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              <FiVolume2 className="inline mr-1.5 -mt-0.5" />
              \uC6D0\uBCF8 \uC18C\uB9AC \uC74C\uB7C9
            </label>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">\uC601\uC0C1 \uC6D0\uBCF8 \uC18C\uB9AC</span>
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
              <p className="text-[11px] text-gray-400">\uC9C1\uC811 \uCD2C\uC601\uD55C \uC601\uC0C1\uC758 \uC6D0\uBCF8 \uC18C\uB9AC \uC74C\uB7C9 (\uAE30\uBCF8 100%)</p>
            </div>
          </div>

          {/* BGM */}
          {bgmUI}

          {/* Photo Effect */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              \uD83C\uDF9E \uC0AC\uC9C4 \uD6A8\uACFC
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'kenburns', label: 'Ken Burns', desc: '\uC90C+\uD328\uB2DD' },
                { key: 'zoomin', label: '\uC90C \uC778', desc: '\uC810\uC810 \uD655\uB300' },
                { key: 'zoomout', label: '\uC90C \uC544\uC6C3', desc: '\uC810\uC810 \uCD95\uC18C' },
                { key: 'slide', label: '\uC2AC\uB77C\uC774\uB4DC', desc: '\uC88C\u2192\uC6B0 \uC774\uB3D9' },
                { key: 'fade', label: '\uD398\uC774\uB4DC', desc: '\uBC1D\uAE30 \uC804\uD658' },
                { key: 'none', label: '\uD6A8\uACFC \uC5C6\uC74C', desc: '\uC815\uC9C0 \uD654\uBA74' },
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
            \u2705 \uC601\uC0C1 \uC6D0\uBCF8 \uC18C\uB9AC \uC0AC\uC6A9 \u2014 \uC9C1\uC811 \uCD2C\uC601\uD55C \uC601\uC0C1\uC774\uBBC0\uB85C \uC800\uC791\uAD8C \uBB38\uC81C \uC5C6\uC74C
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
              \uC601\uC0C1 \uD569\uC131 \uC911... (\uC18C\uB9AC\uAC00 \uC7AC\uC0DD\uB429\uB2C8\uB2E4)
            </>
          ) : (
            <>
              <FiFilm className="text-xl" />
              \uC601\uC0C1 \uC0DD\uC131\uD558\uAE30
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
            <FiDownload /> {ext.toUpperCase()} \uB2E4\uC6B4\uB85C\uB4DC
          </button>

          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiUpload className="text-red-500" />
              <span className="text-sm font-bold text-red-600">YouTube Shorts \uC5C5\uB85C\uB4DC</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              \uB2E4\uC6B4\uB85C\uB4DC\uD55C \uC601\uC0C1\uC744 YouTube Shorts\uC5D0 \uBC14\uB85C \uC5C5\uB85C\uB4DC\uD558\uC138\uC694!
              \uC138\uB85C \uBE44\uC728(9:16)\uC73C\uB85C \uC81C\uC791\uB418\uC5B4 Shorts\uC5D0 \uCD5C\uC801\uD654\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.
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
          <FiArrowLeft /> \uC774\uC804
        </button>
        <button
          onClick={reset}
          className="flex-[2] py-3 border-2 border-green-main text-green-main rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-50 transition"
        >
          <FiRefreshCw /> \uC0C8 \uC601\uC0C1 \uB9CC\uB4E4\uAE30
        </button>
      </div>
    </div>
  )
}
