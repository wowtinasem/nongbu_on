import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { createReadStream, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import ffmpeg from 'fluent-ffmpeg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = join(__dirname, '../uploads')
const OUTPUT_DIR = join(__dirname, '../output')

if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

const app = express()
app.use(cors())
app.use(express.json())

const upload = multer({ dest: UPLOAD_DIR })

// Gemini API - Narration Generation (API key from client request)
app.post('/api/narration', async (req, res) => {
  try {
    const { farmName, crops, region, photoCount, apiKey, userPrompt } = req.body

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API 키가 필요합니다' })
    }

    const userSection = userPrompt
      ? `\n\n농부가 전하고 싶은 이야기:\n${userPrompt}\n위 내용을 반드시 나레이션에 자연스럽게 반영해주세요.`
      : ''

    const prompt = `당신은 한국 농업 전문 숏폼 영상 나레이션 작가입니다.
다음 농장 정보를 바탕으로 60초 이내의 숏폼 영상 나레이션을 작성해주세요.

농장 이름: ${farmName}
재배 작물: ${crops.join(', ')}
지역: ${region}
사진 수: ${photoCount}장${userSection}

요구사항:
- 따뜻하고 정감 있는 한국어 구어체
- 농부의 자부심과 정성이 느껴지는 톤
- 시청자에게 신뢰감을 주는 내용
- 사진이 ${photoCount}장이므로 각 사진에 맞는 장면 전환을 자연스럽게 녹여주세요
- 60초 분량 (약 200~250자)
- 나레이션 텍스트만 출력 (부연 설명 없이)`

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1024,
        },
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      const msg = errData.error?.message || `API 오류 (${response.status})`
      throw new Error(msg)
    }

    const result = await response.json()
    const narration = result.candidates[0].content.parts[0].text
    res.json({ narration })
  } catch (err) {
    console.error('Narration error:', err)
    res.status(500).json({ error: err.message || '나레이션 생성 실패' })
  }
})

// Gemini TTS - Audio Generation (API key from client request)
function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = pcmBuffer.length
  const wavBuffer = Buffer.alloc(44 + dataSize)

  wavBuffer.write('RIFF', 0)
  wavBuffer.writeUInt32LE(36 + dataSize, 4)
  wavBuffer.write('WAVE', 8)
  wavBuffer.write('fmt ', 12)
  wavBuffer.writeUInt32LE(16, 16)
  wavBuffer.writeUInt16LE(1, 20)
  wavBuffer.writeUInt16LE(numChannels, 22)
  wavBuffer.writeUInt32LE(sampleRate, 24)
  wavBuffer.writeUInt32LE(byteRate, 28)
  wavBuffer.writeUInt16LE(blockAlign, 32)
  wavBuffer.writeUInt16LE(bitsPerSample, 34)
  wavBuffer.write('data', 36)
  wavBuffer.writeUInt32LE(dataSize, 40)
  pcmBuffer.copy(wavBuffer, 44)

  return wavBuffer
}

app.post('/api/tts', async (req, res) => {
  try {
    const { text, apiKey, voiceName = 'Sulafat' } = req.body

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API 키가 필요합니다' })
    }

    const ttsUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`

    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini TTS ${response.status}: ${errText}`)
    }

    const result = await response.json()
    const audioBase64 = result.candidates[0].content.parts[0].inlineData.data
    const pcmBuffer = Buffer.from(audioBase64, 'base64')
    const wavBuffer = pcmToWav(pcmBuffer)

    res.set('Content-Type', 'audio/wav')
    res.send(wavBuffer)
  } catch (err) {
    console.error('TTS error:', err)
    res.status(500).json({ error: '음성 생성 실패' })
  }
})

// Video Generation - Combine photos + audio into MP4
app.post('/api/video', upload.fields([
  { name: 'photos', maxCount: 10 },
  { name: 'audio', maxCount: 1 },
]), async (req, res) => {
  const photoFiles = req.files['photos'] || []
  const audioFile = req.files['audio']?.[0]

  if (!photoFiles.length || !audioFile) {
    return res.status(400).json({ error: '사진과 음성 파일이 필요합니다' })
  }

  const outputPath = join(OUTPUT_DIR, `video_${Date.now()}.mp4`)
  const concatFile = join(UPLOAD_DIR, `concat_${Date.now()}.txt`)

  try {
    // Get audio duration to calculate per-image duration
    const audioDuration = await getAudioDuration(audioFile.path)
    const durationPerImage = Math.max(2, audioDuration / photoFiles.length)

    // Create concat file for ffmpeg
    const concatContent = photoFiles
      .map((f) => `file '${f.path.replace(/\\/g, '/')}'\nduration ${durationPerImage}`)
      .join('\n')
      + `\nfile '${photoFiles[photoFiles.length - 1].path.replace(/\\/g, '/')}'`

    writeFileSync(concatFile, concatContent)

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .input(audioFile.path)
        .outputOptions([
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-shortest',
          '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
          '-r', '30',
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run()
    })

    res.download(outputPath, 'nongbu_on_video.mp4', () => {
      // Cleanup
      try {
        unlinkSync(outputPath)
        unlinkSync(concatFile)
        photoFiles.forEach((f) => unlinkSync(f.path))
        unlinkSync(audioFile.path)
      } catch {}
    })
  } catch (err) {
    console.error('Video error:', err)
    // Cleanup on error
    try {
      if (existsSync(concatFile)) unlinkSync(concatFile)
      photoFiles.forEach((f) => { try { unlinkSync(f.path) } catch {} })
      if (audioFile) try { unlinkSync(audioFile.path) } catch {}
    } catch {}
    res.status(500).json({ error: '영상 생성 실패' })
  }
})

function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err)
      resolve(metadata.format.duration || 30)
    })
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🌾 농부ON 서버가 포트 ${PORT}에서 실행 중입니다`)
})
