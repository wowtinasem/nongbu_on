import { useState, useEffect } from 'react'
import { FiCheck } from 'react-icons/fi'
import useStore from '../store'

const PROVINCES = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시',
  '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도',
  '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도',
  '경상남도', '제주특별자치도',
]

const CITIES = {
  '서울특별시': ['종로구','중구','용산구','성동구','광진구','동대문구','중랑구','성북구','강북구','도봉구','노원구','은평구','서대문구','마포구','양천구','강서구','구로구','금천구','영등포구','동작구','관악구','서초구','강남구','송파구','강동구'],
  '부산광역시': ['중구','서구','동구','영도구','부산진구','동래구','남구','북구','해운대구','사하구','금정구','강서구','연제구','수영구','사상구','기장군'],
  '대구광역시': ['중구','동구','서구','남구','북구','수성구','달서구','달성군'],
  '인천광역시': ['중구','동구','미추홀구','연수구','남동구','부평구','계양구','서구','강화군','옹진군'],
  '광주광역시': ['동구','서구','남구','북구','광산구'],
  '대전광역시': ['동구','중구','서구','유성구','대덕구'],
  '울산광역시': ['중구','남구','동구','북구','울주군'],
  '세종특별자치시': ['세종시'],
  '경기도': ['수원시','성남시','용인시','부천시','안산시','안양시','남양주시','화성시','평택시','의정부시','시흥시','파주시','김포시','광명시','광주시','군포시','하남시','오산시','이천시','안성시','의왕시','양평군','여주시','동두천시','과천시','가평군','연천군'],
  '강원특별자치도': ['춘천시','원주시','강릉시','동해시','태백시','속초시','삼척시','홍천군','횡성군','영월군','평창군','정선군','철원군','화천군','양구군','인제군','고성군','양양군'],
  '충청북도': ['청주시','충주시','제천시','보은군','옥천군','영동군','증평군','진천군','괴산군','음성군','단양군'],
  '충청남도': ['천안시','공주시','보령시','아산시','서산시','논산시','계룡시','당진시','금산군','부여군','서천군','청양군','홍성군','예산군','태안군'],
  '전북특별자치도': ['전주시','군산시','익산시','정읍시','남원시','김제시','완주군','진안군','무주군','장수군','임실군','순창군','고창군','부안군'],
  '전라남도': ['목포시','여수시','순천시','나주시','광양시','담양군','곡성군','구례군','고흥군','보성군','화순군','장흥군','강진군','해남군','영암군','무안군','함평군','영광군','장성군','완도군','진도군','신안군'],
  '경상북도': ['포항시','경주시','김천시','안동시','구미시','영주시','영천시','상주시','문경시','경산시','군위군','의성군','청송군','영양군','영덕군','청도군','고령군','성주군','칠곡군','예천군','봉화군','울진군','울릉군'],
  '경상남도': ['창원시','진주시','통영시','사천시','김해시','밀양시','거제시','양산시','의령군','함안군','창녕군','고성군','남해군','하동군','산청군','함양군','거창군','합천군'],
  '제주특별자치도': ['제주시','서귀포시'],
}

export default function FarmProfileSetup() {
  const farmProfile = useStore((s) => s.farmProfile)
  const setFarmProfile = useStore((s) => s.setFarmProfile)
  const closeProfileSetup = useStore((s) => s.closeProfileSetup)

  const [farmName, setFarmName] = useState('')
  const [crops, setCrops] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [town, setTown] = useState('')
  const [guideline, setGuideline] = useState('')
  const [error, setError] = useState('')

  // Pre-fill from existing profile
  useEffect(() => {
    if (farmProfile) {
      setFarmName(farmProfile.farmName || '')
      setCrops(farmProfile.crops || '')
      setGuideline(farmProfile.guideline || '')
      setProvince(farmProfile.region?.도 || '')
      setCity(farmProfile.region?.시군구 || '')
      setTown(farmProfile.region?.읍면동 || '')
    }
  }, [farmProfile])

  // Reset city/town when province changes
  const handleProvinceChange = (val) => {
    setProvince(val)
    setCity('')
    setTown('')
  }

  const handleCityChange = (val) => {
    setCity(val)
    setTown('')
  }

  const handleSave = () => {
    if (!farmName.trim()) {
      setError('농장 이름을 입력해주세요')
      return
    }
    setError('')
    setFarmProfile({
      farmName: farmName.trim(),
      crops: crops.trim(),
      guideline: guideline.trim(),
      region: {
        도: province,
        시군구: city,
        읍면동: town,
      },
    })
  }

  const isEditing = !!farmProfile
  const cityOptions = province ? (CITIES[province] || []) : []

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="bg-green-main text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-point rounded-full flex items-center justify-center text-xl">
              🌾
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">농부ON</h1>
              <p className="text-xs text-green-100 opacity-80">농장 프로필 설정</p>
            </div>
          </div>
          {isEditing && (
            <button
              onClick={closeProfileSetup}
              className="text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition"
            >
              취소
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-green-main">
            {isEditing ? '농장 프로필 수정' : '농장 프로필을 등록해주세요'}
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            {isEditing
              ? '수정된 정보는 다음 나레이션 생성부터 반영됩니다'
              : '최초 1회만 입력하면 나레이션 생성에 자동으로 활용됩니다'}
          </p>
        </div>

        <div className="space-y-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          {/* Farm Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              농장 이름 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={farmName}
              onChange={(e) => { setFarmName(e.target.value); setError('') }}
              placeholder="예) 정성농원, 해피팜"
              className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition text-lg ${
                error ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-green-main'
              }`}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* Crops */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              재배 작물
            </label>
            <input
              type="text"
              value={crops}
              onChange={(e) => setCrops(e.target.value)}
              placeholder="예) 사과, 홍로, 미얀마부사"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-main focus:outline-none transition text-base"
            />
            <p className="text-xs text-gray-400 mt-1">쉼표(,)로 구분하여 여러 개 입력 가능</p>
          </div>

          {/* Farm Guideline */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              농장 소개 지침
            </label>
            <textarea
              value={guideline}
              onChange={(e) => setGuideline(e.target.value)}
              placeholder={"예) 봄에는 딸기 수확, 여름에는 복숭아 판매, 가을에는 사과 따기 체험 운영.\n직거래 택배 가능, 전화주문 환영.\n올해는 홍로 사과가 특히 잘 됨."}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-main focus:outline-none transition text-base resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-400 mt-1">계절별 주력 작물, 판매 방식, 홍보 포인트 등을 자유롭게 작성하세요. 나레이션 생성 시 AI가 참고합니다.</p>
          </div>

          {/* Region - 3 levels */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              지역 선택
            </label>

            {/* Level 1: Province */}
            <div>
              <p className="text-xs text-gray-400 mb-1.5">도 / 광역시</p>
              <select
                value={province}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-main focus:outline-none transition text-base bg-white appearance-none"
              >
                <option value="">선택해주세요</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Level 2: City */}
            <div>
              <p className="text-xs text-gray-400 mb-1.5">시 / 군 / 구</p>
              <select
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                disabled={!province}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-main focus:outline-none transition text-base bg-white disabled:opacity-50 disabled:bg-gray-50 appearance-none"
              >
                <option value="">{province ? '선택해주세요' : '도/광역시를 먼저 선택'}</option>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Level 3: Town (optional) */}
            <div>
              <p className="text-xs text-gray-400 mb-1.5">
                읍 / 면 / 동 <span className="text-gray-300">(선택사항)</span>
              </p>
              <input
                type="text"
                value={town}
                onChange={(e) => setTown(e.target.value)}
                disabled={!city}
                placeholder="예) 삽교읍, 신암면"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-main focus:outline-none transition text-base disabled:opacity-50 disabled:bg-gray-50"
              />
            </div>

            {/* Selected region preview */}
            {province && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                <FiCheck className="text-green-main text-sm" />
                <span className="text-sm text-green-main font-medium">
                  {[province, city, town].filter(Boolean).join(' ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full mt-8 py-4 bg-orange-point text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-orange-dark transition-all shadow-lg shadow-orange-point/20"
        >
          {isEditing ? '프로필 저장하기' : '농부ON 시작하기'}
        </button>
      </main>

      <footer className="text-center text-sm text-gray-400 py-4">
        &copy; 2026 농부ON. 농부를 위한 숏폼 영상 제작 서비스
      </footer>
    </div>
  )
}
