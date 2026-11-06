import { Character, SimpleStudent, JobType, MilitaryRank, Item, ItemRarity } from '../types';
import { generateName, generateDefaultVisualUrl, generateCompanionStats } from '../utils';
import { RescuedPersonInfo } from '../components/RescueGratitudeModal';

interface RescueArchetype {
    jobType: JobType;
    jobName: string;
    classType: string;
    storyTemplates: string[];
    speechTemplates: string[];
    createRewardItem: () => Item;
    rewardGoldMin: number;
    rewardGoldMax: number;
}

// JobType에 정의된 실제 13가지 직업만 사용 (왕자, 공주, 국왕, 왕실 기사단장, 마신, 제너럴, 사자 등 특수 지위 제외)
// 보답 아이템(RewardItem)은 게임 내 실제로 존재하는 유효한 아이템 데이터로 지급
const RESCUE_ARCHETYPES: RescueArchetype[] = [
    {
        jobType: JobType.MINER,
        jobName: JobType.MINER,
        classType: JobType.MINER,
        storyTemplates: [
            '희귀한 마나 광맥과 보석 원석을 채굴하러 갱도 깊숙이 들어왔다가 갑작스러운 낙반 사고로 탈출로가 막혀 칠흑 같은 어둠 속에 고립되어 있었습니다.',
            '폐광 심층부의 고대 광맥을 조사하던 중 흉포한 마수 무리를 만나 곡괭이 하나에 의지한 채 바위틈에 숨어 있었습니다.'
        ],
        speechTemplates: [
            '바위를 치우고 나타나신 당신의 모습이 마치 한 줄기 구원의 빛 같았습니다! 횃불도 꺼지고 마지막 호흡을 세고 있었는데... 살려주셔서 정말 감사합니다! 이 은혜는 평생토록 잊지 않겠습니다.',
            '두드려도 응답이 없던 어둠 속에서 저를 꺼내주셨습니다! 제 생명의 은인이십니다. 살아 돌아가면 평생 은인님의 무운을 빌겠습니다!'
        ],
        createRewardItem: (): Item => ({
            id: `rescue_loot_miner_${Date.now()}`,
            name: '마나석',
            type: 'SubWeapon',
            rarity: ItemRarity.MAGIC,
            description: '순도 높은 고품질 마나석입니다. 광부가 던전 깊은 곳에서 목숨 걸고 캐낸 귀중한 보답품입니다.',
            stats: { int: 15 },
            secondaryOptions: ['MP +2%'],
            price: 30000,
            imageUrl: 'https://i.ibb.co/VYkq0s4k/Gemini-Generated-Image-ooeaz2ooeaz2ooea.png'
        }),
        rewardGoldMin: 8000,
        rewardGoldMax: 14000
    },
    {
        jobType: JobType.ALCHEMIST,
        jobName: JobType.ALCHEMIST,
        classType: JobType.ALCHEMIST,
        storyTemplates: [
            '던전 깊은 곳에서만 자생하는 신비한 마력 약초와 시약을 채취해 비약을 연구하려다 마수들의 습격을 받고 방어 포션을 소진한 채 갇혀 있었습니다.',
            '고대 연금술 제단의 마력 흐름을 실측하러 들어왔다가 마력 폭주로 밀실 결계 안에 고립되어 있었습니다.'
        ],
        speechTemplates: [
            '방어 물약도 다 떨어지고 플라스크까지 깨져 꼼짝없이 마수들의 먹이가 되는 줄 알았습니다... 저를 구원해주셔서 정말 감사합니다! 연금술사로서 평생 은인님께 보답하겠습니다.',
            '눈앞이 캄캄하던 순간에 기적처럼 나타나주셨군요! 제 목숨을 건져주신 고마운 분, 이 귀한 은혜는 결코 잊지 않겠습니다!'
        ],
        createRewardItem: (): Item => ({
            id: `rescue_loot_alchemist_${Date.now()}`,
            name: '엘릭서',
            type: 'Consumable',
            rarity: ItemRarity.UNIQUE,
            description: 'HP와 MP를 100% 완전 회복시키는 기적의 비약입니다. 연금술사가 감사의 눈물과 함께 건넸습니다.',
            secondaryOptions: ['HP 100% 회복', 'MP 100% 회복'],
            price: 100000,
            imageUrl: 'https://i.ibb.co/cSZMwD69/5.png'
        }),
        rewardGoldMin: 9000,
        rewardGoldMax: 15000
    },
    {
        jobType: JobType.BLACKSMITH,
        jobName: JobType.BLACKSMITH,
        classType: JobType.BLACKSMITH,
        storyTemplates: [
            '전설적인 명검을 벼리기 위한 희귀 용암석과 정제 광물을 채취하러 동굴 깊은 곳에 잠입했다가 마수들의 포위망에 갇혀 있었습니다.',
            '담금질에 쓸 특수 지하 수맥을 탐사하다가 퇴로가 무너져 배낭을 안고 며칠간 구조를 기다리고 있었습니다.'
        ],
        speechTemplates: [
            '망치질만 할 줄 알았지 싸움엔 젬병이라 꼼짝없이 괴물의 밥이 될 뻔했습니다... 목숨을 구해주신 은인님께 훗날 반드시 최고의 장비를 만들어 보답하겠습니다!',
            '광석 배낭을 껴안고 바들바들 떨고 있었습니다. 저를 구원해주신 은혜는 대장간의 불꽃처럼 가슴속에 깊이 간직하겠습니다!'
        ],
        createRewardItem: (): Item => ({
            id: `rescue_loot_blacksmith_${Date.now()}`,
            name: '강철 검',
            type: 'Weapon',
            weaponType: 'Sword',
            rarity: ItemRarity.MAGIC,
            description: '잘 제련된 날카로운 강철 검입니다. 대장장이가 가장 아끼던 수작입니다.',
            stats: { str: 25 },
            secondaryOptions: ['물리 공격력 +10%'],
            price: 25000,
            imageUrl: 'https://i.ibb.co/qGb8FPt/7.png'
        }),
        rewardGoldMin: 8000,
        rewardGoldMax: 13000
    },
    {
        jobType: JobType.MERCENARY,
        jobName: JobType.MERCENARY,
        classType: JobType.MERCENARY,
        storyTemplates: [
            '의뢰를 수행하고자 호기롭게 던전에 발을 들였다가 강력한 마수 무리를 만나 동료들과 흩어지고 부상을 입은 채 방어 태세를 유지하고 있었습니다.',
            '토벌 임무 중 미궁의 함정에 빠져 독안개 구역에 갇힌 채 탈출로를 찾지 못하고 탈진해 있었습니다.'
        ],
        speechTemplates: [
            '무기도 부러지고 포위된 채 마지막을 각오하고 있었습니다... 끝까지 포기하지 않고 저를 찾아내 구출해주셔서 진심으로 머리 숙여 감사드립니다. 같은 무인으로서 이 은혜는 반드시 갚겠습니다!',
            '동료들과 흩어져 홀로 차가운 바닥에서 쓰러지는 줄 알았습니다... 따뜻한 구원의 손길을 내밀어주셔서 정말 고맙습니다!'
        ],
        createRewardItem: (): Item => ({
            id: `rescue_loot_mercenary_${Date.now()}`,
            name: '특급 HP 포션',
            type: 'Consumable',
            rarity: ItemRarity.RARE,
            description: 'HP 3500을 즉시 회복하는 최고급 회복 포션입니다. 노련한 용병의 비상 생명줄이었습니다.',
            secondaryOptions: ['HP 3500 회복'],
            price: 15000,
            imageUrl: 'https://i.ibb.co/FLhVqT71/3.png'
        }),
        rewardGoldMin: 7000,
        rewardGoldMax: 12000
    },
    {
        jobType: JobType.SOLDIER,
        jobName: JobType.SOLDIER,
        classType: JobType.SOLDIER,
        storyTemplates: [
            '전방 위험 구역의 정찰 및 국경 수색 임무를 수행하던 중 기습을 받아 지하 밀실에 고립되어 아군의 지원을 간절히 기다리고 있었습니다.',
            '국경 순찰 도중 던전 마수들의 이상 징후를 추적하다가 함정에 빠져 통신이 두절된 채 버티고 있었습니다.'
        ],
        speechTemplates: [
            '포위망에 갇혀 마지막 무기까지 소진하고 있었습니다... 위험을 무릅쓰고 적진을 뚫고 구하러 와주셔서 정말 감격스럽습니다! 군인의 명예를 걸고 이 은혜는 결코 잊지 않겠습니다!',
            '군인의 본분을 다하다 차가운 흙더미에 묻히는 줄 알았는데, 지휘관님의 영웅적인 구조로 다시 살았습니다. 평생 잊지 않겠습니다!'
        ],
        createRewardItem: (): Item => ({
            id: `rescue_loot_soldier_${Date.now()}`,
            name: '군용 고농축 포션',
            type: 'Consumable',
            rarity: ItemRarity.MAGIC,
            description: '군단에서 정규 보급되는 강력한 회복약입니다. 조난 군인이 건넨 군용 보급품입니다.',
            secondaryOptions: ['HP 1500 회복', 'MP 500 회복'],
            price: 20000,
            imageUrl: 'https://i.ibb.co/0jFJvPjb/Gemini-Generated-Image-ommkoiommkoiommk.png'
        }),
        rewardGoldMin: 8000,
        rewardGoldMax: 14000
    },
    {
        jobType: JobType.RESEARCHER,
        jobName: JobType.RESEARCHER,
        classType: JobType.RESEARCHER,
        storyTemplates: [
            '고대 문명의 석판과 비석을 탁본하고 마법 유적의 기운을 실측하던 중 고대 함정이 작동해 지하 폐쇄 구역에 고립되어 있었습니다.',
            '던전 생태계의 이상 마력 변동을 조사하던 중 몬스터 무리에게 가방을 빼앗기고 동굴 틈새에 숨어 있었습니다.'
        ],
        speechTemplates: [
            '학술적 탐구심에 눈이 멀어 분수를 모르고 깊이 들어왔다가 차가운 유골이 될 뻔했습니다... 제 생명을 건져주신 고마운 분, 당신의 이름을 연구 일지에 영원히 기록하겠습니다!',
            '공기가 희박해져 의식을 잃어가고 있었는데 기적처럼 문을 열고 나타나주셨군요! 제 목숨을 살려주신 은혜를 영원히 가슴 깊이 간직하겠습니다.'
        ],
        createRewardItem: (): Item => ({
            id: `rescue_loot_researcher_${Date.now()}`,
            name: '모든 속성 저항 영약',
            type: 'Consumable',
            rarity: ItemRarity.EPIC,
            description: '1회 전투 동안 모든 속성 저항을 대폭 증가시키는 영약입니다. 연구원이 직접 연구한 성과물입니다.',
            secondaryOptions: ['모든 속성 저항 +25%'],
            price: 80000,
            imageUrl: 'https://i.ibb.co/cSZMwD69/5.png'
        }),
        rewardGoldMin: 8000,
        rewardGoldMax: 15000
    },
    {
        jobType: JobType.CHEF,
        jobName: JobType.CHEF,
        classType: JobType.CHEF,
        storyTemplates: [
            '전설의 요리에 들어갈 희귀한 던전 버섯과 천연 향신료를 구하려다 길을 잃고 식량 창고 바위틈에 숨어 있었습니다.',
            '최고급 연회에 쓸 특수 식재료를 채취하러 들어왔다가 마수의 영역에 갇혀 식칼 하나를 쥐고 떨고 있었습니다.'
        ],
        speechTemplates: [
            '마수들에게 제 몸이 요리 재료가 될 뻔한 절체절명의 순간이었습니다! 저를 살려주셔서 눈물이 멈추지 않습니다... 살아 돌아가면 평생 은인님께 최고의 음식을 대접하겠습니다!',
            '음식 냄새를 맡고 몰려온 마수들 때문에 숨도 못 쉬고 있었습니다. 절망 속에서 저를 꺼내주신 은혜, 평생 잊지 않겠습니다!'
        ],
        createRewardItem: (): Item => ({
            id: `rescue_loot_chef_${Date.now()}`,
            name: '스테이크',
            type: 'Consumable',
            rarity: ItemRarity.RARE,
            description: '든든한 최고급 스테이크 요리입니다. HP를 300 회복하고 피로도를 25 회복합니다.',
            stats: { hp: 300 },
            secondaryOptions: ['피로도 25 회복'],
            price: 80000,
            imageUrl: 'https://i.ibb.co/NcDZkPV/Gemini-Generated-Image-rq3p8qrq3p8qrq3p.png'
        }),
        rewardGoldMin: 7000,
        rewardGoldMax: 12000
    },
    {
        jobType: JobType.FARMER,
        jobName: JobType.FARMER,
        classType: JobType.FARMER,
        storyTemplates: [
            '던전 인근 밭에서 농사를 짓던 중 마수가 농경지를 습격해 가축을 던전 안으로 끌고 가자 이를 되찾으려 쫓아왔다가 길을 잃고 탈진해 있었습니다.',
            '비옥한 토양의 기운을 머금은 희귀 씨앗을 찾으러 던전 초입에 발을 들였다가 지반 붕괴로 굴러떨어졌습니다.'
        ],
        speechTemplates: [
            '무모하게 덤볐다가 괴물들의 소굴에 갇혀 가족들의 얼굴도 다시 못 볼 뻔했습니다... 저를 꺼내주신 은인님 덕분에 다시 흙을 밟을 수 있게 되었습니다. 정말 감사드립니다!',
            '캄캄한 동굴 속에서 울기만 하던 시골 농부를 구해내 주셨습니다. 은인님의 은혜를 평생 마음에 품고 살겠습니다!'
        ],
        createRewardItem: (): Item => ({
            id: `rescue_loot_farmer_${Date.now()}`,
            name: '만능 영약',
            type: 'Consumable',
            rarity: ItemRarity.EPIC,
            description: '모든 것을 회복시키는 귀한 영약입니다. HP와 MP를 500 회복하며 피로도를 50 회복합니다.',
            stats: { hp: 500, mp: 500 },
            secondaryOptions: ['피로도 50 회복'],
            price: 1200000,
            imageUrl: 'https://i.ibb.co/1J7XGLRp/Gemini-Generated-Image-29rrw029rrw029rr.png'
        }),
        rewardGoldMin: 6000,
        rewardGoldMax: 10000
    },
    {
        jobType: JobType.BREEDER,
        jobName: JobType.BREEDER,
        classType: JobType.BREEDER,
        storyTemplates: [
            '야생 영수와 신비로운 생명체의 번식 서식지를 탐색하던 중 난폭해진 던전 맹수의 기습을 받아 바위 틈새에 고립되어 있었습니다.',
            '다친 어린 마수 새끼를 치료하고 방사하려다 어미 마수의 오해를 사서 동굴 구석에 갇혀 있었습니다.'
        ],
        speechTemplates: [
            '동물들을 돌보던 제가 오히려 맹수들의 먹잇감이 될 뻔했습니다... 위험한 동굴 속까지 뛰어들어 저를 건져내 주신 은혜, 평생 잊지 않고 보답하겠습니다!',
            '사나운 짐승들의 울음소리에 밤새 떨고 있었습니다. 따뜻한 손을 내밀어주셔서 정말 감사드립니다!'
        ],
        createRewardItem: (): Item => ({
            id: `rescue_loot_breeder_${Date.now()}`,
            name: '상급 포획 그물',
            type: 'Consumable',
            rarity: ItemRarity.RARE,
            description: '야생 몬스터를 안전하게 포획할 수 있는 고급 그물입니다. 레벨 80 이하의 몬스터를 포획할 수 있습니다.',
            secondaryOptions: ['몬스터 포획(80)'],
            price: 45000,
            imageUrl: 'https://i.ibb.co/SwhGkwMS/Gemini-Generated-Image-22cot722cot722co.png'
        }),
        rewardGoldMin: 7000,
        rewardGoldMax: 11000
    },
    {
        jobType: JobType.TRAINER,
        jobName: JobType.TRAINER,
        classType: JobType.TRAINER,
        storyTemplates: [
            '신체 한계를 돌파하기 위한 극한의 던전 단련 코스에 홀로 도전했다가 치명적인 독 마수에 물려 쓰러져 있었습니다.',
            '제자들의 담력을 시험할 훈련 코스를 사전 답사하던 중 갑작스러운 함정에 빠져 다리를 다쳤습니다.'
        ],
        speechTemplates: [
            '몸을 단련하려다 목숨을 잃을 뻔한 어리석은 저를 일으켜 세워주셨습니다! 이 뜨거운 은혜, 앞으로 더 강하고 올바른 사람이 되어 세상에 보답하겠습니다!',
            '체력도 다하고 숨이 멎어가던 순간에 저를 업고 나와주셨군요. 제 인생의 가장 위대한 영웅이십니다!'
        ],
        createRewardItem: (): Item => ({
            id: `rescue_loot_trainer_${Date.now()}`,
            name: '활력의 물약',
            type: 'Consumable',
            rarity: ItemRarity.MAGIC,
            description: '일시적으로 신체 공격력을 끌어올리는 귀한 활력 물약입니다.',
            secondaryOptions: ['STR +5%'],
            price: 15000,
            imageUrl: 'https://i.ibb.co/FThpY9q/Gemini-Generated-Image-8o5ck98o5ck98o5c.png'
        }),
        rewardGoldMin: 7000,
        rewardGoldMax: 12000
    },
    {
        jobType: JobType.STUDENT,
        jobName: JobType.STUDENT,
        classType: JobType.STUDENT,
        storyTemplates: [
            '아카데미의 던전 과제와 야외 실습을 수행하던 도중 급작스러운 지형 붕괴로 동급생들과 낙오되어 공포에 질려 방어 결계에 웅크리고 있었습니다.',
            '실전 경험을 쌓고자 동아리 친구들과 함께 왔다가 몬스터를 만나 뿔뿔이 흩어져 미궁 속을 헤매고 있었습니다.'
        ],
        speechTemplates: [
            '마력이 다 떨어져 정말 죽는 줄 알았습니다... 무서워서 울고만 있던 저를 이렇게 구해주셔서 정말 감사합니다! 훌륭한 인재로 성장하여 은인님의 은혜를 반드시 갚겠습니다!',
            '부모님 얼굴도 다시 못 볼 줄 알았습니다... 저를 살려주신 고마운 분, 평생 이 은혜를 가슴에 새기겠습니다!'
        ],
        createRewardItem: (): Item => ({
            id: `rescue_loot_student_${Date.now()}`,
            name: '룬 문양 반지',
            type: 'Accessory',
            rarity: ItemRarity.MAGIC,
            description: '희미한 마력 룬이 새겨진 마법 반지입니다. 학생이 은인에게 소중히 건넨 보답품입니다.',
            stats: { int: 8, wis: 8 },
            secondaryOptions: ['최대 MP +5%'],
            price: 25000,
            imageUrl: 'https://i.ibb.co/35yMc1WV/Kakao-Talk-20251224-165703403.png'
        }),
        rewardGoldMin: 6000,
        rewardGoldMax: 10000
    },
    {
        jobType: JobType.TEACHER,
        jobName: JobType.TEACHER,
        classType: JobType.TEACHER,
        storyTemplates: [
            '미궁에 조난당한 학생들을 찾으러 홀로 수색에 나섰다가 강력한 네임드 몬스터의 습격을 받아 마나를 전부 소진하고 깊은 방에 갇혀 있었습니다.',
            '현장 학습 답사 도중 던전 마력의 왜곡으로 닫힌 차원석실에 갇혀 지원을 애타게 기다리고 있었습니다.'
        ],
        speechTemplates: [
            '학생들을 구하러 왔다가 제가 먼저 쓰러질 뻔했는데, 당신께서 제 목숨을 살려주셨습니다. 은인님의 고귀한 용기와 헌신에 깊은 존경과 감사를 표합니다!',
            '마나가 고갈되어 절망하고 있던 순간에 문을 열어주셨습니다. 교육자로서 평생 은인님의 은혜에 보답하겠습니다.'
        ],
        createRewardItem: (): Item => ({
            id: `rescue_loot_teacher_${Date.now()}`,
            name: '마법 방어 주문서',
            type: 'Consumable',
            rarity: ItemRarity.RARE,
            description: '1회 전투 동안 마법 방어력을 크게 증가시키는 고위 방어 주문서입니다.',
            secondaryOptions: ['마법 방어력 +25%'],
            price: 30000,
            imageUrl: 'https://i.ibb.co/35tcVwdj/3.png'
        }),
        rewardGoldMin: 9000,
        rewardGoldMax: 16000
    },
    {
        jobType: JobType.HOUSEKEEPER,
        jobName: JobType.HOUSEKEEPER,
        classType: JobType.HOUSEKEEPER,
        storyTemplates: [
            '주인 가문의 오래된 유품을 수습하고 정화수를 채수하러 동굴 깊은 곳에 들어왔다가 마수들의 추적을 피해 비좁은 틈새에 숨어 있었습니다.',
            '저택의 중요한 보물을 회수하러 들어왔다가 무너진 잔해에 갇혀 구조를 기다리고 있었습니다.'
        ],
        speechTemplates: [
            '어둠 속에서 며칠 동안 숨을 죽이고 떨고 있었습니다... 저를 어둠 속에서 꺼내주신 은인님께 제 남은 생애를 다해 감사와 충심을 바치겠습니다!',
            '가문으로 돌아가지 못하고 홀로 스러지는 줄 알았습니다. 살아 숨 쉬게 해주신 은인님께 진심으로 머리 숙여 감사드립니다!'
        ],
        createRewardItem: (): Item => ({
            id: `rescue_loot_housekeeper_${Date.now()}`,
            name: '수호의 아뮬렛',
            type: 'Accessory',
            rarity: ItemRarity.RARE,
            description: '방어의 가호가 서린 고급 아뮬렛입니다. 은인의 무사안녕을 비는 마음이 깃들어 있습니다.',
            stats: { def: 15, wis: 15 },
            secondaryOptions: ['모든 속성 저항 +5%'],
            price: 120000,
            imageUrl: 'https://i.ibb.co/HZQsTzH/Gemini-Generated-Image-j5bijcj5bijcj5bi.png'
        }),
        rewardGoldMin: 7000,
        rewardGoldMax: 12000
    }
];

export interface CreateRescuedResult {
    rescuedPerson: SimpleStudent;
    modalInfo: RescuedPersonInfo;
    rewardGold: number;
    rewardItem: Item;
}

export function createRescuedPersonData(
    character: Character,
    questType: '군대' | '용병'
): CreateRescuedResult {
    const randomGender = Math.random() < 0.5 ? '남성' : '여성';
    const randomNation = character.nation || '대한민국';
    const randomName = generateName(randomNation, randomGender === '남성' ? 'male' : 'female');
    const visualUrl = generateDefaultVisualUrl(randomName, randomNation, '인간', randomGender);

    const personalities = ['충성스러움', '용감함', '신중함', '과묵함', '의리있음', '열정적', '온화함', '성실함', '예의바름'];
    const randomPersonality = personalities[Math.floor(Math.random() * personalities.length)];

    // JobType에 정의된 실제 직업만 균등하게 추첨 (왕실/신성/마계 등 특수직 제외)
    const archetype = RESCUE_ARCHETYPES[Math.floor(Math.random() * RESCUE_ARCHETYPES.length)];

    const randomLevel = 3 + Math.floor(Math.random() * 8);
    const randomReputation = 20 + Math.floor(Math.random() * 30);
    const randomAge = `${18 + Math.floor(Math.random() * 15)}세`;

    const backgroundStory = archetype.storyTemplates[Math.floor(Math.random() * archetype.storyTemplates.length)];
    const speech = archetype.speechTemplates[Math.floor(Math.random() * archetype.speechTemplates.length)];

    const rewardGold = Math.floor(
        archetype.rewardGoldMin + Math.random() * (archetype.rewardGoldMax - archetype.rewardGoldMin)
    );

    // 실제 인게임 아이템 생성
    const rewardItem = archetype.createRewardItem();

    const currentYear = parseInt(character.currentDate?.split('-')[0] || '2000', 10);

    // generateCompanionStats를 바탕으로 스탯 완벽 생성
    const compStats = generateCompanionStats(randomLevel);

    const rescuedPerson: SimpleStudent = {
        id: `rescued_survivor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: randomName,
        age: randomAge,
        gender: randomGender,
        race: '인간',
        nation: randomNation,
        level: randomLevel,
        personality: randomPersonality,
        appearance: `던전 깊은 곳에서 극적으로 구출된 ${archetype.jobName}`,
        stats: compStats,
        affection: 80, // 생명의 은인이므로 높은 초기 호감도
        job: archetype.jobType,
        classType: archetype.jobName,
        reputation: randomReputation,
        isPastConnection: true,
        visualUrl: visualUrl,
        metYear: currentYear,
        chatHistory: [
            { role: 'model', text: speech }
        ]
    };

    // 군인 직업일 경우 군대 계급 및 공적치 추가 부여
    if (archetype.jobType === JobType.SOLDIER) {
        const availableRanks = [MilitaryRank.PVT, MilitaryRank.PFC, MilitaryRank.CPL, MilitaryRank.SGT, MilitaryRank.SSG];
        const assignedRank = availableRanks[Math.floor(Math.random() * availableRanks.length)];
        rescuedPerson.militaryRank = assignedRank;
        rescuedPerson.merit = 15 + Math.floor(Math.random() * 30);
    }

    const modalInfo: RescuedPersonInfo = {
        name: randomName,
        gender: randomGender,
        age: randomAge,
        nation: randomNation,
        jobName: archetype.jobName,
        level: randomLevel,
        visualUrl: visualUrl,
        personality: randomPersonality,
        appearance: rescuedPerson.appearance,
        backgroundStory: backgroundStory,
        speech: speech,
        rewardGold: rewardGold,
        rewardItemName: rewardItem.name,
        rewardItemDesc: rewardItem.description,
        rewardItemImageUrl: rewardItem.imageUrl,
        questType: questType
    };

    return {
        rescuedPerson,
        modalInfo,
        rewardGold,
        rewardItem
    };
}
