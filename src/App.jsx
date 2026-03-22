import useStore from './store'
import Header from './components/Header'
import Stepper from './components/Stepper'
import Onboarding from './components/Onboarding'
import PhotoUpload from './components/PhotoUpload'
import Narration from './components/Narration'
import AudioGenerate from './components/AudioGenerate'
import Download from './components/Download'
import FarmProfileSetup from './components/FarmProfileSetup'

const STEPS = [
  { label: '농장 정보', component: Onboarding },
  { label: '사진 업로드', component: PhotoUpload },
  { label: '나레이션', component: Narration },
  { label: '음성 생성', component: AudioGenerate },
  { label: '다운로드', component: Download },
]

export default function App() {
  const step = useStore((s) => s.step)
  const farmProfile = useStore((s) => s.farmProfile)
  const showProfileSetup = useStore((s) => s.showProfileSetup)
  const StepComponent = STEPS[step].component

  const isSetup = !farmProfile || showProfileSetup

  return (
    <div className="min-h-screen flex flex-col">
      {isSetup ? (
        <FarmProfileSetup />
      ) : (
        <>
          <Header />
          <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
            <Stepper steps={STEPS} current={step} />
            <div className="mt-8">
              <StepComponent />
            </div>
          </main>
        </>
      )}
      <footer className="text-center text-sm text-gray-400 py-4 mt-auto space-y-1">
        <p>이 앱은 괴산군 정보화 농부님들을 위해 제작되었습니다.</p>
        <p>&copy; 2026 농부ON. 농부를 위한 숏폼 영상 제작 서비스</p>
      </footer>
      <a
        href="https://ykhprofile-site.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-green-main hover:bg-green-700 transition py-3 text-center text-white font-semibold text-sm"
      >
        사용 · 제작 · 강의 문의
      </a>
    </div>
  )
}
