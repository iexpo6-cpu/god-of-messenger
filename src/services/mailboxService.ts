/**
 * 가문 서신함 및 단축키 서비스 유틸리티
 */

export interface MessageItem {
    id?: string;
    role: string;
    text: string;
    timestamp?: number;
}

export const getMailboxMessageKey = (msg: MessageItem): string => {
    return msg.id || `${msg.text}_${msg.timestamp || 0}`;
};

export const isMailCategoryAllowed = (text: string): boolean => {
    try {
        // [스팸 방지] 던전 진행, 최종 결전, 시간 경과, 전투 수색 및 시뮬레이션 서사 서신 차단
        const isSpam = 
            /\[(시간 경과|던전 진입|최종 결전|전투 돌입|전선 돌파)\]/i.test(text) ||
            /미궁 구역 수색|구역 수색으로.*흘렀습니다/i.test(text) ||
            /최종 결전:.*의 사투/i.test(text) ||
            /사투를 시작합니다/i.test(text) ||
            /전투를 시작합니다/i.test(text) ||
            // 전투 시뮬레이션 서사 텍스트 차단
            /서늘한 기운이 감도는 전장 속에서/i.test(text) ||
            /관중들의 뜨거운 함성이 쏟아지는/i.test(text) ||
            /교관들의 날카로운 감시 아래/i.test(text) ||
            /정의와 범죄의 갈림길에서 살기 어린/i.test(text) ||
            /서로의 엇갈린 의지가 불꽃처럼/i.test(text) ||
            /성역의 신성한 불꽃을 지키기 위한/i.test(text) ||
            /숨 막히는 긴장감 속에서/i.test(text);

        if (isSpam) {
            return false;
        }

        const saved = localStorage.getItem('game_mailbox_filter_settings');
        if (!saved) return true;
        const filter = JSON.parse(saved);
        
        const match = text.match(/\[(.*?)\]/);
        if (!match) return true;
        
        const tag = match[1].trim();

        // 0. 전투훈련소 한 줄 요약 로그는 별도 상세 서신([전투 수련])이 오므로 서신함 중복 방지를 위해 제외
        if (/^전투\s*훈련소/i.test(tag)) {
            return false;
        }

        // 1. Direct match with specific tag key
        if (Object.prototype.hasOwnProperty.call(filter, tag)) {
            return filter[tag] !== false;
        }

        // 2. Comprehensive keyword categorization for all game events
        const isFamily = /가족|배우자|연인|결혼|출산|임신|육아|썸|사랑|결별|이별|권태기|고백|약혼|파혼|질투|소동|관계|형제|자매|남매|부부|자녀|아이|데이트/i.test(tag);
        const isDaily = /일상|대화|서신|편지|방문|교류|훈련|특훈|수련|사육|사육사|파티|기지|동료|인연|안부|친구|친밀/i.test(tag);
        const isNews = /소식|시스템|국왕|영지|공지|알림|암시장|보고|결산|성장|인맥|입신양명|승급|각성|전직|보상|시간 경과|경제/i.test(tag);
        const isRumor = /소문|제보|풍문|뒷골목|첩보|단서/i.test(tag);
        const isCombat = /전투|습격|토벌|사건|던전|전투 돌입|보스|정벌|침공|전쟁|승전|패전|기습|결투|안보|경보|비보/i.test(tag);

        if (isFamily && filter.family !== undefined) return filter.family !== false;
        if (isDaily && filter.daily !== undefined) return filter.daily !== false;
        if (isNews && filter.news !== undefined) return filter.news !== false;
        if (isRumor && filter.rumor !== undefined) return filter.rumor !== false;
        if (isCombat && filter.combat !== undefined) return filter.combat !== false;

        return true;
    } catch {
        return true;
    }
};

export const getUnreadMailCount = (messages: MessageItem[]): number => {
    try {
        const readIds: string[] = JSON.parse(localStorage.getItem('mailbox_read_ids') || '[]');
        const deletedIds: string[] = JSON.parse(localStorage.getItem('mailbox_deleted_ids') || '[]');
        
        const letters = messages.filter(msg => {
            return msg.role === 'ai' && msg.text.includes('[') && msg.text.includes(']') && isMailCategoryAllowed(msg.text);
        });
        
        const unreadLetters = letters.filter(msg => {
            const key = getMailboxMessageKey(msg);
            return !deletedIds.includes(key) && !readIds.includes(key);
        });
        
        return unreadLetters.length;
    } catch {
        return 0;
    }
};

export const getTotalMailCount = (messages: MessageItem[]): number => {
    try {
        const deletedIds: string[] = JSON.parse(localStorage.getItem('mailbox_deleted_ids') || '[]');
        const letters = messages.filter(msg => {
            return msg.role === 'ai' && msg.text.includes('[') && msg.text.includes(']') && isMailCategoryAllowed(msg.text);
        });
        return letters.filter(msg => !deletedIds.includes(getMailboxMessageKey(msg))).length;
    } catch {
        return 0;
    }
};
