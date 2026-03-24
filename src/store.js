import { create } from 'zustand'
import { loadMusicBuffer } from './bgm.js'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function createWavHeader(pcmLength) {
  const sampleRate = 24000
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * bitsPerSample / 8
  const blockAlign = numChannels * bitsPerSample / 8
  const buffer = new ArrayBuffer(44)
  const view = new DataView(buffer)
  // RIFF
  view.setUint8(0, 0x52); view.setUint8(1, 0x49)
  view.setUint8(2, 0x46); view.setUint8(3, 0x46)
  view.setUint32(4, 36 + pcmLength, true)
  view.setUint8(8, 0x57); view.setUint8(9, 0x41)
  view.setUint8(10, 0x56); view.setUint8(11, 0x45)
  // fmt
  view.setUint8(12, 0x66); view.setUint8(13, 0x6D)
  view.setUint8(14, 0x74); view.setUint8(15, 0x20)
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  // data
  view.setUint8(36, 0x64); view.setUint8(37, 0x61)
  view.setUint8(38, 0x74); view.setUint8(39, 0x61)
  view.setUint32(40, pcmLength, true)
  return buffer
}

function generateId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16))
}

function pcmBase64ToWavBlob(base64) {
  const pcmBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const wavHeader = createWavHeader(pcmBuffer.length)
  return new Blob([new Uint8Array(wavHeader), pcmBuffer], { type: 'audio/wav' })
}

const CROPS = [
  { id: 'rice', name: '쌀', emoji: '🌾' },
  { id: 'strawberry', name: '딸기', emoji: '🍓' },
  { id: 'tomato', name: '토마토', emoji: '🍅' },
  { id: 'pepper', name: '고추', emoji: '🌶️' },
  { id: 'garlic', name: '마늘', emoji: '🧄' },
  { id: 'onion', name: '양파', emoji: '🧅' },
  { id: 'cabbage', name: '배추', emoji: '🥬' },
  { id: 'apple', name: '사과', emoji: '🍎' },
  { id: 'grape', name: '포도', emoji: '🍇' },
  { id: 'watermelon', name: '수박', emoji: '🍉' },
  { id: 'cucumber', name: '오이', emoji: '🥒' },
  { id: 'lettuce', name: '상추', emoji: '🥗' },
]

// Farm profile from localStorage
function loadFarmProfile() {
  try {
    const raw = localStorage.getItem('farm_profile')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const useStore = create((set, get) => ({
  // Step management
  step: 0, // 0=onboarding, 1=upload, 2=narration, 3=audio, 4=download

  // Farm Profile (persistent)
  farmProfile: loadFarmProfile(), // { farmName, crops, region: {도, 시군구, 읍면동} } | null
  showProfileSetup: false,

  setFarmProfile: (profile) => {
    localStorage.setItem('farm_profile', JSON.stringify(profile))
    set({ farmProfile: profile, showProfileSetup: false })
  },

  openProfileSetup: () => set({ showProfileSetup: true }),
  closeProfileSetup: () => set({ showProfileSetup: false }),

  // API Key (loaded from localStorage)
  geminiKey: localStorage.getItem('nongbu_gemini_key') || '',

  setGeminiKey: (key) => {
    localStorage.setItem('nongbu_gemini_key', key)
    set({ geminiKey: key })
  },

  // Onboarding
  farmName: '',
  selectedCrops: [],
  region: '',

  // Media (photos + videos)
  photos: [], // { id, file, preview, type: 'image'|'video', duration?: number }

  // Narration
  narration: '',
  isGeneratingNarration: false,

  // Audio
  voiceName: 'Sulafat',
  audioUrl: null,
  isGeneratingAudio: false,

  // Video
  videoUrl: null,
  videoFormat: 'mp4',
  isGeneratingVideo: false,

  // Actions
  setStep: (targetStep) => {
    const current = get().step
    const updates = { step: targetStep }

    if (targetStep !== current) {
      // Reset generated results for steps after the target
      // step 2=narration, 3=audio, 4=video
      if (targetStep <= 2) {
        // Going to narration or earlier: clear audio + video
        if (get().audioUrl) URL.revokeObjectURL(get().audioUrl)
        if (get().videoUrl) URL.revokeObjectURL(get().videoUrl)
        updates.audioUrl = null
        updates.videoUrl = null
      } else if (targetStep <= 3) {
        // Going to audio step: clear audio + video (re-generate with possibly changed narration)
        if (get().audioUrl) URL.revokeObjectURL(get().audioUrl)
        if (get().videoUrl) URL.revokeObjectURL(get().videoUrl)
        updates.audioUrl = null
        updates.videoUrl = null
      } else if (targetStep <= 4) {
        // Going to video step: clear video (re-generate with possibly changed audio)
        if (get().videoUrl) URL.revokeObjectURL(get().videoUrl)
        updates.videoUrl = null
      }
    }

    set(updates)
  },
  setFarmName: (name) => set({ farmName: name }),
  toggleCrop: (cropId) =>
    set((state) => {
      const selected = state.selectedCrops.includes(cropId)
        ? state.selectedCrops.filter((c) => c !== cropId)
        : state.selectedCrops.length < 5
        ? [...state.selectedCrops, cropId]
        : state.selectedCrops
      return { selectedCrops: selected }
    }),
  setRegion: (region) => set({ region }),

  addMedia: (items) =>
    set((state) => {
      // items: [{ file, type, duration?, preview? }]
      const newItems = items.slice(0, 10 - state.photos.length).map((item) => ({
        id: generateId(),
        file: item.file,
        preview: item.preview || URL.createObjectURL(item.file),
        type: item.type, // 'image' or 'video'
        duration: item.duration || 0,
      }))
      return { photos: [...state.photos, ...newItems] }
    }),

  // Keep legacy alias
  addPhotos: (files) => {
    const items = files.map((f) => ({ file: f, type: 'image' }))
    get().addMedia(items)
  },

  updateMediaTrim: (id, trimDuration) =>
    set((state) => ({
      photos: state.photos.map((p) =>
        p.id === id ? { ...p, trimDuration } : p
      ),
    })),

  removePhoto: (id) =>
    set((state) => {
      const photo = state.photos.find((p) => p.id === id)
      if (photo) URL.revokeObjectURL(photo.preview)
      return { photos: state.photos.filter((p) => p.id !== id) }
    }),

  reorderPhotos: (fromIndex, toIndex) =>
    set((state) => {
      const photos = [...state.photos]
      const [moved] = photos.splice(fromIndex, 1)
      photos.splice(toIndex, 0, moved)
      return { photos }
    }),

  setNarration: (narration) => set({ narration }),
  setVoiceName: (voiceName) => set({ voiceName, audioUrl: null }),

  generateNarration: async (userPrompt = '', mode = 'refine', seasonContext = '') => {
    // mode: 'refine' = AI 다듬기, 'photo' = 사진 자동분석
    const { farmName, selectedCrops, region, photos, geminiKey, farmProfile } = get()
    if (!geminiKey) return
    set({ isGeneratingNarration: true })
    try {
      const cropNames = selectedCrops
        .map((id) => CROPS.find((c) => c.id === id)?.name)
        .filter(Boolean)

      // Build farm info from profile + onboarding
      const profileName = farmProfile?.farmName || farmName
      const profileCrops = farmProfile?.crops || cropNames.join(', ')
      const profileRegion = farmProfile?.region
        ? [farmProfile.region.도, farmProfile.region.시군구, farmProfile.region.읍면동].filter(Boolean).join(' ')
        : region

      let prompt
      const parts = []

      if (mode === 'photo' && photos.length > 0) {
        const imagePhotos = photos.filter((p) => p.type !== 'video')
        for (const photo of imagePhotos) {
          const base64 = await fileToBase64(photo.file)
          parts.push({
            inlineData: {
              mimeType: photo.file.type || 'image/jpeg',
              data: base64,
            },
          })
        }
        const seasonLine = seasonContext ? `\n계절/날씨: ${seasonContext}` : ''
        prompt = `[시스템 역할 지시]
당신은 농부의 일상을 따뜻하게 전달하는 브이로그 나레이터입니다.

[나레이션 스타일 원칙]
- 말투: 일상 대화체, 담백하고 자연스럽게
- 형식: 브이로그처럼 오늘 하루를 이야기하듯
- 과장 없이: 광고 문구나 홍보성 말투 금지
- 사진 설명: 보이는 것을 있는 그대로 담백하게
- 길이: 20~40초 분량 (너무 길지 않게)
- 끝맺음: 자연스럽게 마무리 (구독 강요 없이)

[좋은 예시]
"오늘 아침 일찍 사과밭에 나왔어요.
날씨가 맑아서 작업하기 딱 좋은 날이에요.
홍로 사과가 제법 잘 익었네요.
이번 주 안에 수확할 것 같아요."

[나쁜 예시 (이런 스타일 금지)]
"안녕하세요! 정성농원입니다! 오늘은 특별한
소식을 전해드립니다! 최고 품질의 사과를
만나보세요! 구독과 좋아요 부탁드립니다!"

아래 사진들을 분석하고, 농장 정보를 바탕으로 브이로그 나레이션을 작성해주세요.

농장 이름: ${profileName}
재배 작물: ${profileCrops}
지역: ${profileRegion}
사진 수: ${photos.length}장${seasonLine}

추가 요구사항:
- 사진 속 장면을 있는 그대로 담백하게 묘사해주세요${seasonContext ? '\n- 계절감과 날씨 분위기를 자연스럽게 녹여주세요' : ''}
- 사진이 바뀌는 시점에 (사진전환) 마커를 넣어주세요
- (사진전환) 마커는 문장 사이에 넣어주세요. 예: "첫 번째 문장입니다. (사진전환) 두 번째 문장입니다."
- 사진 수에 맞게 (사진전환) 마커를 ${Math.max(0, photos.length - 1)}개 넣어주세요
- 20~40초 분량 (약 80~150자)
- 나레이션 텍스트만 출력 (부연 설명 없이)`
      } else {
        const userSection = userPrompt.trim()
          ? `\n\n농부가 전달한 키워드/문장:\n${userPrompt.trim()}\n위 내용을 핵심 소재로 활용하여 자연스러운 나레이션을 만들어주세요. 키워드만 있어도 문맥을 살려 풍부한 문장으로 확장해주세요.`
          : ''
        const seasonLine2 = seasonContext ? `\n계절/날씨: ${seasonContext}` : ''

        prompt = `[시스템 역할 지시]
당신은 농부의 일상을 따뜻하게 전달하는 브이로그 나레이터입니다.

[나레이션 스타일 원칙]
- 말투: 일상 대화체, 담백하고 자연스럽게
- 형식: 브이로그처럼 오늘 하루를 이야기하듯
- 과장 없이: 광고 문구나 홍보성 말투 금지
- 사진 설명: 보이는 것을 있는 그대로 담백하게
- 길이: 20~40초 분량 (너무 길지 않게)
- 끝맺음: 자연스럽게 마무리 (구독 강요 없이)

[좋은 예시]
"오늘 아침 일찍 사과밭에 나왔어요.
날씨가 맑아서 작업하기 딱 좋은 날이에요.
홍로 사과가 제법 잘 익었네요.
이번 주 안에 수확할 것 같아요."

[나쁜 예시 (이런 스타일 금지)]
"안녕하세요! 정성농원입니다! 오늘은 특별한
소식을 전해드립니다! 최고 품질의 사과를
만나보세요! 구독과 좋아요 부탁드립니다!"

다음 농장 정보를 바탕으로 브이로그 나레이션을 작성해주세요.

농장 이름: ${profileName}
재배 작물: ${profileCrops}
지역: ${profileRegion}
사진 수: ${photos.length}장${seasonLine2}${userSection}

추가 요구사항:${seasonContext ? '\n- 계절감과 날씨 분위기를 자연스럽게 녹여주세요' : ''}
- 사진이 ${photos.length}장이므로 사진이 바뀌는 시점에 (사진전환) 마커를 넣어주세요
- (사진전환) 마커는 문장 사이에 넣어주세요. 예: "첫 번째 문장입니다. (사진전환) 두 번째 문장입니다."
- 사진 수에 맞게 (사진전환) 마커를 ${Math.max(0, photos.length - 1)}개 넣어주세요
- 20~40초 분량 (약 80~150자)
- 나레이션 텍스트만 출력 (부연 설명 없이)`
      }

      parts.push({ text: prompt })

      console.log('[나레이션] Gemini API 호출 시작 (모드:', mode, ')')
      console.log('[나레이션] 프롬프트:', prompt)

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
          }),
        }
      )

      console.log('[나레이션] 응답 상태:', res.status, res.statusText)

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const detail = errData.error?.message || errData.error?.status || `HTTP ${res.status}`
        console.error('[나레이션] API 에러 상세:', JSON.stringify(errData, null, 2))
        throw new Error(detail)
      }

      const data = await res.json()
      console.log('[나레이션] 응답 수신 완료')

      const narrationText = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!narrationText) throw new Error('나레이션 응답이 비어있습니다')

      set({ narration: narrationText.trim() })
      console.log('[나레이션] 생성 완료')
    } catch (err) {
      console.error('[나레이션] 생성 실패:', err)
      alert(`나레이션 생성에 실패했습니다.\n${err.message}`)
    } finally {
      set({ isGeneratingNarration: false })
    }
  },

  generateAudio: async (stylePrompt = '') => {
    const { narration, geminiKey, voiceName } = get()
    if (!geminiKey) {
      alert('농장 정보 화면에서 Gemini API 키를 먼저 입력해주세요.')
      return
    }
    set({ isGeneratingAudio: true, audioUrl: null })
    try {
      // (사진전환) 마커를 TTS 텍스트에서 제거 — 음성으로 읽지 않음
      const cleanNarration = narration.replace(/\(사진전환\)/g, '').replace(/\s{2,}/g, ' ').trim()
      const ttsText = stylePrompt
        ? stylePrompt + '\n\n' + cleanNarration
        : cleanNarration
      console.log('[TTS] Gemini TTS API 호출 시작')
      console.log('[TTS] 음성:', voiceName, '| 스타일:', stylePrompt || '(없음)', '| 텍스트 길이:', narration.length)

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: ttsText }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
          }),
        }
      )

      console.log('[TTS] 응답 상태:', res.status, res.statusText)

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const detail = errData.error?.message || errData.error?.status || `HTTP ${res.status}`
        console.error('[TTS] API 에러 상세:', JSON.stringify(errData, null, 2))
        throw new Error(detail)
      }

      const data = await res.json()
      console.log('[TTS] 응답 수신 완료')

      const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
      if (!audioBase64) throw new Error('음성 데이터가 비어있습니다')

      // base64 PCM → WAV with header
      const audioBlob = pcmBase64ToWavBlob(audioBase64)
      const url = URL.createObjectURL(audioBlob)
      set({ audioUrl: url })
      console.log('[TTS] 음성 생성 완료')
    } catch (err) {
      console.error('[TTS] 생성 실패:', err)
      alert(`음성 생성에 실패했습니다.\n${err.message}`)
    } finally {
      set({ isGeneratingAudio: false })
    }
  },

  generateVideo: async (bgmUrl = null, bgmVolume = 0.2, subtitleText = null, photoEffect = 'kenburns', subtitlePos = 'upper', subtitleColor = 'default', audioMode = 'A', originalVolume = 1.0, titleText = null) => {
    const { photos, audioUrl, narration: fullNarration } = get()
    set({ isGeneratingVideo: true, videoUrl: null })
    try {
      console.log('[영상] 영상 생성 시작 - 모드:', audioMode, '파일:', photos.length, '개, BGM:', bgmUrl ? '있음' : '없음')

      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const audioCtx = new AudioCtx()

      // 1. Decode narration audio (Mode A only)
      let totalDur = 0
      let audioBuffer = null
      if (audioMode === 'A') {
        const audioBlob = await (await fetch(audioUrl)).blob()
        audioBuffer = await audioCtx.decodeAudioData(await audioBlob.arrayBuffer())
        totalDur = audioBuffer.duration
        console.log('[영상] 나레이션 오디오 길이:', totalDur.toFixed(1), '초')
      }

      // 1.5. Parse (사진전환) markers to determine transition timings
      //   Calculate marker positions as character ratios in clean text → map to audio time
      let transitionTimes = [] // seconds where photo transitions happen
      if (audioMode === 'A' && fullNarration && fullNarration.includes('(사진전환)')) {
        const parts = fullNarration.split('(사진전환)')
        const cleanTotal = fullNarration.replace(/\(사진전환\)/g, '').length
        if (cleanTotal > 0 && parts.length > 1) {
          let charPos = 0
          for (let i = 0; i < parts.length - 1; i++) {
            charPos += parts[i].replace(/\(사진전환\)/g, '').length
            const ratio = charPos / cleanTotal
            transitionTimes.push(ratio * totalDur)
          }
          console.log('[영상] (사진전환) 마커 기반 전환 시점:', transitionTimes.map((t) => t.toFixed(1) + 's'))
        }
      }

      // 2. Preload ALL media in upload order (no reordering)
      //    Always create fresh blob URLs from file objects for full resolution
      const loaded = []
      for (let mi = 0; mi < photos.length; mi++) {
        const item = photos[mi]
        const src = URL.createObjectURL(item.file)
        if (item.type === 'video') {
          const el = document.createElement('video')
          el.muted = (audioMode === 'A')
          el.playsInline = true
          el.preload = 'auto'
          el.setAttribute('playsinline', '')
          el.setAttribute('webkit-playsinline', '')
          el.src = src
          await new Promise((ok, fail) => {
            el.onloadeddata = ok
            el.onerror = () => fail(new Error(`동영상 ${mi + 1}번 로딩 실패`))
            setTimeout(() => fail(new Error(`동영상 ${mi + 1}번 로딩 시간 초과`)), 15000)
          })
          const mediaDur = item.trimDuration > 0 ? item.trimDuration : el.duration
          loaded.push({ type: 'video', element: el, mediaDur })
        } else {
          const img = new Image()
          img.src = src
          await new Promise((ok, fail) => {
            img.onload = ok
            img.onerror = () => fail(new Error(`사진 ${mi + 1}번 로딩 실패`))
            setTimeout(() => fail(new Error(`사진 ${mi + 1}번 로딩 시간 초과`)), 15000)
          })
          loaded.push({ type: 'image', element: img, mediaDur: 0 })
        }
      }
      if (loaded.length === 0) throw new Error('표시할 미디어가 없습니다')
      console.log('[영상] 미디어 프리로드 완료:', loaded.length, '개')

      // Calculate totalDur for Mode B/C (based on media durations)
      if (audioMode !== 'A') {
        const PER_IMAGE = 4
        for (const m of loaded) {
          totalDur += m.type === 'video' ? m.mediaDur : PER_IMAGE
        }
        console.log('[영상] 미디어 기반 총 길이:', totalDur.toFixed(1), '초')
      }

      // 3. Build timeline segments
      const FADE = 0.5
      const MIN_SHOW = 2
      const segments = [] // { type, element, start, end }
      let cursor = 0

      if (audioMode !== 'A') {
        // Mode B/C: sequential timeline based on actual media durations
        const PER_IMAGE = 4
        for (const m of loaded) {
          const dur = m.type === 'video' ? m.mediaDur : PER_IMAGE
          if (dur <= 0) continue
          segments.push({ type: m.type, element: m.element, start: cursor, end: cursor + dur })
          cursor += dur
        }
        console.log('[영상] 순차 타임라인 생성')
      } else if (transitionTimes.length > 0 && transitionTimes.length >= loaded.length - 1) {
        // Use (사진전환) marker timings
        const boundaries = [0, ...transitionTimes, totalDur]
        for (let i = 0; i < loaded.length && i < boundaries.length - 1; i++) {
          const m = loaded[i]
          const start = boundaries[i]
          let end = boundaries[i + 1]
          if (m.type === 'video') {
            end = Math.min(start + m.mediaDur, end)
          }
          if (end - start < 0.5) continue
          segments.push({ type: m.type, element: m.element, start, end })
        }
        console.log('[영상] 마커 기반 타임라인 생성')
      } else {
        // Fallback: even distribution
        let videoTimeTotal = 0
        let imageCount = 0
        for (const m of loaded) {
          if (m.type === 'video') videoTimeTotal += Math.min(m.mediaDur, totalDur)
          else imageCount++
        }
        const imageTimeTotal = Math.max(0, totalDur - videoTimeTotal)
        const perImage = imageCount > 0
          ? Math.max(MIN_SHOW, imageTimeTotal / imageCount)
          : 0

        for (const m of loaded) {
          if (cursor >= totalDur) break
          let dur
          if (m.type === 'video') {
            dur = Math.min(m.mediaDur, totalDur - cursor)
          } else {
            dur = Math.min(perImage, totalDur - cursor)
          }
          if (dur <= 0) break
          segments.push({ type: m.type, element: m.element, start: cursor, end: cursor + dur })
          cursor += dur
        }
      }

      console.log('[영상] 타임라인:', segments.map((s, i) =>
        `#${i} ${s.type} ${s.start.toFixed(1)}-${s.end.toFixed(1)}s`
      ).join(', '))

      // 4. Canvas (9:16)
      const canvas = document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1920
      const ctx = canvas.getContext('2d')

      function drawContain(el, progress) {
        const w = el.videoWidth || el.width
        const h = el.videoHeight || el.height
        if (!w || !h) return
        const baseScale = Math.min(canvas.width / w, canvas.height / h)

        // Apply effect only to images; videos use static contain
        const isImage = !el.videoWidth
        const p = typeof progress === 'number' ? progress : 0 // 0~1

        let scale = baseScale
        let offsetX = 0
        let offsetY = 0

        if (isImage && photoEffect !== 'none') {
          const ep = easeInOut(p)
          switch (photoEffect) {
            case 'kenburns': {
              // Slow zoom in + slight pan
              scale = baseScale * (1 + 0.15 * ep)
              offsetX = (canvas.width * 0.05) * (ep - 0.5)
              offsetY = (canvas.height * 0.03) * (ep - 0.5)
              break
            }
            case 'zoomin': {
              scale = baseScale * (1 + 0.2 * ep)
              break
            }
            case 'zoomout': {
              scale = baseScale * (1.2 - 0.2 * ep)
              break
            }
            case 'slide': {
              scale = baseScale * 1.1
              offsetX = (canvas.width * 0.1) * (ep - 0.5)
              break
            }
            case 'fade': {
              // Brightness fade: start dim, brighten to full
              scale = baseScale
              // handled via globalAlpha after drawing
              break
            }
          }
        }

        const dw = w * scale
        const dh = h * scale
        const dx = (canvas.width - dw) / 2 + offsetX
        const dy = (canvas.height - dh) / 2 + offsetY
        ctx.drawImage(el, dx, dy, dw, dh)

        // Fade effect: overlay dark layer based on progress
        if (isImage && photoEffect === 'fade') {
          const brightness = 0.4 + 0.6 * easeInOut(Math.min(p * 2, 1)) // 0.4 → 1.0 in first half
          const dimAfter = p > 0.7 ? (p - 0.7) / 0.3 : 0 // dim in last 30%
          const alpha = (1 - brightness) + dimAfter * 0.4
          if (alpha > 0.01) {
            ctx.fillStyle = `rgba(0,0,0,${alpha})`
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }
        }
      }

      function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      }

      // 4.5. Prepare subtitle cues synced to narration by character ratio
      //   TTS reads at a consistent speed, so character position maps linearly to audio time.
      const subtitleCues = []
      if (subtitleText) {
        const cleanSubtitle = subtitleText.replace(/\(사진전환\)/g, '').trim()
        const lines = cleanSubtitle.split(/\n+/).flatMap((line) =>
          line.trim() ? line.trim().match(/[^.!?。]+[.!?。]?/g)?.map((s) => s.trim()).filter(Boolean) || [line.trim()] : []
        )

        if (lines.length > 0) {
          const totalChars = lines.reduce((sum, l) => sum + l.length, 0)
          let charPos = 0
          for (let i = 0; i < lines.length; i++) {
            const start = (charPos / totalChars) * totalDur
            charPos += lines[i].length
            const end = (charPos / totalChars) * totalDur
            subtitleCues.push({ text: lines[i], start, end })
          }
          console.log('[영상] 자막 수:', subtitleCues.length, '| 글자 수 기반 동기화')
        }
      }

      // Subtitle color presets
      const SUB_COLORS = {
        default: { bg: 'rgba(0, 0, 0, 0.6)', text: '#FFFFFF' },
        yellow:  { bg: 'rgba(234, 179, 8, 0.9)', text: '#000000' },
        green:   { bg: 'rgba(34, 197, 94, 0.85)', text: '#FFFFFF' },
        blue:    { bg: 'rgba(59, 130, 246, 0.85)', text: '#FFFFFF' },
        white:   { bg: 'rgba(255, 255, 255, 0.85)', text: '#000000' },
      }
      const subStyle = SUB_COLORS[subtitleColor] || SUB_COLORS.default

      let lastSubtitleBox = null // track subtitle position for title placement

      function drawSubtitle(t) {
        lastSubtitleBox = null
        if (subtitleCues.length === 0) return
        const cue = subtitleCues.find((c) => t >= c.start && t < c.end)
        if (!cue) return

        const text = cue.text
        const fontSize = 48
        const padding = 24

        ctx.save()
        ctx.globalAlpha = 1
        ctx.font = `bold ${fontSize}px "Noto Sans KR", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'

        // Word-wrap: split text into lines that fit canvas width
        const maxWidth = canvas.width - padding * 4
        const chars = text.split('')
        const drawLines = []
        let currentLine = ''
        for (const char of chars) {
          const testLine = currentLine + char
          if (ctx.measureText(testLine).width > maxWidth && currentLine) {
            drawLines.push(currentLine)
            currentLine = char
          } else {
            currentLine = testLine
          }
        }
        if (currentLine) drawLines.push(currentLine)

        const lineHeight = fontSize * 1.4
        const totalHeight = drawLines.length * lineHeight + padding * 2
        const boxWidth = Math.min(canvas.width - padding * 2, Math.max(...drawLines.map((l) => ctx.measureText(l).width)) + padding * 3)
        const boxX = (canvas.width - boxWidth) / 2

        // Position: upper = top area, lower = bottom area (raised higher to avoid Shorts UI)
        let boxY
        if (subtitlePos === 'upper') {
          boxY = 120
        } else {
          boxY = canvas.height - 280 - totalHeight
        }

        lastSubtitleBox = { y: boxY, height: totalHeight }

        // Draw background box (roundRect polyfill for mobile compatibility)
        ctx.fillStyle = subStyle.bg
        ctx.beginPath()
        if (ctx.roundRect) {
          ctx.roundRect(boxX, boxY, boxWidth, totalHeight, 16)
        } else {
          const r = 16
          ctx.moveTo(boxX + r, boxY)
          ctx.lineTo(boxX + boxWidth - r, boxY)
          ctx.arcTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + r, r)
          ctx.lineTo(boxX + boxWidth, boxY + totalHeight - r)
          ctx.arcTo(boxX + boxWidth, boxY + totalHeight, boxX + boxWidth - r, boxY + totalHeight, r)
          ctx.lineTo(boxX + r, boxY + totalHeight)
          ctx.arcTo(boxX, boxY + totalHeight, boxX, boxY + totalHeight - r, r)
          ctx.lineTo(boxX, boxY + r)
          ctx.arcTo(boxX, boxY, boxX + r, boxY, r)
          ctx.closePath()
        }
        ctx.fill()

        // Draw text with explicit color
        for (let i = 0; i < drawLines.length; i++) {
          ctx.fillStyle = subStyle.text
          const y = boxY + padding + i * lineHeight
          ctx.fillText(drawLines[i], canvas.width / 2, y)
        }

        ctx.restore()
      }

      // 5. Pre-draw first frame (black flash prevention)
      ctx.globalAlpha = 1
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      drawContain(segments[0].element, 0)

      // 6. Audio routing
      const audioDest = audioCtx.createMediaStreamDestination()
      let src = null // narration source (Mode A only)
      let bgmSrc = null

      if (audioMode === 'A') {
        // Mode A: narration audio
        const narrationGain = audioCtx.createGain()
        narrationGain.gain.setValueAtTime(1, audioCtx.currentTime)
        narrationGain.connect(audioDest)
        narrationGain.connect(audioCtx.destination)
        src = audioCtx.createBufferSource()
        src.buffer = audioBuffer
        src.connect(narrationGain)
      } else {
        // Mode B/C: capture video natural audio
        for (const m of loaded) {
          if (m.type === 'video') {
            try {
              const source = audioCtx.createMediaElementSource(m.element)
              const gain = audioCtx.createGain()
              gain.gain.value = originalVolume
              source.connect(gain)
              gain.connect(audioDest)
              gain.connect(audioCtx.destination)
            } catch (e) {
              console.warn('[영상] 비디오 오디오 캡처 실패:', e)
            }
          }
        }
        console.log('[영상] 자연음 모드 - 원본 음량:', Math.round(originalVolume * 100) + '%')
      }

      // BGM source (if uploaded)
      if (bgmUrl) {
        const bgmBuffer = await loadMusicBuffer(bgmUrl, audioCtx)
        if (bgmBuffer) {
          const bgmGain = audioCtx.createGain()
          bgmGain.gain.setValueAtTime(Math.min(bgmVolume, 0.5), audioCtx.currentTime)
          bgmGain.connect(audioDest)
          bgmGain.connect(audioCtx.destination)
          bgmSrc = audioCtx.createBufferSource()
          bgmSrc.buffer = bgmBuffer
          bgmSrc.loop = true // loop if music is shorter than narration
          bgmSrc.connect(bgmGain)
          console.log('[영상] BGM 적용됨')
        }
      }

      // 7. Recorder setup
      const FPS = 24
      const FRAME_MS = 1000 / FPS
      const captureStream = canvas.captureStream || canvas.mozCaptureStream
      if (!captureStream) throw new Error('이 브라우저에서는 영상 녹화가 지원되지 않습니다. Chrome 또는 Safari를 사용해주세요.')
      const stream = new MediaStream([
        ...captureStream.call(canvas, FPS).getVideoTracks(),
        ...audioDest.stream.getAudioTracks(),
      ])
      // Try MP4 first (Chrome 130+), then fallback to WebM
      const mp4Mime = 'video/mp4;codecs=avc1,mp4a.40.2'
      const mime = MediaRecorder.isTypeSupported(mp4Mime)
        ? mp4Mime
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm'
      const isMp4 = mime.startsWith('video/mp4')
      const blobType = isMp4 ? 'video/mp4' : 'video/webm'
      const rec = new MediaRecorder(stream, { mimeType: mime })
      const chunks = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      const donePromise = new Promise((resolve) => {
        rec.onstop = () => resolve({
          url: URL.createObjectURL(new Blob(chunks, { type: blobType })),
          format: isMp4 ? 'mp4' : 'webm'
        })
      })

      // 8. Start: recorder first, then audio after brief delay
      rec.start(1000)
      // Reset all videos to beginning (play is managed per-segment to avoid stutter)
      for (const s of segments) {
        if (s.type === 'video') { s.element.pause(); s.element.currentTime = 0 }
      }
      await new Promise((r) => setTimeout(r, 100))
      const audioStartTime = performance.now()
      if (src) src.start()
      if (bgmSrc) bgmSrc.start()
      // Only start the first segment's video
      if (segments[0].type === 'video') {
        segments[0].element.play().catch(() => {})
      }
      console.log('[영상] 녹화 시작')

      // 9. Render loop — use setTimeout for reliable mobile timing
      //    (requestAnimationFrame can be throttled/paused on mobile)
      //    Videos are managed per-segment: play on enter, pause on leave
      let activeSegIdx = 0
      let fadePreStarted = false

      await new Promise((resolve) => {
        function render() {
          const now = (performance.now() - audioStartTime) / 1000
          if (now >= totalDur + 0.3) { resolve(); return }
          const t = Math.max(0, Math.min(now, totalDur))

          // Find which segment we are in
          let idx = -1
          for (let i = 0; i < segments.length; i++) {
            if (t >= segments[i].start && t < segments[i].end) { idx = i; break }
          }
          if (idx === -1) idx = segments.length - 1

          // Handle segment transition — manage video play/pause
          if (idx !== activeSegIdx) {
            // Pause previous segment's video
            if (segments[activeSegIdx].type === 'video') {
              segments[activeSegIdx].element.pause()
            }
            // Start new segment's video (skip if already playing from crossfade pre-start)
            if (segments[idx].type === 'video' && segments[idx].element.paused) {
              segments[idx].element.currentTime = 0
              segments[idx].element.play().catch(() => {})
            }
            activeSegIdx = idx
            fadePreStarted = false
          }

          const seg = segments[idx]
          const segDur = seg.end - seg.start
          const tInSeg = t - seg.start

          // === RENDER: always black bg first, then layers ===
          ctx.globalAlpha = 1
          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          const segProgress = segDur > 0 ? tInSeg / segDur : 0 // 0~1 within segment

          if (segments.length === 1) {
            // Single file — just draw it
            ctx.globalAlpha = 1
            drawContain(seg.element, segProgress)
          } else {
            // Fade-out zone: last FADE seconds of current segment (except last segment)
            const inFadeOut = idx < segments.length - 1 && tInSeg > segDur - FADE

            if (inFadeOut) {
              const next = segments[idx + 1]
              const raw = (tInSeg - (segDur - FADE)) / FADE
              const p = easeInOut(Math.max(0, Math.min(raw, 1)))

              // Pre-start next video once when entering fade zone
              if (!fadePreStarted && next.type === 'video') {
                next.element.currentTime = 0
                next.element.play().catch(() => {})
                fadePreStarted = true
              }

              // Draw outgoing (fading out)
              ctx.globalAlpha = 1 - p
              drawContain(seg.element, segProgress)

              // Draw incoming (fading in)
              ctx.globalAlpha = p
              drawContain(next.element, 0)
            } else {
              // Not in any fade zone — draw current at full opacity
              ctx.globalAlpha = 1
              drawContain(seg.element, segProgress)
            }
          }

          // Always restore alpha
          ctx.globalAlpha = 1

          // Draw subtitle overlay
          drawSubtitle(t)

          // Draw title subtitle (농장 정보/광고) — Mode B/C, just above subtitle
          if (titleText) {
            const tFontSize = 48
            const tPadding = 24

            ctx.save()
            ctx.globalAlpha = 1
            ctx.font = `bold ${tFontSize}px "Noto Sans KR", sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'

            // Word-wrap
            const tMaxWidth = canvas.width - tPadding * 4
            const tChars = titleText.split('')
            const tLines = []
            let tCurLine = ''
            for (const ch of tChars) {
              const test = tCurLine + ch
              if (ctx.measureText(test).width > tMaxWidth && tCurLine) {
                tLines.push(tCurLine)
                tCurLine = ch
              } else {
                tCurLine = test
              }
            }
            if (tCurLine) tLines.push(tCurLine)

            const tLineHeight = tFontSize * 1.4
            const tTotalHeight = tLines.length * tLineHeight + tPadding * 2
            const tBoxWidth = Math.min(canvas.width - tPadding * 2, Math.max(...tLines.map(l => ctx.measureText(l).width)) + tPadding * 3)
            const tBoxX = (canvas.width - tBoxWidth) / 2

            // Position just above the subtitle (with 16px gap)
            let tBoxY
            if (lastSubtitleBox) {
              tBoxY = lastSubtitleBox.y - tTotalHeight - 16
            } else {
              // No subtitle visible — use default subtitle area as reference
              if (subtitlePos === 'upper') {
                tBoxY = 120 - tTotalHeight - 16
                if (tBoxY < 20) tBoxY = 20
              } else {
                tBoxY = canvas.height - 280 - tTotalHeight
              }
            }

            // Draw background box
            ctx.fillStyle = subStyle.bg
            ctx.beginPath()
            if (ctx.roundRect) {
              ctx.roundRect(tBoxX, tBoxY, tBoxWidth, tTotalHeight, 16)
            } else {
              const r = 16
              ctx.moveTo(tBoxX + r, tBoxY)
              ctx.lineTo(tBoxX + tBoxWidth - r, tBoxY)
              ctx.arcTo(tBoxX + tBoxWidth, tBoxY, tBoxX + tBoxWidth, tBoxY + r, r)
              ctx.lineTo(tBoxX + tBoxWidth, tBoxY + tTotalHeight - r)
              ctx.arcTo(tBoxX + tBoxWidth, tBoxY + tTotalHeight, tBoxX + tBoxWidth - r, tBoxY + tTotalHeight, r)
              ctx.lineTo(tBoxX + r, tBoxY + tTotalHeight)
              ctx.arcTo(tBoxX, tBoxY + tTotalHeight, tBoxX, tBoxY + tTotalHeight - r, r)
              ctx.lineTo(tBoxX, tBoxY + r)
              ctx.arcTo(tBoxX, tBoxY, tBoxX + r, tBoxY, r)
              ctx.closePath()
            }
            ctx.fill()

            // Draw text
            for (let i = 0; i < tLines.length; i++) {
              ctx.fillStyle = subStyle.text
              ctx.fillText(tLines[i], canvas.width / 2, tBoxY + tPadding + i * tLineHeight)
            }

            ctx.restore()
          }

          setTimeout(render, FRAME_MS)
        }
        setTimeout(render, FRAME_MS)
      })

      // 10. Cleanup
      rec.stop()
      if (src) src.stop()
      if (bgmSrc) try { bgmSrc.stop() } catch {}
      for (const s of segments) {
        if (s.type === 'video') { s.element.pause(); s.element.src = '' }
      }
      audioCtx.close()
      console.log('[영상] 녹화 완료, 인코딩 중...')

      const result = await donePromise
      set({ videoUrl: result.url, videoFormat: result.format })
      console.log('[영상] 영상 생성 완료')
    } catch (err) {
      console.error('[영상] 생성 실패:', err)
      alert(`영상 생성에 실패했습니다.\n${err?.message || String(err)}`)
    } finally {
      set({ isGeneratingVideo: false })
    }
  },

  reset: () =>
    set({
      step: 0,
      farmName: '',
      selectedCrops: [],
      region: '',
      photos: [],
      narration: '',
      audioUrl: null,
      videoUrl: null,
      videoFormat: 'mp4',
    }),
}))

export { CROPS }
export default useStore
