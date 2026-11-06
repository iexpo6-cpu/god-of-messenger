import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type DimensionShareType = 'battle' | 'summon' | 'item';

const generateShortId = (prefix: string): string => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 헷갈리는 0, 1, I, O 제외
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${result}`;
};

/**
 * 차원 데이터(JSON 문자열 또는 Base64 문자열)를 Firestore에 등록하고 짧은 숏코드(예: BT-7K9A2M)를 자동 발급합니다.
 * 네트워크나 Firestore 오류 발생 시 에러를 던지지만, 호출부에서 fallback으로 긴 원본 코드를 쓸 수 있도록 구성합니다.
 */
export const publishDimensionShare = async (type: DimensionShareType, payload: string): Promise<string> => {
    // 접두사 결정 (BT: 배틀, SM: 소환, IT: 아이템)
    const prefix = type === 'battle' ? 'BT' : type === 'summon' ? 'SM' : 'IT';
    const shortCode = generateShortId(prefix);

    try {
        const shareRef = doc(db, 'dimension_shares', shortCode);
        await setDoc(shareRef, {
            type,
            data: payload,
            createdAt: Date.now()
        });
        console.log(`[DimensionShare] Successfully registered ${type} with code ${shortCode} to Firestore.`);
        return shortCode;
    } catch (error: any) {
        console.error('[DimensionShare] Firestore publish failed:', error);
        const errMsg = error?.message || String(error);
        if (errMsg.includes('Quota exceeded') || errMsg.includes('resource-exhausted') || errMsg.includes('Free daily read units')) {
            throw new Error("파이어베이스 일일 무료 사용량(Quota) 초과로 숏코드 생성이 제한되었습니다. 아래 '긴 전체 코드'를 복사하여 공유하시면 정상 이용 가능합니다!");
        }
        throw error;
    }
};

/**
 * 사용자가 입력한 숏코드(BT-..., SM-..., IT-...) 또는 일반 전체 코드를 확인하여 
 * 최종 해석 가능한 Base64 코드로 변환합니다.
 */
export const resolveDimensionCode = async (input: string): Promise<string> => {
    const trimmed = input.trim();
    if (!trimmed) throw new Error('코드를 입력해주세요.');

    // 1. Gist ID 처리 (호환성 유지)
    let gistId = '';
    if (trimmed.startsWith('GIST:')) {
        gistId = trimmed.replace('GIST:', '').trim();
    } else if (trimmed.includes('gist.github.com')) {
        const parts = trimmed.split('/');
        gistId = parts[parts.length - 1];
    }

    if (gistId) {
        const res = await fetch(`https://api.github.com/gists/${gistId}`);
        if (!res.ok) throw new Error('GitHub Gist 데이터를 찾을 수 없습니다.');
        const gistData = await res.json();
        const fileObj = gistData.files && (gistData.files['shinryoku_battle.json'] || Object.values(gistData.files)[0]);
        if (!fileObj || !fileObj.content) throw new Error('Gist 파일에 유효한 데이터가 없습니다.');
        return btoa(unescape(encodeURIComponent(fileObj.content)));
    }

    // 2. 숏코드 형식 (BT-XXXXXX, SM-XXXXXX, IT-XXXXXX 등 짧은 코드)
    const upper = trimmed.toUpperCase();
    const isShortFormat = /^[A-Z0-9]{2}-[A-Z0-9]{4,10}$/i.test(trimmed) || (trimmed.length <= 16 && !trimmed.includes('{') && !trimmed.includes('"') && !trimmed.includes('='));

    if (isShortFormat) {
        try {
            const shareRef = doc(db, 'dimension_shares', upper);
            const snapshot = await getDoc(shareRef);
            if (snapshot.exists()) {
                const docData = snapshot.data();
                if (docData && docData.data) {
                    const rawData = String(docData.data).trim();
                    // 원본 데이터가 평문 JSON인 경우에만 base64 인코딩, 이미 Base64이면 그대로 반환
                    if (rawData.startsWith('{') || rawData.startsWith('[')) {
                        return btoa(unescape(encodeURIComponent(rawData)));
                    }
                    return rawData;
                }
            } else {
                throw new Error(`등록되지 않았거나 만료된 차원 숏코드(${upper})입니다. 기존 긴 전체 코드를 입력하여 이용할 수도 있습니다.`);
            }
        } catch (e: any) {
            console.error('[DimensionShare] Failed to resolve from Firestore:', e);
            const errMsg = e?.message || String(e);
            if (errMsg.includes('Quota exceeded') || errMsg.includes('resource-exhausted') || errMsg.includes('Free daily read units')) {
                throw new Error("파이어베이스 일일 무료 사용량(Quota) 초과로 숏코드 조회가 제한되었습니다. 상대방의 '긴 전체 코드'를 입력하여 이용하실 수 있습니다!");
            }
            throw new Error(e.message || `차원 숏코드(${upper})를 불러오는 중 오류가 발생했습니다. 기존 긴 전체 코드를 입력해 보세요.`);
        }
    }

    // 3. 평문 JSON인 경우 Base64로 인코딩하여 반환
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return btoa(unescape(encodeURIComponent(trimmed)));
        } catch (e) {
            // 그대로 전달
        }
    }

    // 4. Base64 원본 텍스트 코드 그대로 반환
    return trimmed;
};
