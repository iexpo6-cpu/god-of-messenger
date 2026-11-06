import { Character, Enemy, Location } from '../types';
import { HUNT_LEVEL_BANDS, getMonsterPoolForBand, getMonsterInfo, NATION_THEMES, HuntZoneInfo } from '../monsterfield';
import { generateProceduralEnemy } from '../utils';

export interface TravelMonsterAmbushResult {
    enemies: Enemy[];
    bandName: string;
    minLvl: number;
    maxLvl: number;
    destinationCity: string;
    originCity: string;
    logMessage: string;
    title: string;
    description: string;
}

/**
 * 이동 중 야생 몬스터 습격 이벤트를 생성합니다.
 * - 플레이어 레벨에만 치우치지 않고, 최대 레벨 300 이하의 다양한 등급(초보 ~ 신화)의 야생 몬스터가 무작위로 출현합니다.
 * - 최대 레벨은 300으로 제한됩니다.
 */
export const generateTravelMonsterAmbush = (
    character: Character,
    destination: Location,
    days: number
): TravelMonsterAmbushResult => {
    const theme = NATION_THEMES[destination.nation] || NATION_THEMES[destination.city] || NATION_THEMES.default;
    
    // 최대 레벨 300 이하의 사냥터 밴드 목록 필터링 (beginner ~ mythic)
    const validBands = HUNT_LEVEL_BANDS.filter(b => b.levelRange[1] <= 300);
    
    // 다양한 대역에서 몬스터가 등장하도록 무작위 밴드 선택 (초급, 중급, 상급, 엘리트, 재앙, 심연, 신화 등 다양하게 출현)
    const bandIndex = Math.floor(Math.random() * validBands.length);
    const selectedBand = validBands[bandIndex] || validBands[0];
    
    const [bandMin, bandMax] = selectedBand.levelRange;
    const pool = getMonsterPoolForBand(theme, selectedBand.id);
    
    // 1 ~ 3마리 출현
    const count = Math.floor(Math.random() * 3) + 1;
    const enemies: Enemy[] = [];

    for (let i = 0; i < count; i++) {
        // 선택된 밴드의 범위 내에서 레벨 무작위 산출 (최대 300 캡)
        let monsterLevel = Math.floor(Math.random() * (bandMax - bandMin + 1)) + bandMin;
        monsterLevel = Math.max(1, Math.min(300, monsterLevel));

        const rawMon = pool[Math.floor(Math.random() * pool.length)];
        const monName = typeof rawMon === 'string' ? rawMon : rawMon.name;
        const enemy = generateProceduralEnemy(monsterLevel, monName);
        const monInfo = getMonsterInfo(rawMon);
        if (monInfo.visualUrl) {
            enemy.visualUrl = monInfo.visualUrl;
        }
        enemies.push(enemy);
    }

    const originCity = character.currentLocation?.city || '출발지';
    const logMessage = `[⚠️ 여정 중 습격!] ${destination.city}(으)로 향하던 길목(${selectedBand.name}: Lv.${bandMin}~${bandMax})에서 야생 몬스터 ${enemies.map(e => `Lv.${e.level} ${e.name}`).join(', ')} 무리의 습격을 받았습니다!`;
    const title = '🚨 이동 중 몬스터 습격!';
    const description = `${destination.city}(으)로 향하는 ${days}일간의 여정 도중 야생 몬스터들의 기습을 받았습니다! 전투에 돌입합니다.`;

    return {
        enemies,
        bandName: selectedBand.name,
        minLvl: bandMin,
        maxLvl: bandMax,
        destinationCity: destination.city,
        originCity,
        logMessage,
        title,
        description
    };
};
