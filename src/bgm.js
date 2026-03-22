// CC0 licensed background music from Pixabay
// Free for commercial use, YouTube uploads, no attribution required

export const MUSIC_LIST = [
  {
    id: 1,
    name: '들판의 아침',
    emoji: '\uD83C\uDF3E',
    mood: '잔잔하고 따뜻한',
    recommended: true,
    url: 'https://cdn.pixabay.com/audio/2022/02/22/audio_d1718ab41b.mp3',
  },
  {
    id: 2,
    name: '수확의 기쁨',
    emoji: '\uD83C\uDF4E',
    mood: '밝고 경쾌한',
    recommended: false,
    url: 'https://cdn.pixabay.com/audio/2022/10/14/audio_2fb16340c5.mp3',
  },
  {
    id: 3,
    name: '봄날 산책',
    emoji: '\uD83C\uDF38',
    mood: '맑고 청량한',
    recommended: false,
    url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
  },
  {
    id: 4,
    name: '자연의 숨결',
    emoji: '\uD83C\uDF3F',
    mood: '힐링, 명상적',
    recommended: false,
    url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
  },
  {
    id: 5,
    name: '신나는 숏츠',
    emoji: '\uD83C\uDFB5',
    mood: '트렌디하고 활기찬',
    recommended: false,
    url: 'https://cdn.pixabay.com/audio/2023/07/11/audio_dc0db12035.mp3',
  },
  {
    id: 6,
    name: '가을 감성',
    emoji: '\uD83C\uDF42',
    mood: '감성적이고 서정적',
    recommended: false,
    url: 'https://cdn.pixabay.com/audio/2023/09/04/audio_24430eafae.mp3',
  },
  {
    id: 0,
    name: '음악 없음',
    emoji: '\uD83D\uDD07',
    mood: '나레이션만 사용',
    recommended: false,
    url: null,
  },
]

/**
 * Load a music URL into an AudioBuffer.
 * Returns null on failure (video continues without BGM).
 */
export async function loadMusicBuffer(url, audioContext) {
  if (!url) return null
  try {
    console.log('[BGM] 배경음악 로드 시작:', url)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const arrayBuffer = await res.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    console.log('[BGM] 로드 완료, 길이:', audioBuffer.duration.toFixed(1), '초')
    return audioBuffer
  } catch (e) {
    console.warn('[BGM] 배경음악 로드 실패, 음악 없이 진행:', e)
    return null
  }
}
