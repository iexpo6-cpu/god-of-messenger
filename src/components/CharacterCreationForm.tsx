
import React, { useState, useEffect } from 'react';
import { User as UserIcon, Loader2, Sword, School, GraduationCap, Medal, Baby, MapPin, CheckCircle, Shield, Crosshair, Flame, Zap, Target, Eye, Bomb, Sparkles, Cpu } from 'lucide-react';
import { WORLD_GEOGRAPHY, SCHOOL_CONFIG, COMBAT_STYLE_CONFIG } from '../constants';
import { Location, SchoolTier, SchoolData, SimpleStudent, CombatStyle } from '../types';
import { generateClassmates, optimizeImage } from '../utils';

interface CharacterCreationData {
  name: string;
  age: string;
  gender: string;
  race: string;
  nation: string;
  appearance: string;
  personality: string;
  combatStyle: CombatStyle;
  startingLevel: number;
  currentLocation?: Location;
  schoolData?: SchoolData;
  visualUrl?: string;
}

interface Props {
  onSubmit: (data: CharacterCreationData) => void;
  isLoading: boolean;
}

import { CHARACTER_PRESETS } from '../appearance';

const RACES = ["인간","엘프","수인","마인"];

// 국가별 대륙 매핑
const NATION_TO_CONTINENT: Record<string, string> = (() => {
    const map: Record<string, string> = {};
    Object.entries(WORLD_GEOGRAPHY).forEach(([region, data]) => {
        Object.keys(data).forEach(nationName => {
            map[nationName] = region;
        });
    });
    return map;
})();

// 현대 국가 리스트 (인간 전용)
const MODERN_NATIONS = (() => {
    const nations: string[] = [];
    const excludedRegions = ['마계', '신계', '실바나르', '페랄디아', '아비살론', '기타'];
    
    Object.entries(WORLD_GEOGRAPHY).forEach(([region, data]) => {
        if (!excludedRegions.includes(region)) {
            Object.keys(data).forEach(nationName => {
                if (!nations.includes(nationName)) {
                    nations.push(nationName);
                }
            });
        }
    });
    
    return nations.sort();
})();

const MBTI_OPTIONS = [
    "ISTJ (신중하고 성실함)",
    "ISFJ (용감하고 온화함)",
    "INFJ (통찰력 있고 신비함)",
    "INTJ (용의주도한 전략가)",
    "ISTP (만능 재주꾼)",
    "ISFP (호기심 많은 예술가)",
    "INFP (열정적인 중재자)",
    "INTP (논리적인 사색가)",
    "ESTP (모험을 즐기는 사업가)",
    "ESFP (자유로운 영혼)",
    "ENFP (재기발랄한 활동가)",
    "ENTP (뜨거운 논쟁을 즐김)",
    "ESTJ (엄격한 관리자)",
    "ESFJ (사교적인 외교관)",
    "ENFJ (정의로운 사회운동가)",
    "ENTJ (대담한 통솔자)"
];

const STARTING_OPTIONS = [
    {
        id: 'elementary',
        tier: 'Elementary' as SchoolTier,
        label: '초급 레귤러스 학교',
        subLabel: '11~13세',
        level: 1,
        desc: '갓 입학한 학생. 기초 체력과 무기 사용법을 배웁니다.',
        icon: Baby,
        ages: ['11세', '12세', '13세']
    },
    {
        id: 'middle',
        tier: 'Middle' as SchoolTier,
        label: '중급 레귤러스 학교',
        subLabel: '14~16세',
        level: 5,
        desc: '성장기. 실전 대련과 전술의 기초를 익힙니다.',
        icon: School,
        ages: ['14세', '15세', '16세']
    },
    {
        id: 'high',
        tier: 'High' as SchoolTier,
        label: '고급 레귤러스 학교',
        subLabel: '17~19세',
        level: 10,
        desc: '해방을 목표로 하는 고강도 훈련 과정입니다.',
        icon: GraduationCap,
        ages: ['17세', '18세', '19세']
    },
    {
        id: 'adult',
        tier: 'University' as SchoolTier,
        label: '성인 (졸업 이후)',
        subLabel: '20세 이상',
        level: 30,
        desc: '학교를 졸업하고 사회에 나선 상태입니다. (퍼스트 클래스 해방 가능)',
        icon: Medal,
        ages: ['20세', '21세', '22세', '23세', '24세', '25세']
    }
];

const STYLE_ICONS: Record<string, React.FC<any>> = {
    Sword,
    Crosshair,
    Flame,
    Zap,
    Target,
    Eye,
    Bomb,
    Sparkles,
    Cpu
};

const CharacterCreationForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<Omit<CharacterCreationData, 'startingLevel'>>({
    name: '김미남',
    age: '',
    gender: '남성',
    race: '인간',
    nation: '대한민국',
    appearance: '',
    personality: 'ISTJ (신중하고 성실함)', 
    combatStyle: undefined as unknown as CombatStyle,
    visualUrl: CHARACTER_PRESETS['아시아'][0].url,
  });

  const [isCustomVisual, setIsCustomVisual] = useState(false);
  const [customVisualUrl, setCustomVisualUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target?.result as string;
        // 이미지 최적화 (Firestore 1MB 제한 대비)
        const optimizedBase64 = await optimizeImage(base64);
        setCustomVisualUrl(optimizedBase64);
        setFormData({ ...formData, visualUrl: optimizedBase64 });
      } catch (error) {
        console.error('Image optimization failed:', error);
        alert('이미지 최적화 중 오류가 발생했습니다.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      alert('파일 읽기 중 오류가 발생했습니다.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const getAvailablePresets = () => {
      let presets: any[] = [];
      if (formData.race === '마인') presets = CHARACTER_PRESETS['마계'] || CHARACTER_PRESETS['기타'];
      else if (formData.race === '엘프') presets = CHARACTER_PRESETS['엘프'] || CHARACTER_PRESETS['기타'];
      else if (formData.race === '수인') presets = CHARACTER_PRESETS['수인'] || CHARACTER_PRESETS['기타'];
      else {
          const continent = NATION_TO_CONTINENT[formData.nation] || '기타';
          presets = CHARACTER_PRESETS[continent as keyof typeof CHARACTER_PRESETS] || CHARACTER_PRESETS['기타'];
      }
      
      const genderKey = formData.gender === '남성' ? '_m' : formData.gender === '여성' ? '_f' : '';
      if (genderKey) {
          const filtered = presets.filter(p => p.id.includes(genderKey));
          if (filtered.length > 0) return filtered;
      }
      return presets;
  };

  const currentPresets = getAvailablePresets();

  const [selectedOptionId, setSelectedOptionId] = useState<string>('elementary');
  const [customNation, setCustomNation] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');

  const currentOption = STARTING_OPTIONS.find(o => o.id === selectedOptionId)!;

  // 종족 변경 시 국가 강제 설정
  useEffect(() => {
    let newNation = formData.nation;
    let newVisualUrl = formData.visualUrl;
    let changed = false;

    if (formData.race === '마인' && formData.nation !== '네크로디움 제국') {
        newNation = '네크로디움 제국';
        newVisualUrl = (CHARACTER_PRESETS['마계'] || CHARACTER_PRESETS['기타'])[0].url;
        changed = true;
    } else if (formData.race === '엘프' && formData.nation !== '미르탈 숲연합') {
        newNation = '미르탈 숲연합';
        newVisualUrl = (CHARACTER_PRESETS['엘프'] || CHARACTER_PRESETS['기타'])[0].url;
        changed = true;
    } else if (formData.race === '수인' && formData.nation !== '레오니스 투기국') {
        newNation = '레오니스 투기국';
        newVisualUrl = (CHARACTER_PRESETS['수인'] || CHARACTER_PRESETS['기타'])[0].url;
        changed = true;
    } else if (formData.race === '인간') {
        if (['미르탈 숲연합', '레오니스 투기국', '네크로디움 제국'].includes(formData.nation)) {
            newNation = '대한민국';
            newVisualUrl = (CHARACTER_PRESETS['아시아'] || CHARACTER_PRESETS['기타'])[0].url;
            changed = true;
        }
    }
    
    if (changed) {
        setFormData(prev => ({ ...prev, nation: newNation, visualUrl: newVisualUrl }));
    }
  }, [formData.race, formData.nation]);

  // 국가 변경 시 도시 목록 업데이트 및 외형 초기화
  useEffect(() => {
      let cities: string[] = [];
      for (const regionKey in WORLD_GEOGRAPHY) {
          const nations = WORLD_GEOGRAPHY[regionKey];
          if (nations[formData.nation]) {
              cities = nations[formData.nation].cities;
              break;
          }
      }
      if (cities.length === 0 && formData.nation === '대한민국') {
          cities = ["서울", "부산", "인천", "대구", "대전", "광주"];
      }
      setAvailableCities(cities);
      if (cities.length > 0) setSelectedCity(cities[0]);
      else setSelectedCity('');

      // 국가 변경 시 해당 대륙의 첫 번째 외형으로 초기화
      const continent = NATION_TO_CONTINENT[formData.nation] || '기타';
      const presets = CHARACTER_PRESETS[continent as keyof typeof CHARACTER_PRESETS] || CHARACTER_PRESETS['기타'];
      const newVisualUrl = presets[0].url;
      if (formData.visualUrl !== newVisualUrl) {
          setFormData(prev => ({ ...prev, visualUrl: newVisualUrl }));
      }
  }, [formData.nation]);

  useEffect(() => {
      setFormData(prev => ({ 
          ...prev, 
          age: currentOption.ages[0],
          combatStyle: currentOption.tier !== 'University' ? (undefined as unknown as CombatStyle) : prev.combatStyle
      }));
  }, [selectedOptionId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.age) {
        setFormData(prev => ({ ...prev, age: currentOption.ages[0] }));
    }
    const finalNation = formData.nation === '기타(직접입력)' ? customNation : formData.nation;
    
    let region = "아시아"; 
    for (const r in WORLD_GEOGRAPHY) {
        if (WORLD_GEOGRAPHY[r][finalNation]) {
            region = r;
            break;
        }
    }
    
    const finalCity = selectedCity || "알 수 없음";

    const location: Location = {
        region: region,
        nation: finalNation,
        city: finalCity
    };

    let schoolData: SchoolData | undefined;
    if (currentOption.tier !== 'University') {
        const ageNum = parseInt(formData.age.replace(/[^0-9]/g, '')) || 11;
        const config = SCHOOL_CONFIG[currentOption.tier];
        const grade = Math.min(3, Math.max(1, ageNum - config.minAge + 1));
        
        schoolData = {
            tier: currentOption.tier,
            grade: grade,
            classNumber: Math.floor(Math.random() * 5) + 1,
            semester: 1,
            examsPassed: 0,
            classmates: generateClassmates(finalNation, 14, currentOption.tier, grade), 
            rank: 15, 
            reputation: 0,
            isGraduated: false,
            schoolName: `${finalCity} ${currentOption.label}`, 
            midtermPassed: false,
            finalPassed: false
        };
    }

    onSubmit({ 
        ...formData, 
        age: formData.age || currentOption.ages[0],
        nation: finalNation,
        startingLevel: currentOption.level,
        currentLocation: location,
        schoolData: schoolData
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4 font-sans text-slate-200">
        <div className="w-full max-w-4xl bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900/50 p-6 border-b border-slate-700 text-center shrink-0">
                <h2 className="text-3xl font-cinzel text-amber-500 mb-2">Character Creation</h2>
                <p className="text-slate-400">당신의 전설이 시작될 인적 사항을 기록하세요.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-slate-100 flex items-center">
                            <UserIcon className="mr-2 text-amber-500" /> 캐릭터 외형 선택 (Visual)
                        </h3>
                        <button 
                            type="button"
                            onClick={() => setIsCustomVisual(!isCustomVisual)}
                            className={`text-xs px-3 py-1 rounded-full border transition-all ${isCustomVisual ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}
                        >
                            {isCustomVisual ? '프리셋 선택으로 돌아가기' : '커스텀 URL 직접 등록'}
                        </button>
                    </div>

                    {isCustomVisual ? (
                        <div className="p-6 bg-slate-950/50 rounded-xl border border-amber-500/30 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs uppercase text-slate-500 mb-2 font-bold">이미지 URL (HTTPS 권장)</label>
                            <div className="flex gap-4 items-start">
                                <div className="w-24 h-32 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                                    {customVisualUrl ? (
                                        <img src={customVisualUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setCustomVisualUrl('')} />
                                    ) : (
                                        <UserIcon size={32} className="text-slate-700" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            className="flex-1 bg-slate-950 border border-slate-600 rounded p-3 focus:border-amber-500 focus:outline-none text-sm"
                                            placeholder="https://example.com/image.png"
                                            value={customVisualUrl}
                                            onChange={(e) => {
                                                setCustomVisualUrl(e.target.value);
                                                setFormData({ ...formData, visualUrl: e.target.value });
                                            }}
                                        />
                                        <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded px-4 flex items-center justify-center transition-colors shrink-0">
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                disabled={isUploading}
                                            />
                                            <span className="text-xs font-bold text-slate-200">
                                                {isUploading ? '업로드 중...' : '파일 업로드'}
                                            </span>
                                        </label>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">
                                        * 외부 이미지 URL을 입력하거나 직접 이미지 파일을 업로드할 수 있습니다.<br/>
                                        * 투명 배경(PNG) 이미지를 권장하며, 파일 크기는 10MB 이하여야 합니다. (자동 최적화됨)
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-64 overflow-y-auto p-3 bg-slate-950/50 rounded-xl border border-slate-700 custom-scrollbar">
                            {currentPresets.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, visualUrl: preset.url })}
                                    className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all group ${
                                        formData.visualUrl === preset.url 
                                        ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] scale-105 z-10' 
                                        : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                                    }`}
                                >
                                    <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                                    <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end p-1 transition-opacity ${formData.visualUrl === preset.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <span className="text-[8px] font-bold text-amber-400 truncate w-full leading-tight">{preset.label}</span>
                                    </div>
                                    {formData.visualUrl === preset.url && (
                                        <div className="absolute top-0.5 right-0.5 bg-amber-500 text-slate-900 rounded-full p-0.5">
                                            <CheckCircle size={10} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center">
                        <School className="mr-2 text-amber-500" /> 시작 시점 (연령대)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {STARTING_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const isSelected = selectedOptionId === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setSelectedOptionId(option.id)}
                                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 flex flex-col h-full ${
                                        isSelected 
                                        ? 'bg-amber-900/30 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                                        : 'bg-slate-900 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`p-2 rounded-full ${isSelected ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-400'}`}>
                                            <Icon size={20} />
                                        </div>
                                        <span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-slate-300">
                                            Lv.{option.level}
                                        </span>
                                    </div>
                                    <h4 className={`font-bold ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                                        {option.label}
                                    </h4>
                                    <span className="text-xs text-slate-400 font-bold mb-2 block">{option.subLabel}</span>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-auto">
                                        {option.desc}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {currentOption.tier === 'University' ? (
                    <section>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
                            <h3 className="text-xl font-bold text-slate-100 flex items-center">
                                <Sword className="mr-2 text-amber-500" /> 전투 계열 (Combat Style)
                            </h3>
                            <span className="text-xs text-amber-400 font-semibold bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-full w-fit">
                                ✨ 특화 무기 장착 시 물리/마법 공격력 +10%
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Object.values(COMBAT_STYLE_CONFIG).filter(cfg => cfg.tier === 1).map((cfg) => {
                                const IconComponent = STYLE_ICONS[cfg.iconName] || Sword;
                                const isSelected = formData.combatStyle === cfg.style;
                                return (
                                    <button
                                        key={cfg.style}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, combatStyle: cfg.style })}
                                        className={`relative p-3.5 rounded-xl border-2 text-left transition-all duration-200 flex flex-col justify-between ${
                                            isSelected 
                                            ? `${cfg.bgColor} ${cfg.borderColor} shadow-[0_0_15px_rgba(245,158,11,0.25)] scale-[1.02] z-10` 
                                            : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                                                    <IconComponent size={18} />
                                                </div>
                                                <div>
                                                    <h4 className={`font-bold text-sm ${isSelected ? cfg.color : 'text-slate-200'}`}>
                                                        {cfg.label}
                                                    </h4>
                                                    <span className="text-[11px] text-amber-300/90 font-medium">
                                                        {cfg.specialtyText}
                                                    </span>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className="bg-amber-500 text-slate-900 rounded-full p-0.5">
                                                    <CheckCircle size={14} />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                                            {cfg.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ) : (
                    <section className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <GraduationCap size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-200">미성년자 전투 계열 미설정</h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                                미성년자(학생)는 학교에서 기초 수련을 거치며 성장합니다. 성인 졸업 이후 또는 학교 활동을 통해 전투 계열을 자유롭게 선택 및 해방할 수 있습니다.
                            </p>
                        </div>
                    </section>
                )}

                <section className="bg-slate-900/30 p-6 rounded-xl border border-slate-700/50">
                    <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center"><UserIcon className="mr-2 text-amber-500" /> 상세 정보</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs uppercase text-slate-500 mb-1">이름</label>
                            <input required type="text" className="w-full bg-slate-950 border border-slate-600 rounded p-3 focus:border-amber-500 focus:outline-none" 
                                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="캐릭터 이름" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs uppercase text-slate-500 mb-1">나이 (선택)</label>
                                <select 
                                    className="w-full bg-slate-950 border border-slate-600 rounded p-3 focus:border-amber-500 focus:outline-none text-amber-200 font-bold"
                                    value={formData.age} 
                                    onChange={e => setFormData({...formData, age: e.target.value})}
                                >
                                    {currentOption.ages.map(age => (
                                        <option key={age} value={age}>{age}</option>
                                    ))}
                                </select>
                             </div>
                             <div>
                                <label className="block text-xs uppercase text-slate-500 mb-1">성별</label>
                                <select className="w-full bg-slate-950 border border-slate-600 rounded p-3 focus:border-amber-500 focus:outline-none"
                                    value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                                    <option>남성</option>
                                    <option>여성</option>
                                    <option>기타</option>
                                </select>
                             </div>
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-slate-500 mb-1 font-bold">종족 (Race)</label>
                            <select className="w-full bg-slate-950 border border-amber-500/30 rounded p-3 focus:border-amber-500 focus:outline-none text-amber-100 font-bold"
                                value={formData.race} onChange={e => setFormData({...formData, race: e.target.value})}>
                                {RACES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-xs uppercase text-slate-500 mb-1 font-bold">국가 (Nation)</label>
                            <div className="flex gap-2">
                                <select 
                                    className={`w-full bg-slate-950 border border-slate-600 rounded p-3 focus:border-amber-500 focus:outline-none ${formData.race !== '인간' ? 'opacity-70 cursor-not-allowed bg-slate-900' : ''}`}
                                    value={formData.nation} 
                                    onChange={e => setFormData({...formData, nation: e.target.value})}
                                    disabled={formData.race !== '인간'}
                                >
                                    {formData.race === '인간' ? (
                                        MODERN_NATIONS.map(n => <option key={n} value={n}>{n}</option>)
                                    ) : (
                                        <option value={formData.nation}>{formData.nation}</option>
                                    )}
                                </select>
                            </div>
                            {formData.race !== '인간' && (
                                <p className="text-[10px] text-amber-500/70 mt-1 font-bold italic">* {formData.race} 종족은 전용 국가로 거주지가 고정됩니다.</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-slate-500 mb-1">시작 도시 (거주지)</label>
                            {availableCities.length > 0 ? (
                                <div className="relative">
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-600 rounded p-3 focus:border-amber-500 focus:outline-none pl-10"
                                        value={selectedCity} 
                                        onChange={e => setSelectedCity(e.target.value)}
                                    >
                                        {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                                    </select>
                                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                </div>
                            ) : (
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-950 border border-slate-600 rounded p-3 focus:border-amber-500 focus:outline-none" 
                                    value={selectedCity} 
                                    onChange={e => setSelectedCity(e.target.value)} 
                                    placeholder="도시 이름 입력" 
                                />
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs uppercase text-slate-500 mb-1">외모 묘사</label>
                            <input type="text" className="w-full bg-slate-950 border border-slate-600 rounded p-3 focus:border-amber-500 focus:outline-none" 
                                value={formData.appearance} onChange={e => setFormData({...formData, appearance: e.target.value})} placeholder="예: 흑발의 차분한 인상, 오른쪽 눈가에 흉터" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs uppercase text-slate-500 mb-1">성격 및 특징 (MBTI)</label>
                            <select 
                                className="w-full bg-slate-950 border border-slate-600 rounded p-3 focus:border-amber-500 focus:outline-none"
                                value={formData.personality} 
                                onChange={e => setFormData({...formData, personality: e.target.value})}
                            >
                                {MBTI_OPTIONS.map(mbti => (
                                    <option key={mbti} value={mbti}>{mbti}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>
            </form>

            <div className="p-6 border-t border-slate-700 bg-slate-900/80 flex justify-end shrink-0">
                <button 
                    onClick={handleSubmit}
                    disabled={isLoading || !formData.name || !selectedCity}
                    className="bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="animate-spin mr-2" /> 세계를 생성하는 중...
                        </>
                    ) : (
                        <>
                            캐릭터 생성 완료 (Start) <Sword className="ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
    </div>
  );
};

export default CharacterCreationForm;
