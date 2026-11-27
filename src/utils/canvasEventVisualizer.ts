import { DailyReportData, WorldNewsItem } from '../types';

export type CanvasEventDomain = 'base' | 'city' | 'district' | 'explore' | 'global';
export type CanvasVisualTone = 'positive' | 'negative' | 'warning' | 'special' | 'neutral';

export interface CanvasVisualEvent {
    id: string;
    domain: CanvasEventDomain;
    kind: string;
    tone: CanvasVisualTone;
    badge: string;
    emoji: string;
    title: string;
    description: string;
    actorName?: string;
    bubbleText?: string;
    facilityType?: string;
    floatingText?: string;
    createdDate?: string;
}

export type CanvasSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export function getSeasonFromDate(dateStr?: string): CanvasSeason {
    const month = parseInt((dateStr || '1026-03-01').split('-')[1] || '3', 10) || 3;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
}

const extractActorName = (line: string): string | undefined => {
    const quoted = line.match(/'([^']+)'/);
    if (quoted?.[1]) return quoted[1].trim();
    const pairMatch = line.match(/([가-힣a-zA-Z0-9_]{2,14})(?:와\(과\)|와|과|이|가)\s/);
    if (pairMatch?.[1] && !['기지', '동료', '거주민', '세계', '국가', '성전', '용병단'].includes(pairMatch[1])) {
        return pairMatch[1].trim();
    }
    return undefined;
};

/**
 * 8개 TimeEngine의 systemLogs, worldNews, dailyReport를
 * 기지(base) / 도시(city) / 구역(district) / 야외·대륙(explore) 캔버스용 시각 이벤트로 구조화합니다.
 * 장기 시간 스킵 시에도 폭주하지 않도록 카테고리별 최대 2개씩만 선별합니다.
 */
export function parseTimeEngineLogsToCanvasEvents(
    systemLogs: string[] = [],
    worldNews: WorldNewsItem[] = [],
    dailyReport?: DailyReportData,
    currentDate?: string
): CanvasVisualEvent[] {
    const events: CanvasVisualEvent[] = [];
    const categoryCounts: Record<string, number> = {};
    const canPush = (catKey: string, limit = 2): boolean => {
        const cur = categoryCounts[catKey] || 0;
        if (cur >= limit) return false;
        categoryCounts[catKey] = cur + 1;
        return true;
    };

    (systemLogs || []).forEach((raw, idx) => {
        const line = (raw || '').trim();
        if (!line) return;
        const actorName = extractActorName(line);
        const idBase = `${currentDate || 'd'}_${idx}_${line.slice(0, 14)}`;

        // 1. 기지 도메인 (BaseRpgCanvas)
        if (line.includes('기지 자원 수확') || (line.includes('[기지') && (line.includes('생산') || line.includes('수확')))) {
            if (!canPush('base_harvest', 2)) return;
            const facType = line.includes('광산') || line.includes('철') || line.includes('석재')
                ? 'mine'
                : line.includes('연금') || line.includes('마정석')
                    ? 'alchemy_lab'
                    : line.includes('약초')
                        ? 'herb_garden'
                        : 'farm';
            events.push({
                id: `cv_bh_${idBase}`,
                domain: 'base',
                kind: 'base_harvest',
                tone: 'positive',
                badge: '기지 수확',
                emoji: facType === 'mine' ? '⛏️' : facType === 'alchemy_lab' ? '⚗️' : '🌾',
                title: '기지 시설 자동 수확',
                description: line,
                facilityType: facType,
                floatingText: facType === 'mine' ? '+⛏️ 광물 수확!' : facType === 'alchemy_lab' ? '+💎 마정석 생산!' : '+🌾 자원 수확!',
                createdDate: currentDate
            });
            return;
        }
        if (line.includes('완공') || line.includes('증축 완료') || line.includes('건설 완료')) {
            if (!canPush('base_build', 2)) return;
            events.push({
                id: `cv_bb_${idBase}`,
                domain: 'base',
                kind: 'base_build_complete',
                tone: 'special',
                badge: '시설 완공',
                emoji: '🔨',
                title: '기지 시설 건설 완료',
                description: line,
                floatingText: '🔨 시설 완공!',
                createdDate: currentDate
            });
            return;
        }
        if (line.includes('기지 습격') || line.includes('침입') || line.includes('방어전')) {
            if (!canPush('base_attack', 1)) return;
            events.push({
                id: `cv_ba_${idBase}`,
                domain: 'base',
                kind: 'base_attack',
                tone: 'warning',
                badge: '기지 경보',
                emoji: '🚨',
                title: '기지 방어 경보 발령',
                description: line,
                bubbleText: '🚨 침입자 경보!',
                createdDate: currentDate
            });
            return;
        }
        if (line.includes('부화') || line.includes('사육') || line.includes('마수')) {
            if (!canPush('base_monster', 2)) return;
            events.push({
                id: `cv_bm_${idBase}`,
                domain: 'base',
                kind: 'base_monster',
                tone: 'special',
                badge: '마수 목장',
                emoji: '🥚',
                title: '마수 사육 · 부화 소식',
                description: line,
                actorName,
                bubbleText: '🥚 마수가 무럭무럭 자랍니다!',
                createdDate: currentDate
            });
            return;
        }
        if (line.includes('결혼') || line.includes('출산') || line.includes('임신') || line.includes('연인') || line.includes('썸')) {
            if (!canPush('base_romance', 2)) return;
            const emoji = line.includes('결혼') ? '💍' : line.includes('출산') ? '👶' : '💕';
            events.push({
                id: `cv_br_${idBase}`,
                domain: 'base',
                kind: 'base_romance',
                tone: 'positive',
                badge: '기지 경사',
                emoji,
                title: line.includes('결혼') ? '결혼 경사' : line.includes('출산') ? '새 생명 탄생' : '인연의 설렘',
                description: line,
                actorName,
                bubbleText: `${emoji} ${line.includes('결혼') ? '축하해요!' : line.includes('출산') ? '아기가 태어났어요!' : '기분 좋은 하루 💕'}`,
                createdDate: currentDate
            });
            return;
        }
        if (line.includes('갈등') || line.includes('질투') || line.includes('이별') || line.includes('체납')) {
            if (!canPush('base_conflict', 2)) return;
            events.push({
                id: `cv_bc_${idBase}`,
                domain: 'base',
                kind: 'base_conflict',
                tone: 'negative',
                badge: '주의 소식',
                emoji: '💢',
                title: '기지 갈등 · 관리 주의',
                description: line,
                actorName,
                bubbleText: '💢 분위기가 어수선해요...',
                createdDate: currentDate
            });
            return;
        }

        // 2. 구역 도메인 (DistrictRpgCanvas)
        if (line.includes('[주점 소문]') || line.includes('[뒷골목') || line.includes('암시장')) {
            if (!canPush('district_rumor', 2)) return;
            events.push({
                id: `cv_dr_${idBase}`,
                domain: 'district',
                kind: 'district_rumor',
                tone: 'special',
                badge: '뒷골목 소문',
                emoji: '💬',
                title: '거리의 은밀한 소문',
                description: line,
                actorName,
                bubbleText: '💬 흥미로운 소문 들었어?',
                createdDate: currentDate
            });
            return;
        }
        if (line.includes('[비보]') || line.includes('[인연 비보]')) {
            if (!canPush('district_memorial', 2)) return;
            events.push({
                id: `cv_dm_${idBase}`,
                domain: 'district',
                kind: 'district_memorial',
                tone: 'negative',
                badge: '부고',
                emoji: '🕯️',
                title: '추모비 새 기록',
                description: line,
                actorName,
                bubbleText: '🕯️ 삼가 고인의 명복을...',
                createdDate: currentDate
            });
            return;
        }
        if (line.includes('[입신양명]') || line.includes('[인연 소식]') || line.includes('[경제]')) {
            if (!canPush('district_social', 2)) return;
            const isEcon = line.includes('[경제]');
            events.push({
                id: `cv_ds_${idBase}`,
                domain: 'district',
                kind: isEcon ? 'district_market' : 'district_social',
                tone: 'positive',
                badge: isEcon ? '상업 변동' : '인연 소식',
                emoji: isEcon ? '💰' : '✨',
                title: isEcon ? '상업 지구 시세 · 교역' : '인연의 활약 소식',
                description: line,
                actorName,
                bubbleText: isEcon ? '💰 장사가 잘 되네요!' : '✨ 반가운 소식이 들려옵니다!',
                createdDate: currentDate
            });
            return;
        }

        // 3. 야외/대륙 도메인 (Outskirts / Overland)
        if (line.includes('[라이벌 경보]') || line.includes('[영원의 라이벌 성장]') || line.includes('[위기]')) {
            if (!canPush('explore_ambush', 2)) return;
            events.push({
                id: `cv_ea_${idBase}`,
                domain: 'explore',
                kind: 'explore_ambush',
                tone: 'warning',
                badge: '위험 경보',
                emoji: '⚡',
                title: '외곽 위협 감지',
                description: line,
                actorName,
                bubbleText: '⚡ 주변에 강적의 기척이!',
                createdDate: currentDate
            });
            return;
        }

        // 4. 도시 도메인 (CityMapBoard / CityRpgCanvas)
        if (
            line.includes('[외교]') ||
            line.includes('[선전포고]') ||
            line.includes('[정변]') ||
            line.includes('[지도자 교체]') ||
            line.includes('[세계 정세]') ||
            line.includes('[전쟁 발발]') ||
            line.includes('[국가 함락]') ||
            line.includes('[성전') ||
            line.includes('[군대') ||
            line.includes('[지휘') ||
            line.includes('[용병단')
        ) {
            if (!canPush('city_news', 2)) return;
            const isDanger = line.includes('선전포고') || line.includes('전쟁') || line.includes('함락') || line.includes('긴급') || line.includes('찬탈');
            events.push({
                id: `cv_cn_${idBase}`,
                domain: 'city',
                kind: line.includes('[성전') ? 'city_temple' : line.includes('[용병') ? 'city_mercenary' : line.includes('[군') ? 'city_military' : 'city_news',
                tone: isDanger ? 'warning' : 'special',
                badge: line.includes('[성전') ? '성전 전보' : line.includes('[용병') ? '용병 소식' : line.includes('[군') ? '군사 전보' : '세계 정세',
                emoji: isDanger ? '⚔️' : '📜',
                title: '도시 전보 도착',
                description: line,
                bubbleText: isDanger ? '⚔️ 긴급 전보가 도착했습니다!' : '📜 새로운 소식입니다!',
                createdDate: currentDate
            });
        }
    });

    // WorldNewsItem 보강
    (worldNews || []).slice(0, 2).forEach((wn, idx) => {
        if (!canPush('city_worldnews', 2)) return;
        events.push({
            id: `cv_wn_${wn.id || idx}`,
            domain: 'city',
            kind: 'city_news',
            tone: wn.category === 'war' || wn.category === 'disaster' ? 'warning' : 'special',
            badge: '세계 뉴스',
            emoji: wn.category === 'war' ? '⚔️' : '📰',
            title: wn.title || '대륙 정세 소식',
            description: wn.summary || wn.title || '',
            bubbleText: `📰 ${wn.title || '새 전보!'}`,
            createdDate: currentDate
        });
    });

    // DailyReport 사망/경보 보강
    if (dailyReport?.deceasedList && dailyReport.deceasedList.length > 0 && canPush('district_memorial', 2)) {
        const firstDead = dailyReport.deceasedList[0];
        events.push({
            id: `cv_dead_${firstDead.id || firstDead.name}`,
            domain: 'district',
            kind: 'district_memorial',
            tone: 'negative',
            badge: '추모비',
            emoji: '🕯️',
            title: `${firstDead.name} 영면`,
            description: `${firstDead.name}(${firstDead.causeOfDeath || '영면'})의 기록이 추모비에 새겨졌습니다.`,
            actorName: firstDead.name,
            bubbleText: '🕯️ 영면을 기립니다',
            createdDate: currentDate
        });
    }

    return events.slice(0, 12);
}

const TONE_PALETTE: Record<CanvasVisualTone, { bg: string; border: string; text: string }> = {
    positive: { bg: 'rgba(6, 78, 59, 0.94)', border: '#34d399', text: '#ecfdf5' },
    negative: { bg: 'rgba(136, 19, 55, 0.94)', border: '#fb7185', text: '#fff1f2' },
    warning: { bg: 'rgba(120, 53, 15, 0.95)', border: '#fbbf24', text: '#fef3c7' },
    special: { bg: 'rgba(49, 46, 129, 0.94)', border: '#a78bfa', text: '#ede9fe' },
    neutral: { bg: 'rgba(15, 23, 42, 0.92)', border: '#38bdf8', text: '#f1f5f9' }
};

const SPEECH_TEXT_WIDTH_CACHE = new Map<string, number>();

/**
 * 캔버스 엔티티 머리 위에 톤별 말풍선을 그립니다. (Base/City/District/Outskirts 공용)
 */
export function drawCanvasSpeechBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    emoji: string,
    text: string,
    tone: CanvasVisualTone = 'neutral',
    nowMs: number = Date.now()
) {
    const pal = TONE_PALETTE[tone] || TONE_PALETTE.neutral;
    const label = `${emoji} ${text}`.slice(0, 26);
    const bob = Math.sin(nowMs / 180) * 2.5;

    ctx.save();
    ctx.font = 'bold 10px sans-serif';
    let textW = SPEECH_TEXT_WIDTH_CACHE.get(label);
    if (textW === undefined) {
        textW = ctx.measureText(label).width;
        if (SPEECH_TEXT_WIDTH_CACHE.size > 256) SPEECH_TEXT_WIDTH_CACHE.clear();
        SPEECH_TEXT_WIDTH_CACHE.set(label, textW);
    }
    const bw = Math.min(200, Math.max(66, textW + 16));
    const bh = 22;
    const bx = x - bw / 2;
    const by = y - 68 + bob;

    ctx.fillStyle = pal.bg;
    ctx.strokeStyle = pal.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 7);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 4, by + bh);
    ctx.lineTo(x + 4, by + bh);
    ctx.lineTo(x, by + bh + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = pal.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, by + bh / 2 + 0.5);
    ctx.restore();
}
