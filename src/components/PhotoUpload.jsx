import { useRef, useState } from 'react'
import { FiX, FiArrowRight, FiArrowLeft, FiPlus, FiAlertCircle, FiScissors } from 'react-icons/fi'
import heic2any from 'heic2any'
import useStore from '../store'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_VIDEO_DURATION = 60 // seconds

function isHeic(file) {
  const type = (file.type || '').toLowerCase()
  if (type === 'image/heic' || type === 'image/heif') return true
  const name = (file.name || '').toLowerCase()
  return name.endsWith('.heic') || name.endsWith('.heif')
}

async function convertHeicToJpeg(file) {
  try {
    const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
    // heic2any can return an array of blobs for multi-frame HEIC
    const result = Array.isArray(blob) ? blob[0] : blob
    return new File([result], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' })
  } catch (e) {
    console.warn('[HEIC] 변환 실패:', e)
    return null
  }
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = () => resolve(0)
    video.src = URL.createObjectURL(file)
  })
}

// Process image: create thumbnail + compress for video
// Handles all phone models: high-MP cameras, HEIC, low RAM devices
async function processImage(file) {
  function draw(source, w, h) {
    return new Promise((resolve) => {
      try {
        // Thumbnail (400px)
        const tc = document.createElement('canvas')
        const THUMB = 400
        let tw = w, th = h
        if (tw > th) { th = Math.round((th / tw) * THUMB); tw = THUMB }
        else { tw = Math.round((tw / th) * THUMB); th = THUMB }
        tc.width = tw; tc.height = th
        tc.getContext('2d').drawImage(source, 0, 0, tw, th)
        const preview = tc.toDataURL('image/jpeg', 0.7)

        // Compressed for video (max 1920px)
        const vc = document.createElement('canvas')
        let vw = w, vh = h
        const maxDim = 1920
        if (Math.max(vw, vh) > maxDim) {
          const s = maxDim / Math.max(vw, vh)
          vw = Math.round(vw * s); vh = Math.round(vh * s)
        }
        vc.width = vw; vc.height = vh
        vc.getContext('2d').drawImage(source, 0, 0, vw, vh)
        vc.toBlob(
          (b) => resolve({ preview, blob: b || file }),
          'image/jpeg', 0.85
        )
      } catch { resolve({ preview: '', blob: file }) }
    })
  }

  // Method 1: createImageBitmap with resizeWidth (most memory-efficient)
  //   Decodes + resizes in one step — never allocates full-resolution pixels
  if (typeof createImageBitmap !== 'undefined') {
    // Try progressively smaller sizes if device runs out of memory
    for (const maxPx of [1920, 1280, 800]) {
      try {
        const bm = await createImageBitmap(file, {
          resizeWidth: maxPx,
          resizeQuality: 'high',
        })
        const result = await draw(bm, bm.width, bm.height)
        bm.close()
        return result
      } catch { /* try smaller */ }
    }
    // Last resort: decode without resize options (some browsers don't support them)
    try {
      const bm = await createImageBitmap(file)
      const result = await draw(bm, bm.width, bm.height)
      bm.close()
      return result
    } catch (e) { console.warn('[이미지] createImageBitmap 실패:', e) }
  }

  // Method 2: Image element + blob URL
  try {
    return await new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      const timer = setTimeout(() => {
        URL.revokeObjectURL(url)
        resolve({ preview: '', blob: file })
      }, 15000)
      img.onload = () => {
        clearTimeout(timer)
        URL.revokeObjectURL(url)
        draw(img, img.width, img.height).then(resolve)
      }
      img.onerror = () => {
        clearTimeout(timer)
        URL.revokeObjectURL(url)
        resolve({ preview: '', blob: file })
      }
      img.src = url
    })
  } catch { /* fall through */ }

  // Method 3: read raw bytes as final fallback (no preview but video gen can try)
  try {
    const buf = await file.arrayBuffer()
    return { preview: '', blob: new Blob([buf], { type: file.type || 'image/jpeg' }) }
  } catch { /* fall through */ }

  return { preview: '', blob: file }
}

function createVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    const url = URL.createObjectURL(file)
    let resolved = false
    const done = (dataUrl) => {
      if (resolved) return
      resolved = true
      URL.revokeObjectURL(url)
      resolve(dataUrl)
    }
    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, video.duration / 2)
    }
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        const MAX = 400
        let w = video.videoWidth || 300, h = video.videoHeight || 300
        if (w > h) { h = Math.round((h / w) * MAX); w = MAX }
        else { w = Math.round((w / h) * MAX); h = MAX }
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(video, 0, 0, w, h)
        done(canvas.toDataURL('image/jpeg', 0.7))
      } catch { done('') }
    }
    video.onerror = () => done('')
    setTimeout(() => done(''), 5000)
    video.src = url
  })
}

export default function PhotoUpload() {
  const photos = useStore((s) => s.photos)
  const addMedia = useStore((s) => s.addMedia)
  const removePhoto = useStore((s) => s.removePhoto)
  const updateMediaTrim = useStore((s) => s.updateMediaTrim)
  const setStep = useStore((s) => s.setStep)
  const fileRef = useRef()
  const [warning, setWarning] = useState('')
  const [editingId, setEditingId] = useState(null)

  const handleFiles = async (fileList) => {
    setWarning('')
    try {
      const files = Array.from(fileList)
      const items = []

      for (const file of files) {
        if (photos.length + items.length >= 10) break

        // Convert HEIC/HEIF to JPEG first
        let processedFile = file
        if (isHeic(file)) {
          const converted = await convertHeicToJpeg(file)
          if (!converted) {
            setWarning(`"${file.name}" HEIC 형식 변환에 실패했습니다. JPG로 변환 후 다시 시도해주세요.`)
            continue
          }
          processedFile = converted
        }

        if (processedFile.type.startsWith('video/')) {
          // Video validation
          if (processedFile.size > MAX_VIDEO_SIZE) {
            setWarning(`"${file.name}" 파일 크기가 100MB를 초과합니다.`)
            continue
          }
          const duration = await getVideoDuration(processedFile)
          if (duration > MAX_VIDEO_DURATION) {
            setWarning(`"${file.name}" 영상이 60초를 초과합니다 (${formatDuration(duration)}).`)
            continue
          }
          const preview = await createVideoThumbnail(processedFile)
          // Read file data into memory immediately — mobile browsers can
          // invalidate the File reference (lazy disk pointer) across steps
          const buf = await processedFile.arrayBuffer()
          const blob = new Blob([buf], { type: processedFile.type || 'video/mp4' })
          items.push({ file: blob, type: 'video', duration, preview })
        } else if (processedFile.type.startsWith('image/')) {
          // Compress large camera photos (10MB → ~200KB) via canvas
          const { preview, blob } = await processImage(processedFile)
          items.push({ file: blob, type: 'image', preview })
        }
      }

      if (items.length) addMedia(items)
    } catch (err) {
      console.error('[업로드] 파일 처리 실패:', err)
      setWarning(`파일 처리 중 오류가 발생했습니다: ${err?.message || String(err)}`)
    }
  }

  const onInputChange = (e) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const videoCount = photos.filter((p) => p.type === 'video').length
  const imageCount = photos.filter((p) => p.type !== 'video').length

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-green-main">사진 · 영상 업로드</h2>
        <p className="text-gray-500 mt-1">영상에 들어갈 사진이나 영상을 선택하세요 (최대 10개)</p>
      </div>

      {/* Warning */}
      {warning && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          <FiAlertCircle className="shrink-0" />
          <span>{warning}</span>
          <button onClick={() => setWarning('')} className="ml-auto text-amber-500 hover:text-amber-700">
            <FiX />
          </button>
        </div>
      )}

      {/* Drop Zone */}
      {photos.length < 10 && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-green-main/30 rounded-2xl p-8 text-center cursor-pointer hover:border-green-main/60 hover:bg-green-50/50 transition-all"
        >
          <div className="flex items-center justify-center gap-4 mb-3">
            <span className="text-4xl">📸</span>
            <span className="text-4xl">🎬</span>
          </div>
          <p className="text-green-main font-semibold">
            사진 또는 영상 선택
          </p>
          <p className="text-sm text-gray-400 mt-1">
            사진(JPG·PNG·HEIC) 또는 영상(MP4·MOV) · 최대 10개
          </p>
          <p className="text-xs text-gray-300 mt-1">
            남은 슬롯: {10 - photos.length}개
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,.heic,.heif"
            multiple
            onChange={onInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Info banner */}
      {videoCount > 0 && imageCount > 0 && (
        <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs">
          영상과 사진이 순서대로 합쳐집니다 (영상 → 사진 슬라이드쇼)
        </div>
      )}
      {videoCount > 0 && imageCount === 0 && (
        <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs">
          영상에 AI 나레이션 음성이 추가됩니다
        </div>
      )}

      {/* Media Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {photos.map((item, i) => (
            <div key={item.id} className="relative group aspect-square">
              {item.type === 'video' ? (
                <video
                  src={item.preview}
                  className="w-full h-full object-cover rounded-xl border-2 border-gray-100"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={item.preview}
                  alt={`미디어 ${i + 1}`}
                  className="w-full h-full object-cover rounded-xl border-2 border-gray-100"
                />
              )}
              {/* Index */}
              <div className="absolute top-1 left-1 bg-black/50 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {i + 1}
              </div>
              {/* Video badge + duration */}
              {item.type === 'video' && (
                <>
                  <span className="absolute top-1 left-7 text-[10px] bg-orange-point text-white px-1.5 py-0.5 rounded-full font-medium">
                    🎬 영상
                  </span>
                  {item.duration > 0 && (
                    <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                      {formatDuration(item.trimDuration || item.duration)}
                    </span>
                  )}
                  {/* Trim button */}
                  <button
                    onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                    className={`absolute bottom-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm ${
                      editingId === item.id
                        ? 'bg-green-main text-white'
                        : 'bg-black/60 text-white'
                    }`}
                    title="길이 조절"
                  >
                    <FiScissors />
                  </button>
                </>
              )}
              {/* Remove button */}
              <button
                onClick={() => removePhoto(item.id)}
                className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
              >
                <FiX className="text-xs" />
              </button>
            </div>
          ))}
          {photos.length < 10 && (
            <button
              onClick={() => fileRef.current?.click()}
              className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 hover:border-green-main hover:text-green-main transition"
            >
              <FiPlus className="text-2xl" />
            </button>
          )}
        </div>
      )}

      {/* Video Trim Panel */}
      {editingId && (() => {
        const item = photos.find((p) => p.id === editingId)
        if (!item || item.type !== 'video') return null
        const currentTrim = item.trimDuration || item.duration
        const DURATION_OPTIONS = [10, 15, 20, 25]
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <FiScissors className="text-green-main" /> 영상 길이 선택
              </span>
              <span className="text-sm font-bold text-green-main">{formatDuration(currentTrim)}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((sec) => {
                const isSelected = Math.floor(currentTrim) === sec
                const isOver = sec > Math.floor(item.duration)
                return (
                  <button
                    key={sec}
                    onClick={() => !isOver && updateMediaTrim(item.id, sec)}
                    disabled={isOver}
                    className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      isSelected
                        ? 'bg-green-main text-white shadow-sm'
                        : isOver
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-green-main hover:text-green-main'
                    }`}
                  >
                    {sec}초
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-gray-400 text-center">
              원본 길이: {formatDuration(item.duration)}
            </p>
          </div>
        )
      })()}

      {/* Summary */}
      {photos.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          사진 {imageCount}장 · 영상 {videoCount}개 · 총 {photos.length}/10
        </p>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => setStep(0)}
          className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition"
        >
          <FiArrowLeft /> 이전
        </button>
        <button
          onClick={() => setStep(2)}
          disabled={photos.length === 0}
          className="flex-[2] py-3 bg-orange-point text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-point/20"
        >
          다음 단계 <FiArrowRight />
        </button>
      </div>
    </div>
  )
}
