
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT, INITIAL_CHARACTER, FACILITIES_INFO, SHINRYOKU_TYPES_LIST, MILITARY_SALARY, QUEST_DANGER_INDEX, STATUS_AILMENTS_LIST, WORLD_GEOGRAPHY } from "../constants";
import { Character, GameResponse, ClassTier, SkillType, Companion, CombatState, CapturedMonster, Quest, MercenaryRank, JobType, MilitaryRank, TempleVisitor, VisitorDisposition, Criminal, SimpleStudent, WorldReaction, NewsArticle, InterviewData, WeaponType } from "../types";
import { calculateTotalStats, calculateFinalStats, generateLocalItemName, generateLocalOptions } from '../utils';
import { generateLocalReactions, generateLocalNews } from '../article';
import { generateLocalInterview } from '../interviewdata';
import { DETAILED_BOSSES, ASIA_BOSSES, EUROPE_BOSSES, AMERICA_BOSSES, AFRICA_BOSSES, DIVINE_REALM_BOSSES, FANTASY_BOSSES } from '../bossMonsters';
import { SEASONAL_BOSSES, SEASONAL_BOSS_CONFIG } from '../mythicbossmonsters';
import { buildRelationContextForDialogue, RELATION_DIALOGUE_GUIDELINES } from './dialogueRelationService';

/**
 * 가이드라인에 따라 API 호출 직전에 새로운 인스턴스를 생성합니다.
 */
const getAi = () => {
  const manualKey = localStorage.getItem('shinryoku_manual_api_key');
  const apiKey = manualKey || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

const GEMINI_FLASH_MODEL = 'gemini-3.8-flash';
const GEMINI_PRO_MODEL = 'gemini-3.1-pro-preview';

let chatSession: any = null;

// 상태이상 제약 문구 추가
const STATUS_STRICT_PROMPT = `
**상태이상(Status Ailments) 사용 규칙**:
반드시 시스템에 정의된 다음 명칭만 사용하세요: [${STATUS_AILMENTS_LIST.join(", ")}].
그 외에 '졸음', '무기력', '허약' 등 정의되지 않은 상태이상을 임의로 생성하거나 부여하는 것은 엄격히 금지됩니다.
버프/디버프 수치 변화는 스탯 명칭(STR, INT 등)과 %를 조합하여 표현하세요.

**스킬 관리 규칙 (Strictest Discipline)**:
당신은 절대로 'characterUpdate'의 'skills' 필드를 건드리지 마십시오. 
사용자가 스킬북에서 직접 생성하기 전까지는 새로운 스킬을 추가하거나, 기존 스킬을 변경하거나, 삭제하지 마십시오.
당신의 역할은 '서사'와 '기타 스탯(돈, 위치, 레벨, 일반 스탯 등)'의 변화를 관리하는 것이지, 스킬 배열을 조작하는 아닙니다.
`;

const statsSchema = {
  type: Type.OBJECT,
  properties: {
    hp: { type: Type.NUMBER },
    maxHp: { type: Type.NUMBER },
    mp: { type: Type.NUMBER },
    maxMp: { type: Type.NUMBER },
    str: { type: Type.NUMBER },
    int: { type: Type.NUMBER },
    wis: { type: Type.NUMBER },
    def: { type: Type.NUMBER },
    agi: { type: Type.NUMBER },
    ctrl: { type: Type.NUMBER }
  }
};

const activeStatusSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    duration: { type: Type.NUMBER },
    effect: { type: Type.STRING }
  }
};

const itemSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    type: { type: Type.STRING },
    rarity: { type: Type.STRING },
    description: { type: Type.STRING },
    enhancement: { type: Type.NUMBER },
    mythicOption: { type: Type.STRING }
  }
};

const skillSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        tier: { type: Type.STRING },
        type: { type: Type.STRING },
        mpCost: { type: Type.NUMBER },
        level: { type: Type.NUMBER },
        maxLevel: { type: Type.NUMBER },
        currentMastery: { type: Type.NUMBER },
        effectFormula: { type: Type.STRING },
        powerRatio: { type: Type.NUMBER },
        targetType: { type: Type.STRING },
        imageUrl: { type: Type.STRING },
        vfxColor: { type: Type.STRING },
        vfxShape: { type: Type.STRING },
        buffType: { type: Type.STRING },
        statusEffects: { type: Type.ARRAY, items: activeStatusSchema },
        shinryokuType: { type: Type.STRING },
        isSummonSkill: { type: Type.BOOLEAN },
        summonData: {
            type: Type.OBJECT,
            properties: {
                summonCount: { type: Type.NUMBER },
                durationTurns: { type: Type.NUMBER },
                powerLevel: { type: Type.STRING },
                summonName: { type: Type.STRING },
                summonImage: { type: Type.STRING },
                summonShinryokuType: { type: Type.STRING }
            }
        }
    }
}

const companionSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    age: { type: Type.STRING },
    gender: { type: Type.STRING },
    race: { type: Type.STRING },
    nation: { type: Type.STRING },
    appearance: { type: Type.STRING },
    personality: { type: Type.STRING },
    classType: { type: Type.STRING },
    level: { type: Type.NUMBER },
    stats: statsSchema,
    statusEffects: {
        type: Type.ARRAY,
        items: activeStatusSchema
    },
    affection: { type: Type.NUMBER },
    loyalty: { type: Type.NUMBER },
    isLover: { type: Type.BOOLEAN },
    currentTactics: { type: Type.STRING }
  }
};

const simpleCompanionSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    age: { type: Type.STRING },
    gender: { type: Type.STRING },
    race: { type: Type.STRING },
    nation: { type: Type.STRING },
    infamy: {type: Type.NUMBER},
    appearance: { type: Type.STRING },
    personality: { type: Type.STRING },
    classType: { type: Type.STRING },
  },
  required: ["name", "age", "gender", "race", "appearance", "classType"]
};

const enemySchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        level: { type: Type.NUMBER },
        hp: { type: Type.NUMBER },
        maxHp: { type: Type.NUMBER },
        stats: statsSchema,
        statusEffects: { type: Type.ARRAY, items: activeStatusSchema },
        description: { type: Type.STRING }
    }
};

const combatStateSchema = {
    type: Type.OBJECT,
    properties: {
        enemies: { type: Type.ARRAY, items: enemySchema },
        turn: { type: Type.NUMBER },
        log: { type: Type.ARRAY, items: { type: Type.STRING } },
        isEnded: { type: Type.BOOLEAN }
    }
};

const schema = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING },
    choices: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    sceneType: { type: Type.STRING, enum: ["normal", "combat", "creation", "levelup"] },
    combatState: combatStateSchema,
    recommendedSkills: {
        type: Type.ARRAY,
        items: skillSchema,
        description: "List of recommended skills."
    },
    characterUpdate: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        age: { type: Type.STRING },
        gender: { type: Type.STRING },
        race: { type: Type.STRING },
        nation: { type: Type.STRING },
        personality: { type: Type.STRING },
        currentDate: { type: Type.STRING },
        
        firstClassName: { type: Type.STRING },
        firstClassDescription: { type: Type.STRING },
        secondClassName: { type: Type.STRING },
        secondClassDescription: { type: Type.STRING },
        lastClassName: { type: Type.STRING },
        lastClassDescription: { type: Type.STRING },
        finalClassName: { type: Type.STRING },
        finalClassDescription: { type: Type.STRING },
        
        shinryokuType: { type: Type.STRING },
        money: { type: Type.NUMBER },
        infamy: { type: Type.NUMBER },
        
        level: { type: Type.NUMBER },
        currentExp: { type: Type.NUMBER },
        maxExp: { type: Type.NUMBER },
        statPoints: { type: Type.NUMBER },
        classTier: { type: Type.STRING },
        base: {
            type: Type.OBJECT,
            properties: {
                level: { type: Type.NUMBER },
                residents: { type: Type.ARRAY, items: { type: Type.STRING } },
                resources: {
                    type: Type.OBJECT,
                    properties: {
                        gold: { type: Type.NUMBER },
                        wood: { type: Type.NUMBER },
                        stone: { type: Type.NUMBER },
                        iron: { type: Type.NUMBER },
                        manaStone: { type: Type.NUMBER },
                        manaCrystal: { type: Type.NUMBER }
                    }
                }
            }
        },
        skills: {
            type: Type.ARRAY,
            items: skillSchema
        },
        stats: statsSchema,
        statusEffects: {
            type: Type.ARRAY,
            items: activeStatusSchema
        },
        equipment: {
           type: Type.OBJECT,
           properties: {
             weapon: itemSchema,
             subWeapon: itemSchema,
             head: itemSchema,
             body: itemSchema,
             feet: itemSchema,
             hand: itemSchema,
             accessory: itemSchema
           }
        },
        inventory: {
            type: Type.ARRAY,
            items: itemSchema
        },
        companions: {
            type: Type.ARRAY,
            items: companionSchema
        }
      }
    }
  },
  required: ["narrative", "choices", "sceneType"]
};

/**
 * [NEW] 모든 보스 정보를 텍스트 데이터로 변환하여 AI에게 제공
 */
const getDetailedWorldBossContext = (currentMonth: number) => {
    const list: string[] = [];
    const sources = [
        { label: "ASIA", data: ASIA_BOSSES },
        { label: "EUROPE", data: EUROPE_BOSSES },
        { label: "AMERICA", data: AMERICA_BOSSES },
        { label: "AFRICA", data: AFRICA_BOSSES },
        { label: "DIVINE", data: DIVINE_REALM_BOSSES },
        { label: "FANTASY", data: FANTASY_BOSSES },
        { label: "REGIONAL", data: DETAILED_BOSSES }
    ];

    sources.forEach(source => {
        Object.entries(source.data).forEach(([nation, cities]) => {
            Object.entries(cities as Record<string, any>).forEach(([city, boss]) => {
                list.push(`- [${source.label}] ${nation} ${city}: ${boss.name} (${boss.title}), 계통: ${boss.shinryokuType}`);
            });
        });
    });

    // 신화/시즌 보스 추가
    list.push("\n[ANCIENT MYTHIC THREATS]");
    Object.values(SEASONAL_BOSSES).forEach(b => {
        list.push(`- ${b.name} (${b.title}) - 신계 및 차원의 위협`);
    });

    // 이번 달 출몰하는 특정 보스 강조
    const currentSeasonal = SEASONAL_BOSS_CONFIG[currentMonth] || [];
    if (currentSeasonal.length > 0) {
        list.push(`\n[ACTIVE SEASONAL EVENT - MONTH ${currentMonth}]`);
        currentSeasonal.forEach(s => {
            const data = SEASONAL_BOSSES[s.bossKey];
            if (data) list.push(`- CRITICAL: ${s.nation} ${s.city}에 '${data.name}' 강림 중!`);
        });
    }

    return list.join('\n');
};

/**
 * [NEW] 플레이어의 과거 인연(socialNetwork) 중 명망 있는 인물들 추출
 */
const getNotableSocialNetworkContext = (character: Character) => {
    if (!character.socialNetwork) return "없음";
    
    // 명성이나 공훈이 500 이상인 인물들만 필터링
    const notable = character.socialNetwork.filter(n => 
        (n.reputation || 0) >= 500 || (n.merit || 0) >= 500
    );

    if (notable.length === 0) return "명망 있는 과거 인연 없음";

    return notable.map(n => 
        `- ${n.name} (현재: ${n.job || '무직'}, 지위: ${n.militaryRank || n.mercenaryRank || '일반'}, 출처: ${n.originName}, 명성/공훈: ${n.reputation || n.merit || 0})`
    ).join('\n');
};

/**
 * [NEW] 유저가 입력한 클래스 명칭을 바탕으로 능력 설명을 추천합니다.
 */
export const generateClassDescriptionOnly = async (className: string, tier: ClassTier, elementType: string): Promise<string> => {
  try {
    const prompt = `
    당신은 판타지 RPG '신의 사자'의 서사 엔진입니다.
    유저가 결정한 새로운 클래스의 이름과 정보를 바탕으로, 해당 클래스의 권능과 이미지를 상징하는 멋진 설명을 한국어로 작성하십시오.

    [정보]
    클래스 명칭: "${className}"
    클래스 단계: ${tier}
    신력 계통: ${elementType}

    [작성 지침]
    1. 반드시 한국어로 답변하십시오.
    2. 해당 클래스가 가진 힘의 근원이나 전투 방식을 묘사하는 1~2문장의 짧고 강렬한 서사를 작성하십시오.
    3. 단계(Tier)가 높을수록(예: 파이널 클래스) 더 웅장하고 압도적인 표현을 사용하십시오.
    
    출력은 오직 설명 텍스트만 반환하십시오.
    `;

    const ai = getAi();
    const result = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return result.text || "신비로운 힘을 각성한 새로운 존재입니다.";
  } catch (error) {
    return "신비로운 힘을 각성한 새로운 존재입니다.";
  }
};

/**
 * [NEW] 설명을 바탕으로 클래스 이름을 추천합니다.
 */
export const generateClassNameOnlySuggestion = async (description: string, tier: ClassTier, elementType: string): Promise<string> => {
  try {
    const prompt = `
    당신은 판타지 RPG '신의 사자'의 서사 엔진입니다.
    유저가 작성한 능력 설명을 바탕으로, 해당 클래스의 정체성을 가장 잘 나타내는 멋진 이름을 한국어로 제안하십시오.

    [정보]
    능력 설명: "${description}"
    클래스 단계: ${tier}
    신력 계통: ${elementType}

    [작성 지침]
    1. 반드시 한국어로 답변하십시오.
    2. 중2병스럽거나 판타지적인 멋이 느껴지는 고유한 명칭을 만드십시오.
    3. 명칭은 명사형으로 짧게 반환하십시오 (예: 심연의 집행자, 섬광의 성기사).
    
    출력은 오직 이름 텍스트만 반환하십시오.
    `;

    const ai = getAi();
    const result = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return result.text.trim() || "각성자";
  } catch (error) {
    return "각성자";
  }
};

/**
 * 학생(친구/라이벌)과의 대화 기능
 */
export const chatWithStudent = async (student: SimpleStudent, message: string, player: Character): Promise<string> => {
    try {
        const history = student.chatHistory || [];
        const historyContext = history.slice(-6).map(h => 
            `${h.role === 'user' ? '플레이어' : student.name}: ${h.text}`
        ).join('\n');

        const rivalContext = student.isRival 
            ? `당신은 플레이어의 라이벌입니다. 존중도: ${student.respect}/100, 긴장도: ${student.tension}/100. 약간의 경쟁심과 자존심을 보이되 무례하지는 않게 답변하세요. 라이벌이라도 개인적인 호감도는 별개로 존재할 수 있습니다.` 
            : `당신은 플레이어의 학급 친구입니다. 호감도: ${student.affection}/100. 친근하게 답변하세요.`;

        const relationContext = buildRelationContextForDialogue(student, player);

        const prompt = `
        당신은 판타지 RPG '신의 사자'의 학교 학생인 '${student.name}' 역할을 수행합니다.
        
        [학생 정보]
        이름: ${student.name}
        나이: ${student.age}
        성격(MBTI): ${student.personality}
        외모 특징: ${student.appearance}
        소속 국가: ${student.nation}
        레벨: Lv.${student.level}
        관점: ${rivalContext}

        [인물 관계망 정보]
        ${relationContext}
        
        [상대방]
        플레이어: ${player.name} (학급 동료)
        
        [응답 지침]
        1. 반드시 한국어로 답변하십시오.
        2. 학생다운 말투(반말 또는 존댓말은 성격에 따라)를 사용하고 2~3문장 내외로 작성하십시오.
        3. 답변 끝에 호감도/존중도/긴장도 변화가 필요하다면 다음 태그를 포함하십시오:
           - 모든 학생 공통: [AFF+1], [AFF-1] (호감도 증감)
           - 라이벌 전용: [RES+1] (존중 상승), [TEN-1] (긴장 하락), [TEN+2] (긴장 상승)
        
        ${RELATION_DIALOGUE_GUIDELINES}
        
        [최근 대화]
        ${historyContext || "(첫 대화)"}

        [플레이어의 메시지]
        "${message}"
        `;

        const ai = getAi();
        const result = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        return result.text || "...안녕?";
    } catch (e) {
        return handleApiError(e, "...무슨 소린지 모르겠어.");
    }
};

/**
 * [NEW] 과거 인연(Social Bond)과의 대화 기능
 */
export const chatWithSocialBond = async (bond: SimpleStudent, message: string, player: Character): Promise<string> => {
    try {
        const history = bond.chatHistory || [];
        const historyContext = history.slice(-8).map(h => 
            `${h.role === 'user' ? '플레이어' : bond.name}: ${h.text}`
        ).join('\n');

        const relationContext = buildRelationContextForDialogue(bond, player);

        const prompt = `
        당신은 판타지 RPG의 과거 인연인 '${bond.name}' 역할을 수행합니다. 
        플레이어와는 한때 동료였거나 특별한 관계였으나 현재는 각자의 길을 걷고 있습니다.

        [인연 정보]
        이름: ${bond.name}
        나이: ${bond.age}
        현재 직업: ${bond.job || '무직'}
        현재 지위: ${bond.militaryRank || bond.mercenaryRank || '일반 시민'}
        현재 명성/공훈: ${bond.reputation || bond.merit || 0}
        현재 악명: ${bond.infamy}
        신력 계통: ${bond.shinryokuType || '미개방'}
        출처(Origin): ${bond.originName} (${bond.origin})
        성격(MBTI): ${bond.personality}
        호감도: ${bond.affection}/100

        [인물 관계망 정보]
        ${relationContext}

        [상대방]
        플레이어: ${player.name} (옛 인연)

        [응답 지침]
        1. 반드시 한국어로 답변하십시오.
        2. **중요: 당신은 현재의 사회적 지위(${bond.job})에 맞는 말투를 사용해야 합니다.** 
           - 군인 계급이 높다면 엄격하고 절제된 말투를, 용병이라면 거칠고 실리적인 말투를 사용하십시오.
        3. 플레이어와 공유했던 과거(${bond.originName})를 가끔 언급하며 회상에 잠기기도 하십시오.
        4. 플레이어의 현재 상황을 알고 있는 듯한 태도를 보이십시오.
        5. 답변 끝에 호감도 변화가 필요하다면 [AFF+1], [AFF-2] 태그를 포함하십시오.
        6. 답변은 2~3문장 내외로 간결하고 몰입감 있게 작성하세요.

        ${RELATION_DIALOGUE_GUIDELINES}

        [최근 대화]
        ${historyContext || "(오랜만의 연락)"}

        [플레이어의 메시지]
        "${message}"
        `;

        const ai = getAi();
        const result = await ai.models.generateContent({
            model: GEMINI_PRO_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        return result.text || "...오랜만이군.";
    } catch (e) {
        return handleApiError(e, "...통신 상태가 불안정하군.");
    }
};
/**
 * 현상수배범(Criminal)과의 대화 기능
 */
export const chatWithCriminal = async (criminal: Criminal, message: string, player: Character, history: {role: 'user' | 'model', text: string}[]): Promise<string> => {
    try {
        const historyContext = history.map(h => 
            `${h.role === 'user' ? '플레이어' : criminal.name}: ${h.text}`
        ).join('\n');

        const prompt = `
        당신은 RPG 게임의 현상수배범 캐릭터 '${criminal.name}' 역할을 수행합니다.
        
        [수배범 프로필]
        이름: ${criminal.name}
        악명(Infamy): ${criminal.infamy} (매우 위험)
        죄목: ${criminal.description}
        상태: 플레이어에게 패배하여 제압된 상태. 밧줄에 묶여 취조를 받고 있습니다.
        
        [상대방]
        플레이어: ${player.name} (현상금 사냥꾼 / 영웅)
        
        [응답 지침]
        1. 한국어로 답변하십시오.
        2. 제압된 상태이므로 비굴하거나, 혹은 죽음을 두려워하지 않고 당당하거나, 목숨을 구걸하는 등 악명과 성격에 맞는 태도를 보이십시오.
        3. 플레이어가 동료 영입을 제안하거나 국가에 넘기겠다고 협박하는 상황임을 인지하십시오.
        4. 답변은 2~3문장 내외로 작성하십시오.
        
        [최근 대화]
        ${historyContext || "(첫 대화)"}

        [플레이어의 취조 메시지]
        "${message}"
        `;

        const ai = getAi();
        const result = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        return result.text || "...죽여라.";
    } catch (e) {
        return handleApiError(e, "...침묵하고 있습니다.");
    }
};

// Bulk Enrich Recruits Function
export const enrichRecruitsWithAI = async (recruits: Companion[]): Promise<Companion[]> => {
    try {
        const profiles = recruits.map(r => ({
            id: r.id,
            name: r.name,
            level: r.level,
            shinryoku: r.shinryokuType,
            tier: r.classTier
        }));

        const prompt = `
        Fantasy RPG Companion Enrichment Task.
        Input Profiles: ${JSON.stringify(profiles)}

        Task:
        For each companion, provide:
        1. "classType": A creative class name fitting their Shinryoku element and Tier.
        2. "skills": Generate 2-3 appropriate RPG skills.

        Rules for Skills:
        - Tier FIRST (Lv 30~99): Simple elemental skills.
        - Tier SECOND (Lv 100~199): Advanced combo or strategic skills.
        - Tier LAST (Lv 200+): Powerful high-rank skills.
        - Physical skills formula: "P.Atk * Ratio"
        - Magic skills formula: "M.Atk * Ratio"
        - PowerRatio: 100~400 depending on Tier.
        - MP Cost: 10~50.

        Output strictly in JSON matching this schema:
        { 
          "results": [
            { 
              "id": "original_id", 
              "classType": "Class Name", 
              "skills": [ { "name": "...", "description": "...", "type": "물리 공격" | "마법 공격" | "버프" | "디버프", "mpCost": 10, "powerRatio": 150, "effectFormula": "...", "targetType": "single" | "aoe" } ]
            }, ...
          ] 
        }
        Language: Korean (한국어).
        `;

        const ai = getAi();
        const result = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const data = JSON.parse(result.text || '{"results":[]}');
        return recruits.map(r => {
            const aiData = data.results.find((res: any) => res.id === r.id);
            if (aiData) {
                return {
                    ...r,
                    classType: aiData.classType,
                    skills: aiData.skills.map((s: any) => ({
                        ...s,
                        level: 1,
                        maxLevel: 10,
                        currentMastery: 0,
                        tier: r.classTier
                    }))
                };
            }
            return r;
        });
    } catch (e) {
        return handleApiError(e, recruits);
    }
};

export const persuadeCompanionJob = async (companion: Companion, targetJob: JobType, player: Character): Promise<string> => {
    try {
        const prompt = `
        You are roleplaying as ${companion.name}, an RPG companion.
        [Companion Info] Name: ${companion.name}, Job: ${companion.job}, Personality: ${companion.personality}, Affection: ${companion.affection}, Loyalty: ${companion.loyalty}
        [Context] The player (${player.name}) is persuading you to change your job to: "${targetJob}".
        
        Task: 
        1. React to this suggestion in character. 
        2. Your response should reflect your personality (e.g., if you are '신중함', you might be hesitant; if '호전적', you might like being a Soldier).
        3. If your affection/loyalty is high, be more open to it.
        4. Reply strictly in Korean. 
        5. Keep the response concise (2-3 sentences).
        `;

        const ai = getAi();
        const result = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        return result.text || "...생각해 보죠.";
    } catch (e) {
        return handleApiError(e, "...생각해 보죠.");
    }
};

export const generateMercenaryQuests = async (character: Character, monsterPool: string[], fieldDesc?: string, lootPool?: string[]): Promise<Quest[]> => {
    try {
        const rank = character.mercenaryData?.rank || 'F';
        const location = character.currentLocation || { nation: '대한민국', city: '서울' };
        
        const prompt = `
        Create 6 unique fantasy RPG mercenary quests.
        Location: ${location.nation}, ${location.city}.
        Area Context: ${fieldDesc || '일반 지역'}.
        Player Rank: ${rank}. Player Level: ${character.level}.
        
        **CRITICAL RULE - KOREAN ONLY**:
        All fields like 'title', 'goal', 'details' MUST be strictly in Korean (한국어).

        **CRITICAL RULE - MONSTER COUNT & ITEM QUANTITY**:
        - Subjugation: [Count] MUST be between 3 to 7. NEVER exceed 10.
        - Collection: [Count] MUST be between 3 to 6. NEVER exceed 8.

        **CRITICAL RULE - QUEST TYPES**:
        - You MUST generate a mix of these types: ['Subjugation', 'Collection', 'Investigation', 'MercenaryEscort', 'TemporaryInstructor'].
        - 'Subjugation' (토벌): Kill monsters.
        - 'Collection' (수집): Gather items from the loot pool: [${lootPool?.join(', ') || '고기, 가죽, 철광석'}].
        - 'Investigation' (조사): Investigate a specific area or monster.
        - 'MercenaryEscort' (호위): Escort a merchant or VIP.
        - 'TemporaryInstructor' (임시 교관): Teach at a school. If chosen, provide schoolName and schoolTier.
        **CRITICAL RULE - REWARD CALCULATION**:
        Use the following Rank Multipliers (Index):
        F/E=800, D=1200, C=2000, B=3000, A=5000, S=10000, SS=20000, SSS=50000.
        Use Danger Multipliers:
        Low=0.5, Mid=1.0, High=1.5, Extreme=2.0.

        1. Reward Exp = [Target Amount] * [Rank Multiplier] * [Random 0.75 ~ 1.10] * [Danger Multiplier]
        2. Reward Gold = [Target Amount] * [Rank Multiplier] * [Random 2.50 ~ 5.0] * [Danger Multiplier]

        **CRITICAL RULE - LOCAL MONSTERS**:
        Use only these monsters: [${monsterPool.join(', ')}]
        
        Task:
        1. Quests should be immersive and fitting for the current city/nation.
        2. Output JSON: Array of Quest objects.
        `;

        const ai = getAi();
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { 
                responseMimeType: "application/json",
                responseSchema: questSchema
            }
        });

        const text = response.text;
        if (!text) return [];
        return JSON.parse(text);
    } catch (error) {
        return handleApiError(error, []);
    }
};

/**
 * 엘프 성역 전용 AI 퀘스트 생성 함수
 */
export const generateElfQuestsWithAI = async (character: Character, monsterPool: string[]): Promise<Quest[]> => {
    try {
        const prompt = `
        Create 4 epic nature-preservation RPG quests for the Elven Grove.
        The Elven Queen Eladia is worried about nature intruders.
        
        **QUEST THEMES**:
        - 'RacialNatureProtection': Subjugating monsters that destroy elven forests.
        - 'Subjugation': Defeating corrupted spirits.

        **CRITICAL RULE - KOREAN ONLY**: All text MUST be in Korean (한국어).
        **CRITICAL RULE - LOCAL MONSTERS**: 
        ONLY use these Elven forest monsters: [${monsterPool.join(', ')}]
        
        **GOAL FORMAT**:
        For BOTH 'RacialNatureProtection' AND 'Subjugation', the goal MUST be: "[Monster Name] [Count]마리 처치". (Count: 1~3)

   Use the following Rank Multipliers (Index):
        F/E=800, D=1200, C=2000, B=3000, A=5000, S=10000, SS=20000, SSS=50000.
        Use Danger Multipliers:
        Low=0.5, Mid=1.0, High=1.5, Extreme=2.0.
        1. Reward Exp = [Monster Count] * [Rank Multiplier] * [Random 0.75 ~ 1.10] * [Danger Multiplier]
        2. Reward Gold = [Monster Count] * [Rank Multiplier] * [Random 2.50 ~ 5.0] * [Danger Multiplier]
        3. RewardElfRep: 3 ~ 10 (Approx 5)
        
        Output JSON matching Quest schema array.
        `;

        const ai = getAi();
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { 
                responseMimeType: "application/json",
                responseSchema: questSchema
            }
        });

        return JSON.parse(response.text || '[]');
    } catch (error) {
        return handleApiError(error, []);
    }
};

/**
 * 수인 투기국 전용 AI 퀘스트 생성 함수
 */
export const generateBeastQuestsWithAI = async (character: Character, monsterPool: string[]): Promise<Quest[]> => {
    try {
        const prompt = `
        Create 4 brutal and wild RPG quests for the Leonis Arena Nation (Beastmen).
        The Beast King values strength and glory above all.
        
        **QUEST THEMES**:
        - 'BeastArenaBattle': Duels in the arena against wild beasts.
        - 'Subjugation': Hunting intruders in the savannas.

        **CRITICAL RULE - KOREAN ONLY**: All text MUST be in Korean (한국어).
        **CRITICAL RULE - LOCAL MONSTERS**: 
        ONLY use these wild monsters: [${monsterPool.join(', ')}]
        
        **GOAL FORMAT**:
        Goal MUST be: "[Monster Name] [Count]마리 처치". (Count: 1~5)

      Use the following Rank Multipliers (Index):
        F/E=800, D=1200, C=2000, B=3000, A=5000, S=10000, SS=20000, SSS=50000.
        Use Danger Multipliers:
        Low=0.5, Mid=1.0, High=1.5, Extreme=2.0.
        1. Reward Exp = [Monster Count] * [Rank Multiplier] * [Random 0.75 ~ 1.10] * [Danger Multiplier]
        2. Reward Gold = [Monster Count] * [Rank Multiplier] * [Random 2.50 ~ 5.0] * [Danger Multiplier]
        3. RewardBeastRep: 3 ~ 10 (Beastmen Reputation)
        
        Output JSON matching Quest schema array.
        `;

        const ai = getAi();
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { 
                responseMimeType: "application/json",
                responseSchema: questSchema
            }
        });

        return JSON.parse(response.text || '[]');
    } catch (error) {
        return handleApiError(error, []);
    }
};

/**
 * 마인 제국 전용 AI 퀘스트(계약) 생성 함수
 */
export const generateDemonQuestsWithAI = async (character: Character, monsterPool: string[]): Promise<Quest[]> => {
    try {
        const prompt = `
        Create 4 dark and glamorous RPG 'Demon Contracts' for the Necrodium Empire.
        The Empire values profit, binding contracts, and absolute power.
        
        **QUEST THEMES**:
        - 'DemonContract': High-reward risky missions involving elite demon interests.
        - 'Subjugation': Eliminating those who broke their contracts.

        **CRITICAL RULE - KOREAN ONLY**: All text MUST be in Korean (한국어).
        **CRITICAL RULE - LOCAL MONSTERS**: 
        ONLY use these dark imperial monsters: [${monsterPool.join(', ')}]
        
        **GOAL FORMAT**:
        Goal MUST be: "[Monster Name] [Count]마리 처치". (Count: 3~10)

 Use the following Rank Multipliers (Index):
        F/E=800, D=1200, C=2000, B=3000, A=5000, S=10000, SS=20000, SSS=50000.
        Use Danger Multipliers:
        Low=0.5, Mid=1.0, High=1.5, Extreme=2.0.
        1. Reward Exp = [Monster Count] * [Rank Multiplier] * [Random 0.75 ~ 1.10] * [Danger Multiplier]
        2. Reward Gold = [Monster Count] * [Rank Multiplier] * [Random 2.50 ~ 5.0] * [Danger Multiplier]
        3. RewardDemonRep: 5 ~ 10 (Demon Reputation)
        
        Output JSON matching Quest schema array.
        `;

        const ai = getAi();
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { 
                responseMimeType: "application/json",
                responseSchema: questSchema
            }
        });

        return JSON.parse(response.text || '[]');
    } catch (error) {
        return handleApiError(error, []);
    }
};

export const generateMilitaryMissions = async (character: Character, monsterPool: string[], localBossName?: string, lootPool?: string[]): Promise<Quest[]> => {
    try {
        const rank = character.militaryRank || MilitaryRank.PVT;
        const location = character.currentLocation || { nation: '대한민국', city: '서울' };
        
        const salary = MILITARY_SALARY[rank] || 2000;
        const dangerIndices = JSON.stringify(QUEST_DANGER_INDEX);
        
        const prompt = `
        Create 4 unique monster subjugation (monster killing) missions for a soldier in a fantasy RPG.
        Current Rank: ${rank}. Location: ${location.nation}, ${location.city}.
        Player Level: ${character.level}. Base Salary for Rank: ${salary}G.

        **CRITICAL RULE - KOREAN ONLY**:
        All fields like 'title', 'goal', 'details' MUST be strictly in Korean (한국어).

        **CRITICAL RULE - MONSTER COUNT & ITEM QUANTITY**:
        - Normal Monsters: [Count] MUST be between 2 and 5. NEVER exceed 5.
        - Boss Monsters (If allowed): [Count] MUST be exactly 1.
        - Collection/Supply: [Count] MUST be between 3 and 6. NEVER exceed 8.

        **CRITICAL RULE - MISSION TYPES**:
        - You MUST generate a mix of these types: ['Subjugation', 'MilitaryPatrol', 'MilitaryDefense', 'MilitaryEscort', 'MilitarySupply', 'MilitaryRecon'].
        - 'Subjugation' (토벌): Kill monsters.
        - 'MilitaryPatrol' (순찰): Patrol the area.
        - 'MilitaryDefense' (방어): Defend a position.
        - 'MilitaryEscort' (호위): Escort a supply caravan or VIP.
        - 'MilitarySupply' (보급): Collect/Supply materials for the army from the loot pool: [${lootPool?.join(', ') || '철광석, 가죽, 식량, 약초, 마력 결정'}].
        - 'MilitaryRecon' (정찰): Reconnaissance of enemy territory.

        **CRITICAL RULE - BOSS MISSIONS**:
        - Subjugation missions involving Bosses (e.g. ${localBossName || 'Named Boss'}) are STRICTLY RESTRICTED to rank '대장' (MilitaryRank.GEN).
        - If the player's rank is NOT '대장', you MUST NOT include any missions related to Bosses.

        **CRITICAL RULE - REGIONAL RESTRICTION**:
        Use ONLY these monsters for Subjugation (토벌) targets: [${monsterPool.join(', ')}].
        ${rank === MilitaryRank.GEN && localBossName ? `As a General (대장), you may include an objective to 'Subjugate' (토벌) the local boss: ${localBossName}.` : ""}

        **GOAL FORMAT**:
        - Subjugation: "[Monster Name] [Count]마리 처치".
        - MilitarySupply: "[Item Name] [Count]개 확보".
        Example: "인근 고블린 4마리 처치", "철광석 5개 확보".

        **REWARD CALCULATION (MANDATORY)**:
        Danger Multipliers: ${dangerIndices} (Low=0.5, Mid=1.0, High=1.5, Extreme=2.0)
        
        1. Reward Exp = [Base Salary] * 0.2 * [Danger Multiplier] * [Random 0.5 ~ 1.2]
        2. Reward Gold = [Base Salary] * 0.1 * [Danger Multiplier]

        Output JSON: Array of Quest objects.
        `;

        const ai = getAi();
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { 
                responseMimeType: "application/json",
                responseSchema: questSchema
            }
        });

        const text = response.text;
        if (!text) return [];
        return JSON.parse(text);
    } catch (error) {
        return handleApiError(error, []);
    }
};

const questSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['Subjugation', 'Collection', 'MilitaryPatrol', 'MilitaryDefense', 'MilitaryEscort', 'MilitarySupply', 'MilitaryRecon', 'Investigation', 'RacialNatureProtection', 'DivineOracle', 'BeastArenaBattle', 'DemonContract', 'TemporaryInstructor'] },
            rank: { type: Type.STRING },
            title: { type: Type.STRING },
            goal: { type: Type.STRING },
            details: { type: Type.STRING },
            danger: { type: Type.STRING, enum: ['Low', 'Mid', 'High', 'Extreme'] },
            rewardGold: { type: Type.NUMBER },
            rewardExp: { type: Type.NUMBER },
            rewardFaith: { type: Type.NUMBER },
            rewardElfRep: { type: Type.NUMBER },
            rewardBeastRep: { type: Type.NUMBER },
            rewardDemonRep: { type: Type.NUMBER },
            isSecret: { type: Type.BOOLEAN },
            targetName: { type: Type.STRING },
            targetAmount: { type: Type.NUMBER },
            schoolName: { type: Type.STRING },
            schoolTier: { type: Type.STRING, enum: ['초급', '중급', '고급'] }
        },
        required: ["id", "type", "rank", "title", "goal", "details", "danger", "rewardGold", "rewardExp"]
    }
};

export const generateClassSuggestion = async (elementType: string): Promise<{ name: string; description: string }> => {
  try {
    const prompt = `
    Suggest a cool and creative fantasy RPG class name and short description based on the element: "${elementType}".
    Language: Korean (한국어).
    Output JSON: { "name": "Class Name", "description": "Short description of the class ability." }
    `;

    const ai = getAi();
    const result = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
    });

    const text = result.text;
    if (!text) return { name: "미지의 힘", description: "알 수 없는 힘입니다." };
    return JSON.parse(text);
  } catch (error) {
    return handleApiError(error, { name: "각성자", description: "신비한 힘을 각성했습니다." });
  }
};

export const generateSkillSuggestion = async (
    character: Character, 
    tier: ClassTier,
    fullDetails: boolean = false
): Promise<{
    name: string;
    description: string;
    type: string;
    powerRatio: number;
    mpCost: number;
    effectFormula: string;
    targetType: string;
} | null> => {
  try {
  const isNoneTier = tier === ClassTier.NONE;
    let prompt = "";
    
    if (fullDetails) {
         prompt = `
          Character: ${character.name}, Race: ${character.race}, Type: ${character.shinryokuType || 'None'}, Tier: ${tier}.
          Task: Create a COMPLETE, CREATIVE RPG skill that perfectly fits the character's theme.
            
          **CRITICAL CONSTRAINTS FOR TIER 'NONE' (미해방)**:
          ${isNoneTier ? `
          - **ONLY** choose Skill Type from ['물리 공격', '마법 공격']. Other types are forbidden.
          - **POWER RATIO LIMITS**: 
            - Single Target: Maximum 90%.
            - AoE Target: Maximum 40%.
          - **NO STATUS EFFECTS**: The skill MUST NOT have any status ailments (상태이상) or added effects.
          - The description MUST NOT mention any special statuses or ailments.
          ` : ""}
          Rules:
             1. **Skill Name MUST be in Korean (한국어)**.
          2. **Skill Type**: Choose strictly from ['물리 공격', '마법 공격', '버프', '디버프', '패시브'] (unless restricted by Tier).
          3. **Target Type**: Choose strictly from ['single', 'aoe', 'self', 'ally'].
          4. **Tier Power Limits** (Total Power Ratio): 
             - NONE: Single <= 100%, AoE <= 40%
             - First: ~150% (Formula: 'P.Atk*1.5' or 'M.Atk*1.5')
             - Second: ~500% (Formula: 'P.Atk*5.0')
             - Last: ~2000% (Formula: 'M.Atk*20.0')
             - Final: ~10000%
          5. **Effect Formula**: 
             - MUST be a calculation string. Examples: "(P.Atk * 1.5)", "(M.Atk * 1.2)", "MaxHP 20% 회복", "P.Def -30%".
             - Use 'P.Atk' for Physical and 'M.Atk' for Magic.
             - If Passive, use format: "PASSIVE: [STR] +10% (+0.2% per Lv)".
          6. **MP Cost**: Base approx 10 MP per 100% Power Ratio.
          
          Output JSON: { 
              "name": "Skill Name", 
              "description": "Flavor text description", 
              "type": "Skill Type Enum",
              "powerRatio": Number,
              "mpCost": Number,
              "effectFormula": "Formula String",
              "targetType": "Target Enum"
          }
        `;
    } else {
        prompt = `
          Character: ${character.name}, Race: ${character.race}, Type: ${character.shinryokuType || 'None'}, Tier: ${tier}.
          Task: Create ONE creative skill name.
          Rule: **Skill Name MUST be in Korean (한국어)**.
          Output JSON: { "name": "Skill Name" }
        `;
    }

    const ai = getAi();
    const response = await ai.models.generateContent({ 
        model: GEMINI_FLASH_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
        }
    });
    
    const text = response.text;
    if (!text || !text.trim()) return null;
    
    const parsed = JSON.parse(text);

    // [NEW] 로컬에서 다시 한번 제약 사항 강제 (Clamping)
    let finalPowerRatio = parsed.powerRatio || 100;
    let finalType = parsed.type || SkillType.PHYSICAL;
    let finalTargetType = parsed.targetType || "single";
    let finalFormula = parsed.effectFormula || "(P.Atk * 1.0)";

    if (isNoneTier) {
        // 종류 강제
        if (finalType !== SkillType.PHYSICAL && finalType !== SkillType.MAGIC) {
            finalType = SkillType.PHYSICAL;
        }
        // 위력 상한 강제
        const maxLimit = finalTargetType === 'aoe' ? 40 : 90;
        finalPowerRatio = Math.min(finalPowerRatio, maxLimit);
        // 포뮬러 보정
        const mainStatLabel = finalType === SkillType.PHYSICAL ? 'P.Atk' : 'M.Atk';
        finalFormula = `(${mainStatLabel} * (${finalPowerRatio} + 스킬 Lv)%)`;
    }
    
     return {
        name: parsed.name || "알 수 없는 스킬",
        description: parsed.description || "",
        type: finalType, 
        powerRatio: finalPowerRatio,
        mpCost: parsed.mpCost || 10,
        effectFormula: finalFormula,
        targetType: finalTargetType
    };
  } catch (e) {
    return handleApiError(e, null);
  }
}
/**
 * [NEW] 작성된 설명을 바탕으로 서사적인 스킬 이름을 제안합니다.
 */
export const generateSkillNameOnlySuggestion = async (
    character: Character | Companion,
    description: string,
    tier: ClassTier
): Promise<string | null> => {
    try {
        const prompt = `
        당신은 판타지 RPG '신의 사자'의 스킬 서사 엔진입니다.
        유저가 작성한 스킬의 설명을 분석하여, 해당 기술의 연출과 위력에 걸맞은 멋진 이름을 한국어로 제안하십시오.

        [캐릭터 정보]
        이름: ${character.name}
        클래스 단계: ${tier}
        신력 계통: ${character.shinryokuType || '없음'}

        [입력된 설명]
        "${description}"

        [작성 지침]
        1. 반드시 한국어로 답변하십시오.
        2. 기술의 묘사와 신력 계통(예: 화염계, 암흑계)에 어울리는 간결하고 강렬한 이름을 만드십시오.
        3. 반환값은 오로지 이름 텍스트 자체여야 합니다. (JSON 형식이 아닌 일반 텍스트)

        예시: "화염의 심판", "절대 영도 참격", "심연의 수의"
        `;

        const ai = getAi();
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        return response.text.trim();
    } catch (e) {
        console.error(e);
        return null;
    }
};

/**
 * [NEW] 사용자가 입력한 스킬명을 바탕으로 적합한 스킬 설명을 제안합니다. (수치 및 타입 변경 배제)
 */
export const generateSkillDescriptionSuggestion = async (
    character: Character | Companion,
    skillName: string,
    tier: ClassTier
): Promise<string | null> => {
    try {
        const prompt = `
        당신은 판타지 RPG '신의 사자'의 스킬 서사 엔진입니다.
        사용자가 입력한 스킬명과 캐릭터의 정보를 바탕으로, 해당 스킬의 연출과 이미지를 떠올리게 하는 서사적인 설명을 작성하십시오.

        [캐릭터 정보]
        이름: ${character.name}
        클래스 단계: ${tier}
        신력 계통: ${character.shinryokuType || '없음'}
        레벨: Lv.${character.level}

        [입력된 스킬명]
        "${skillName}"

        [작성 지침]
        1. 스킬의 이름과 신력 계통에 어울리는 서사적인 설명을 한국어로 작성하십시오. (2문장 이내)
        2. **중요: 스킬의 위력, MP 소모량, 계산 공식 등 게임 시스템적인 수치나 로직에 대한 언급을 피하고, 오로지 세계관 내에서의 묘사와 연출에만 집중하십시오.**
        3. 반환값은 오로지 설명 텍스트 자체여야 합니다. (JSON 형식이 아닌 일반 텍스트)

        예시: "검 끝에 응축된 냉기를 폭발시켜 주변의 대기마저 얼어붙게 만드는 치명적인 검술입니다."
        `;

        const ai = getAi();
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        return response.text.trim();
    } catch (e) {
        console.error(e);
        return null;
    }
};

export const generateMonsterEvolution = async (monster: CapturedMonster, iStage: string): Promise<{ name: string, appearance: string }> => {
    try {
        const stats = monster.stats || {};
        const log = monster.trainingLog || { str: 0, int: 0, def: 0, agi: 0, magic: 0 };
        const highestStat = Object.keys(log).reduce((a, b) => log[a as keyof typeof log] > log[b as keyof typeof log] ? a : b);
        
        const prompt = `
        Evolve a Monster in a RPG.
        Current Name: ${monster.name}
        Current Stage: ${monster.stage}
        Target Stage: ${iStage}
        Element: ${monster.shinryokuType || 'Neutral'}
        Highest Trained Stat: ${highestStat.toUpperCase()} (Determines form, e.g. STR=Fighter, INT=Mage)
        
        Task:
        1. Generate a new cool name in Korean (한국어). **The new name MUST reflect the current name's concept or be an upgraded version of it.**
        2. Generate a short appearance description (1-2 sentences) in Korean.
        
        Output JSON: { "name": "New Name", "appearance": "Description..." }
        `;

        const ai = getAi();
        const result = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const text = result.text;
        if (!text) return { name: `진화한 ${monster.name}`, appearance: "더 강력해진 모습입니다." };
        return JSON.parse(text);
    } catch (e) {
        return handleApiError(e, { name: `진화한 ${monster.name}`, appearance: "더 강력해진 모습입니다." });
    }
};

export const generateMonsterSkills = async (monster: CapturedMonster, iStage: string): Promise<any[]> => {
    try {
        const prompt = `
        Generate 2 RPG skills for a monster.
        Name: ${monster.name}
        Stage: ${iStage}
        Element: ${monster.shinryokuType || 'Neutral'}
        
        Task: Create 2 creative skills fitting this monster's concept.
        
        Rules:
        - Skills should be powerful appropriate for the stage.
        - Output format must be JSON Array of Skill objects.
        
        Output JSON: 
        [
          { 
            "name": "Skill Name", 
            "description": "Short description", 
            "type": "물리 공격" | "마법 공격" | "버프" | "디버프", 
            "powerRatio": Number (100~300), 
            "mpCost": Number (10~50),
            "effectFormula": "Formula (e.g. P.Atk*1.5)",
            "targetType": "single" | "aoe"
          }, 
          ...
        ]
        `;

        const ai = getAi();
        const result = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const text = result.text;
        if (!text) return [];
        return JSON.parse(text);
    } catch (e) {
        return handleApiError(e, []);
    }
};

export const generateCraftingResults = async (type: string, subType: string, rarity: string, optionCount: number): Promise<{ name: string, options: string[], description: string, weaponType?: WeaponType }> => {
    try {
        const allowedElements = SHINRYOKU_TYPES_LIST.join(', ');
        
        const prompt = `
        Create a Fantasy RPG Item.
        Type: ${type} (${subType})
        Rarity: ${rarity}
        Language: Korean (한국어) - Description and Name in Korean.
        
        Generate:
        1. Name: Creative name fitting the rarity.
        2. Description: Short lore.
        3. Options: Generate exactly ${optionCount} bonus options.
           
           **STRICT OPTION GENERATION RULES**:
           You MUST ONLY choose from the following allowed categories. 
           
           **CRITICAL RULE: YOU MUST GENERATE EXACTLY ${optionCount} OPTIONS.**
           
           [ALLOWED OPTIONS]
           1. Combat Stats (Value: +N or +N%):
              - Physical Attack (물리 공격력): "물리 공격력 +10", "물리 공격력 +5%"
              - Magic Attack (마법 공격력): "마법 공격력 +10", "마법 공격력 +5%"
              - Physical Defense (물리 방어력): "물리 방어력 +10", "물리 방어력 +5%"
              - Magic Defense (마법 방어력): "마법 방어력 +10", "마법 방어력 +3%"
              - Crit Chance (치명타): "치명타 확률 +2%", "치명타 +5"
              - Status Resist (저항): "상태이상 저항 +5%"
              - Final Stats (Total): "최종 능력치 +2%", "모든 스탯 +3%" (Very rare)
           
           2. Special (Weapons Only - Elemental Imbue):
              - You can choose ANY of these elements: ${allowedElements}
              - Format: "{Element} 속성 부여"
              
        **WEAPON TYPE RULE**:
        If the type is 'Weapon', you MUST also provide a 'weaponType' strictly from this list: [Sword, Spear, Blunt, Axe, Knuckle, Bow, Crossbow, Thrown, Firearm, Heavy, Staff, Energy, Grimoire].
 If the type is 'SubWeapon', you MUST also provide a 'weaponType' strictly from this list: [Shield, Orb, SubSword].
        
        Output JSON: {
            "name": "Item Name",
            "description": "Item Description",
            "options": ["Option 1", "Option 2", ...],
            "weaponType": "WeaponType if applicable"
        }
        `;

        const ai = getAi();
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const text = response.text;
        if (!text) throw new Error("No text");
        return JSON.parse(text);
    } catch (e) {
        // [FIX] AI 요청 실패 시 itemPools.ts를 참고하여 로컬에서 아이템 생성
        const localName = generateLocalItemName(type, subType, rarity as any);
        const localOptions = generateLocalOptions(rarity as any, optionCount, type);
        
        return handleApiError(e, {
            name: localName,
            description: "경매장에서 발견된 신비로운 장비입니다.",
            options: localOptions,
            weaponType: type === 'Weapon' ? 'Sword' : type === 'SubWeapon' ? 'Shield' : undefined
        });
    }
};

export const generateCompanionProfile = async (playerLevel: number, playerAgeStr: string): Promise<any> => {
    try {
        const prompt = `
        Create a unique RPG companion profile.
        Player Level: ${playerLevel}.
        Player Age: "${playerAgeStr}".
        
        Required JSON Fields:
        - name, age, gender, race, nation, appearance, personality(MBTI), classType.
        `;

        const ai = getAi();
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: simpleCompanionSchema,
            }
        });

        const text = response.text;
        if (!text || !text.trim()) throw new Error("Empty response");
        return JSON.parse(text);

    } catch (e) {
        return handleApiError(e, {
            name: "이름 없음",
            age: "알 수 없음",
            gender: "알 수 없음",
            race: "인간",
            nation: "대한민국",
            appearance: "평범한 모습이다.",
            personality: "ISTJ (신중함)",
            classType: "모험가"
        });
    }
};

/**
 * 동료와의 대화 기능
 */
export const chatWithCompanion = async (companion: Companion, message: string, player?: Character, systemInjection?: string): Promise<string> => {
  try {
    const history = companion.chatHistory || [];
    const historyContext = history.slice(-10).map(h => 
        `${h.role === 'user' ? '플레이어' : companion.name}: ${h.text}`
    ).join('\n');

    const isLoverWithPlayer = companion.isLover && companion.partnerId === 'player';
    const isSpouseWithPlayer = companion.isSpouse && companion.partnerId === 'player';
    const isTakenByOther = companion.isLover && companion.partnerId !== 'player' && companion.partnerId !== undefined;

    const relationContext = buildRelationContextForDialogue(companion, player);

    const prompt = `
    당신은 RPG 게임의 동료 캐릭터 '${companion.name}' 역할을 수행합니다.
    
    [캐릭터 프로필]
    이름: ${companion.name}
    종족: ${companion.race}
    국적: ${companion.nation || '불명'}
    성격: ${companion.personality || '평범함'}
    직업: ${companion.job || companion.classType || '모험가'}
    관계 상태: ${isSpouseWithPlayer ? '플레이어의 배우자' : isLoverWithPlayer ? '플레이어의 연인' : isTakenByOther ? `동료 '${companion.partnerName}'의 연인/배우자` : '솔로 (연인 없음)'}
    호감도: ${companion.affection} / 충성도: ${companion.loyalty}

    [인물 관계망 정보]
    ${relationContext}
    
    [응답 지침]
    1. 반드시 한국어로 답변하세요.
    2. 캐릭터의 성격, 직업, 관계 상태, 그리고 이전 대화 내용을 고려하여 일관성 있게 말하세요.
    3. 플레이어와 부부나 연인이라면 친밀한 태도를 보이세요.
    4. **중요: 만약 캐릭터가 다른 동료('${companion.partnerName}')와 연인 관계라면, 플레이어의 로맨틱한 접근(사랑해, 사귀자, 데이트하자 등)을 단호히 거절하세요. 이 경우 불쾌함을 표시하며 호감도를 하락시켜야 합니다.**
    5. 답변 끝에 호감도/충성도 변화가 필요하다면 [AFF+1], [AFF-5], [LOY+2] 등의 태그를 포함하세요. (연인이 있는 캐릭터에게 플러팅 시 [AFF-5]를 권장합니다.)
    6. 답변은 2~3문장 내외로 간결하고 몰입감 있게 작성하세요.
    ${systemInjection ? `7. [추가 상황 지침]\n${systemInjection}` : ''}

    ${RELATION_DIALOGUE_GUIDELINES}
    
    [최근 대화 맥락]
    ${historyContext || "(이전 대화 없음)"}
    
    [플레이어의 메시지]
    "${message}"
    `;

    const ai = getAi();
    const result = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return result.text || "(...대답이 없습니다)";
  } catch (e) {
    return handleApiError(e, "(...대답이 없습니다)");
  }
};

/**
 * 성전 방문객과의 대화 기능
 */
export const chatWithVisitor = async (visitor: TempleVisitor, message: string, messenger?: Character, templeCity?: string): Promise<string> => {
    try {
        const history = visitor.templeChatHistory || [];
        const historyContext = history.slice(-5).map(h => 
            `${h.role === 'user' ? '사자' : visitor.name}: ${h.text}`
        ).join('\n');

        const relationContext = buildRelationContextForDialogue(visitor, messenger);

        const prompt = `
        당신은 RPG 게임의 성전 방문객 '${visitor.name}' 역할을 수행합니다.
        
        [방문객 프로필]
        이름: ${visitor.name}
        신분: ${visitor.classType}
        방문 목적: ${visitor.visitReason}
        성향: ${visitor.intendedAction} (Hostile: 적대적, PotentiallyHostile: 잠재적 적대, PotentiallyFriendly: 잠재적 우호, Peaceful: 우호적)
        
        [환경]
        장소: ${templeCity} 성전 접견실
        상대: ${messenger?.name} (신의 사자)

        [인물 관계망 정보]
        ${relationContext}
        
        [최근 대화]
        ${historyContext || "(첫 대화)"}

        [플레이어의 메시지]
        "${message}"
        
        [응답 지침]
        1. 한국어로 답변하십시오.
        2. 방문 목적과 현재 성향에 맞는 어조를 유지하십시오.
        3. 플레이어의 설득이나 태도에 따라 성향이 변할 수 있습니다. 
           - 만약 성향을 한 단계 우호적으로 바꾼다면 답변 끝에 [SET_DISPOSITION:NewStatus] 태그를 붙이세요. (예: PotentiallyHostile -> PotentiallyFriendly)
           - 'Hostile'은 매우 확고한 경우를 제외하고는 쉽게 변하지 않습니다.
        4. 답변은 2~3문장 내외로 작성하십시오.

        ${RELATION_DIALOGUE_GUIDELINES}
        `;

        const ai = getAi();
        const result = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        return result.text || "...용건만 말하시오.";
    } catch (e) {
        return handleApiError(e, "...침묵하고 있습니다.");
    }
};

/**
 * 플레이어의 현재 상태를 바탕으로 세계의 반응(커뮤니티 글) 생성
 */
export const generateWorldReactions = async (character: Character): Promise<WorldReaction[]> => {
    try {
        const companionsInfo = character.companions.map(c => 
            `${c.name}(레벨.${c.level}, ${c.job}, 관계:${c.isSpouse ? '배우자' : c.isLover ? '연인' : '동료'})`
        ).join(', ');

        const recentDeeds = character.memories?.slice(-10).join(' | ') || 'No major deeds yet';
        const currentMonth = character.currentDate ? parseInt(character.currentDate.split('-')[1]) : 1;
        const worldBossInfo = getDetailedWorldBossContext(currentMonth);
        const socialBondInfo = getNotableSocialNetworkContext(character);
        const validGeo = JSON.stringify(WORLD_GEOGRAPHY);

        const prompt = `
        당신은 판타지 세계의 거대한 차원 소셜 네트워크 '세상의 맥동' 엔진입니다. 
        이 세계의 주민들이 현재 벌어지는 사건들에 대해 작성한 8~10개의 커뮤니티 게시물을 생성하십시오.

        **중요: 이 세계는 게임이 아니라 실제 판타지 현실입니다.** 
        주민들은 레벨이나 신력을 게임 수치가 아니라, 실제 측정 가능한 마력의 농도나 육체적 레벨로 인식합니다. 
        '플레이어', '게임', '퀘스트'와 같은 용어 대신 '용병', '군인', '용사', '영웅', '사명', '의뢰' 등의 표현을 사용하십시오.

        [지리 정보 컨텍스트]
        ${validGeo}

        [플레이어 및 일행 현황]
        이름: ${character.name}, 레벨(Lv): ${character.level}, 보직: ${character.job}
        신력: ${character.shinryokuType}, 국적: ${character.nation}
        명성(RP): ${character.mercenaryData?.reputation || 0}, 악명: ${character.infamy || 0}
        최근 행적: ${recentDeeds}
        함께하는 인연: ${companionsInfo || '없음'}
        
        [전 세계 실제 보스 데이터]
        ${worldBossInfo}


        [플레이어의 유명한 과거 인연들]
        ${socialBondInfo}

        [작성 지침]
       1. **과거 인연 언급**: 
           - [플레이어의 유명한 과거 인연들(명성이나 공적이 5000 이상 높은 인물] 목록에 인물이 있다면, 그 중 한두 명의 활약상(예: "누가 이번에 어느 던전을 공략했다더라", "누가 무슨 계급으로 승진했다더라")에 대한 게시물을 1개 포함하십시오.

        2. **보스/마물 관련 게시물**: 
           - 반드시 위에서 제공한 [전 세계 실제 보스 데이터]에 있는 보스 이름과 위치를 사용하십시오.
           - 특히 [ACTIVE SEASONAL EVENT]에 언급된 보스에 대한 목격담이나 공포 섞인 글을 1-2개 포함하십시오.
           - 보스의 칭호를 사용하여 사실감을 더하십시오.

        3. **플레이어 인지도 규칙**:
           - 명성(RP)이나 공적(Merit)이 5000 미만인 경우, 플레이어는 아직 무명입니다.
           - 이 경우 플레이어 개인에 대한 언급을 배제하고, 월드 보스나 각 국의 유명인, 전쟁 소식 등을 생성하십시오.
        
        4. 다양한 카테고리를 포함하십시오:
           - "Player": 플레이어의 영웅담 혹은 악행 (명성/공적 1000 이상일 때만).
           - "Celebs": 각 국의 전설적인 인물들에 대한 소문.
           - "World": 월드 보스 출현 보고나 특정 지역의 이변. (제공된 보스 데이터 기반)
           - "Diplomacy": 국가 간의 전쟁, 동맹, 속국화에 대한 여론.
           - "Society": 학교 내 가십, 용병단 내부 갈등 등.
           - "Companion": 특정 도시의 '뒷골목'에서 플레이어를 만나길 고대하거나 파티원을 구하는 구인 광고성 소문.

        5. **스타일: 현실적이고 거친 인터넷 커뮤니티 말투를 사용하십시오.**
           - 판타지 용어와 현대적인 커뮤니티 신조어(ㄹㅇㅋㅋ, 실화냐, 개쩔음, 대박, 좆같네, 시발, 존나, ㅈㄴ, 개추, 존멋, 존잘, 존예 등)를 섞어 생동감을 높이십시오.
           - 적절한 비속어나 공격적인 말투를 섞어 실제 사람들이 열띤 토론을 벌이는 듯한 느낌을 주기 바랍니다. 아주 간혹, 친절한 사람도 존재합니다.

        6. 언어: 한국어 (KOREAN).

        **CRITICAL: 영입 소문 게시물 (category: 'Companion') 작성 시**:
        반드시 본문에 "[특정 도시명] 뒷골목" 이라는 키워드를 포함시키고, 'location' 필드에 해당 도시명을 정확히 입력하십시오.
        
        Output JSON:
        {
          "reactions": [
            {
              "id": "unique_string_id",
              "category": "Trending" | "News" | "Rumor" | "Companion",
              "title": "게시물 제목",
              "author": "닉네임",
              "authorTitle": "예: 성곽 경비병, 익명의 모험가",
              "content": "본문 내용",
              "location": "도시명 (Companion 카테고리인 경우 필수)",
              "likes": number,
              "views": number,
              "comments": [ { "author": "str", "text": "댓글내용", "time": "str" } ],
              "timestamp": "방금 전" | "1시간 전" | etc
            }
          ]
        }
        `;

        const ai = getAi();
        const result = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const data = JSON.parse(result.text || '{"reactions":[]}');
        return data.reactions;
    } catch (e) {
        console.error("AI World Reaction Generation Failed, using local fallback:", e);
        return generateLocalReactions(character);
    }
};

/**
 * [NEW] 공식 언론 기사 생성 - 플레이어 외 다양한 카테고리 포함
 */
export const generateNewsArticles = async (character: Character): Promise<NewsArticle[]> => {
    try {
        const recentDeeds = character.memories?.slice(-5).join(' | ') || '특별한 행적 없음';
        const validGeo = JSON.stringify(WORLD_GEOGRAPHY);
        const currentMonth = character.currentDate ? parseInt(character.currentDate.split('-')[1]) : 1;
        const worldBossInfo = getDetailedWorldBossContext(currentMonth);
        const socialBondInfo = getNotableSocialNetworkContext(character);
        const prompt = `
        당신은 이 판타지 세계의 가장 공신력 있는 언론사 '제국 전보'의 수석 편집장입니다.
        전 세계에서 벌어지는 중대한 사건들에 대한 5개의 공식 기사를 작성하십시오.

        **이 세계는 실제 현실입니다.** 보도는 엄중하고 사실에 기반해야 합니다.

        [지리 정보 컨텍스트]
        ${validGeo}

        [플레이어 인지도 현황]
        이름: ${character.name}, 국적: ${character.nation}, 보직: ${character.job}
        명성(RP): ${character.mercenaryData?.reputation || 0}, 공적: ${character.militaryData?.merit || 0}
        
        [전 세계 실제 보스 데이터]
        ${worldBossInfo}

        [플레이어의 유명한 과거 인연들]
        ${socialBondInfo}

        [작성 지침]
  1. **과거 인연 보도**: 
           - [플레이어의 유명한 과거 인연들] 중 한 명에 대해 심층 보도 기사를 1개 작성하십시오.
           - 그의 현재 지위(대장장이 명공, 용병 단장 등)와 업적을 다루십시오.
        2. **보도 제한 규칙**:
           - 명성(RP)이나 공적(Merit)이 10000 미만인 경우, 플레이어는 기사화될 급이 아닙니다.
           - 플레이어 대신, 제공된 [전 세계 실제 보스 데이터]를 바탕으로 보스 몬스터의 위협이나 토벌 소식을 다루십시오. 특히 시즌 보스 출현 정보를 중요하게 보도하십시오.

        3. 어조: 공식적이고 신중하며, 때로는 극적인 언론체.
        4. 카테고리: "Trending", "News", "Politics", "Society".
       5. 언어: 한국어 (KOREAN).
        
        Output JSON:
        {
          "articles": [
            {
              "id": "news_id",
              "category": "Trending" | "News" | "Rumor",
              "title": "기사 제목",
              "author": "기자 이름",
              "authorTitle": "정규 취재팀",
              "content": "기사 본문 내용 (상세하게)",
              "location": "컨텍스트 내 유효한 도시/국가 명칭",
              "source": "언론사 명칭 (예: 제국 일보, 숲의 전령사, 투기장 소식지)",
              "likes": number,
              "views": number,
              "comments": [ { "author": "독자닉", "text": "댓글내용", "time": "1시간 전" } ],
              "timestamp": "오늘 오전"
            }
          ]
        }
        `;

        const ai = getAi();
        const result = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const data = JSON.parse(result.text || '{"articles":[]}');
        return data.articles;
    } catch (e) {
        console.error("AI News Article Generation Failed, using local fallback:", e);
        return generateLocalNews(character);
    }
};

/**
 * [NEW] 인터뷰 데이터 생성 - 지연 생성 로직 반영
 */
export const generateInterviewQuestions = async (character: Character, skeleton?: InterviewData): Promise<InterviewData> => {
    try {
        const recentDeeds = character.memories?.slice(-8).join(' | ') || '특별한 행적 없음';
        const comps = character.companions.map(c => `${c.name}(${c.classType}, 레벨.${c.level})`).join(', ');
        
        const prompt = `
        당신은 영웅적 인물이나 논란의 인물을 취재하는 베테랑 기자입니다. 플레이어에게 심도 있는 인터뷰를 진행하려 합니다.
        
        [인터뷰어 정보]
        이름: ${skeleton?.interviewer || "무명 기자"}
        소속: ${skeleton?.interviewerTitle || "차원 통신"}
        
        [플레이어 최신 컨텍스트]
        이름: ${character.name}, 보직: ${character.job}, 레벨: ${character.level}
        최근 행적: ${recentDeeds}
        동료(팀원): ${comps || '없음'}
        
        [작업 지침]
        1. 플레이어의 최근 행적[${recentDeeds}]과 소속 팀원[${comps}] 정보를 바탕으로 3~4개의 날카롭고 흥미로운 질문을 생성하십시오.
        2. 질문은 다음을 포함해야 합니다:
           - 현재 보직(${character.job})에 대한 포부나 불만.
           - 최근 행적 중 가장 인상 깊은 사건에 대한 비하인드 스토리.
           - 동료들과의 신뢰 관계 혹은 갈등에 대한 질문.
           - 앞으로 세계에 미치고 싶은 영향력.
        3. 각 질문에는 3개의 선택형 답변 옵션을 제공하십시오.
        4. 각 답변에 따라 평판(repGain), 공적(meritGain), 악명(infamyGain)의 변화량을 설정하십시오. (범위: -20 ~ 20)
        5. "reaction" 필드에는 해당 답변을 들었을 때 기자가 보여줄 서사적인 반응(맞장구, 놀람, 기록 등)을 작성하십시오.
        6. 언어: 한국어 (KOREAN).
        
        Output JSON:
        {
          "id": "${skeleton?.id || `int_${Date.now()}`}",
          "interviewer": "${skeleton?.interviewer || "기자"}",
          "interviewerTitle": "${skeleton?.interviewerTitle || "보도국"}",
          "topic": "영웅 혹은 악당, ${character.name}의 진실",
          "questions": [
            {
              "question": "질문 내용",
              "isDirectAnswer": true,
              "options": [
                {
                  "text": "답변 예시",
                  "meritGain": number,
                  "repGain": number,
                  "infamyGain": number,
                  "reaction": "기자의 서사적 반응"
                }
              ]
            }
          ]
        }
        `;

        const ai = getAi();
        const result = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        return JSON.parse(result.text || '{}');
    } catch (e) {
        console.error("AI Interview Question Generation Failed, using local fallback:", e);
        return generateLocalInterview(character, skeleton);
    }
};

/**
 * [NEW] 플레이어의 직접 입력 답변을 평가하는 AI 기능
 */
export const evaluateInterviewAnswer = async (
    question: string, 
    answer: string, 
    character: Character,
    interviewer: string
): Promise<{ meritGain: number, repGain: number, infamyGain: number, reaction: string }> => {
    try {
        const prompt = `
        당신은 인터뷰를 진행 중인 기자 '${interviewer}'입니다.
        [질문] ${question}
        [플레이어의 주관식 답변] "${answer}"
        
        [플레이어 정보] 이름: ${character.name}, 레벨: ${character.level}, 보직: ${character.job}

        작업: 플레이어의 답변을 분석하여 결과를 도출하십시오.
        1. "meritGain": (정수) 국가에 대한 충성도나 군사적 가치.
        2. "repGain": (정수) 용병으로서의 명성이나 대중적 인기.
        3. "infamyGain": (정수) 이 답변이 얼마나 반사회적이거나 잔혹하게 들리는가.
        4. "reaction": 기자의 반응 서사 (한국어).
        
        분석 로직:
        - 영웅적이고 겸손하면: 높은 명성/공적.
        - 오만하거나 잔인하면: 높은 악명, 낮은 명성.
        - 지적이고 통찰력 있으면: 중간 이상의 명성/공적.
        
        Output JSON:
        { "meritGain": number, "repGain": number, "infamyGain": number, "reaction": "기자의 반응..." }
        `;

        const ai = getAi();
        const result = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        return JSON.parse(result.text || '{"meritGain":0, "repGain":0, "infamyGain":0, "reaction":"..."}');
    } catch (e) {
        return { meritGain: 0, repGain: 5, infamyGain: 0, reaction: "기자는 당신의 답변을 흥미롭게 받아적습니다." };
    }
};

/**
 * 사용자의 댓글에 대한 AI 응답 생성
 */
export const generateCommentReply = async (post: WorldReaction, userComment: string, character: Character): Promise<{ author: string, text: string, time: string }> => {
    try {
        const prompt = `
        당신은 판타지 세계의 커뮤니티 게시판 사용자입니다. 
        **이 세계는 실제 현실이며, 당신은 그 세계 속에 살고 있는 주민입니다.**
        
        [게시물] 제목: ${post.title}, 작성자: ${post.author} (${post.authorTitle})
        [댓글 작성자] ${character.name}: "${userComment}"
        
        작업: 플레이어의 댓글에 대해 다른 주민으로서 짧고 사실적인 대댓글(1문장)을 작성하십시오.
        - 작성자는 원글 작성자일 수도 있고, 지나가는 제3자일 수도 있습니다.
        - 어조: **실제 커뮤니티의 날것 그대로인 말투를 사용하십시오. 적절한 신조어와 약간의 비속어 사용이 허용됩니다. 아주 간혹 친절한 말투도 허용됩니다.**
        - 언어: 한국어 (KOREAN).
        
        Output JSON: { "author": "str", "text": "str", "time": "방금 전" }
        `;

        const ai = getAi();
        const result = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        return JSON.parse(result.text || '{"author": "익명", "text": "ㄹㅇㅋㅋ", "time": "방금 전"}');
    } catch (e) {
        const fallbackAuthors = [post.author, "지나가는 모험가", "선술집 단골", "뒷골목 정보원", "아카데미 연구원", "익명의 음유시인", "전직 용병", "성곽 수비병"];
        const randomAuthor = fallbackAuthors[Math.floor(Math.random() * fallbackAuthors.length)];
        const fallbackReplies = [
            `ㄹㅇ ${character.name} 님 말씀에 극공감합니다 ㅋㅋ`,
            "이게 맞지 팩트 그 자체네",
            "오 진짜요? 저도 그렇게 생각했는데 신기하네요",
            "와 본인 등판 실화냐?? ㄷㄷ",
            "저번에 그 사건 맞죠? 대박이었는데",
            "거기 위치 정확히 어디인지 쪽지 주실 수 있나요?",
            "개추 누르고 갑니다 ㅋㅋㅋ",
            "다음에는 저도 파티에 껴주십쇼!",
            "역시 실력자라 보는 눈이 다르시네",
            "이건 인정할 수밖에 없네요 ㄹㅇ"
        ];
        const randomText = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
        return { author: randomAuthor, text: randomText, time: "방금 전" };
    }
};

/**
 * 전역 API 에러 핸들러
 */
const handleApiError = (error: any, fallbackValue: any) => {
  const msg = (error?.message || '').toLowerCase();
  
  if (msg.includes('requested entity was not found')) {
    window.dispatchEvent(new CustomEvent('gemini-api-key-reset'));
    console.error("Gemini API Key error: Requested entity was not found.");
  }

  if (msg.includes('quota') || msg.includes('429')) {
    alert("⚠️ AI 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.");
  }
  
  return fallbackValue;
};

const sanitizeJsonText = (text: string): string => {
    let sanitized = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    return sanitized;
};

async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, delay = 2000): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        if (maxRetries > 0 && (error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429)) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryOperation(operation, maxRetries - 1, delay * 2);
        }
        throw error;
    }
}

export const initializeGameWithCharacter = async (characterData: any): Promise<GameResponse> => {
  try {
    return await retryOperation(async () => {
        const ai = getAi();
        chatSession = ai.chats.create({
          model: GEMINI_FLASH_MODEL,
          config: {
            systemInstruction: SYSTEM_PROMPT + STATUS_STRICT_PROMPT,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        });

        const prompt = `START_WITH_DATA: ${JSON.stringify(characterData)}`;
        const response = await chatSession.sendMessage({ message: prompt });
        
        let text = sanitizeJsonText(response.text || '');
        if (!text) throw new Error("Empty response");
        return JSON.parse(text) as GameResponse;
    });
  } catch (error) {
    return handleApiError(error, {
      narrative: "⚠️ AI 통신 상태가 원활하지 않습니다. API 키 설정을 확인하거나 잠시 후 다시 시도해주세요.",
      choices: ["행동 재시도"],
      sceneType: "creation",
      characterUpdate: {
          ...INITIAL_CHARACTER,
          ...characterData
      }
    });
  }
};

export const resumeGame = async (historyMessages: { role: string, text: string }[], currentCharacter: Character): Promise<void> => {
    try {
        const history = historyMessages.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        const ai = getAi();
        chatSession = ai.chats.create({
            // [FIX] Always use gemini-3-pro-preview for complex tasks (like resuming session context) as per guidelines
            model: GEMINI_PRO_MODEL,
            config: {
                systemInstruction: SYSTEM_PROMPT + STATUS_STRICT_PROMPT,
                responseMimeType: "application/json",
                responseSchema: schema,
            },
            history: history
        });
    } catch (error) {
        handleApiError(error, null);
    }
};

export const sendPlayerAction = async (action: string, currentPlayerState: Character, currentCombatState?: CombatState): Promise<GameResponse> => {
  if (!chatSession) {
     return initializeGameWithCharacter(currentPlayerState);
  }

  try {
    return await retryOperation(async () => {
        const ai = getAi();
        
        const { total: playerTotalStats, bonus: playerBonusStats } = calculateTotalStats(currentPlayerState);
        
        const playerStatsInfo = `
        [STAT INFORMATION]
        Base Stats (No Gear): STR ${currentPlayerState.stats.str}, INT ${currentPlayerState.stats.int}, DEF ${currentPlayerState.stats.def}, AGI ${currentPlayerState.stats.agi}, WIS ${currentPlayerState.stats.wis}, CTRL ${currentPlayerState.stats.ctrl}
        Current Gear Bonus: STR +${playerBonusStats.str}, INT +${playerBonusStats.int}, DEF +${playerBonusStats.def}, AGI +${playerBonusStats.agi}, WIS +${playerBonusStats.wis}, CTRL +${playerBonusStats.ctrl}
        Current Combat Resource: HP ${currentPlayerState.stats.hp}/${playerTotalStats.maxHp}, MP ${currentPlayerState.stats.mp}/${playerTotalStats.maxMp}
        `;

        const isOneOnOne = currentCombatState && ['tournament', 'arena', 'exam_mid', 'exam_final'].includes(currentCombatState.type || '');
        const oneOnOneInstruction = isOneOnOne ? `\n**IMPORTANT: This is a formal 1:1 DUEL/EXAM.** Only the player and the primary opponent are involved. Companions are watching from the sidelines and MUST NOT participate or be described as active in this combat narrative.` : "";

        const contextMessage = `
        [플레이어: ${currentPlayerState.name} 레벨.${currentPlayerState.level}]
        ${playerStatsInfo}
        행동: ${action}
        ${oneOnOneInstruction}

        **INSTRUCTION: HYBRID ENGINE MODE**
        Please describe the narrative and provide ONLY the DELTA (changed fields) in "characterUpdate". 
        If you update stats, ONLY update the BASE values. DO NOT include equipment bonuses in the updated values.
        If a field is unchanged, OMIT it from the JSON response.

        **NOTE ON BUFF/HEAL SKILLS**: If the action is a buff or healing skill (e.g. status increase, recovery, barrier, buff), DO NOT describe it as an offensive attack (like "강력한 일격을 날립니다", "공격을 날립니다" or "베어버립니다"). Instead, describe it elegantly as channeling divine energy, casting protective barriers, or enveloping the target in a therapeutic aura.
        `;

        const response = await chatSession.sendMessage({ message: contextMessage });
        let text = sanitizeJsonText(response.text || '');
        if (!text) throw new Error("Empty response");
        return JSON.parse(text) as GameResponse;
    });
  } catch (error) {
    return handleApiError(error, {
      narrative: "죄송합니다. 요청을 처리하는 중에 문제가 발생했습니다.",
      choices: ["행동 재시도"],
      sceneType: "normal"
    });
  }
};