/**
 * ============================================================================
 * [신의 사자 RPG] 지능형 이미지 사전 프리로더 서비스 (Image Preload Service)
 * ============================================================================
 * 
 * 목적:
 * 1. 게임 접속 시 필수 에셋(훈련 마물, 대표 몬스터, 주요 UI)을 1~2초간 퀵 프리로딩
 * 2. 지역 이동, 던전 입장, 전선 침략 시 해당 지역 출현 몬스터를 백그라운드 선제 로딩
 * 3. 브라우저 인메모리 이미지 디코딩 캐시를 활성화하여 렌더링 시 0ms 즉시 표시
 */

import { getLocalVisualPath, LOCAL_VISUAL_MANIFEST } from './localVisualManifest';
import { ASIA_MONSTER_IMAGE_MAP } from '../asiamonsterfield';
import { ALL_MONSTER_IMAGE_MAP } from '../monsterfield';

const preloadedUrls = new Set<string>();
const inFlightPromises = new Map<string, Promise<boolean>>();

/**
 * 단일 이미지 URL을 브라우저 메모리에 선제 로드
 */
export const preloadImage = (url: string): Promise<boolean> => {
    if (!url || typeof window === 'undefined') return Promise.resolve(false);
    
    // 이미 프리로드 완료된 경우 즉시 반환
    if (preloadedUrls.has(url)) return Promise.resolve(true);
    
    // 현재 로딩 중인 프로미스가 있다면 재사용
    if (inFlightPromises.has(url)) {
        return inFlightPromises.get(url)!;
    }

    const promise = new Promise<boolean>((resolve) => {
        const img = new Image();
        img.decoding = 'async';

        img.onload = () => {
            preloadedUrls.add(url);
            inFlightPromises.delete(url);
            resolve(true);
        };

        img.onerror = () => {
            inFlightPromises.delete(url);
            // 에러 시에도 resolve하여 프리로드 파이프라인이 멈추지 않도록 함
            resolve(false);
        };

        img.src = url;
    });

    inFlightPromises.set(url, promise);
    return promise;
};

/**
 * 여러 개의 이미지 URL을 동시/점진적으로 프리로드하고 진행률 콜백 반환
 */
export const preloadImageBatch = async (
    urls: string[],
    onProgress?: (loaded: number, total: number, percent: number) => void
): Promise<void> => {
    const validUrls = Array.from(new Set(urls.filter(Boolean)));
    const total = validUrls.length;
    if (total === 0) {
        onProgress?.(0, 0, 100);
        return;
    }

    let loaded = 0;
    const updateProgress = () => {
        loaded++;
        const percent = Math.min(100, Math.round((loaded / total) * 100));
        onProgress?.(loaded, total, percent);
    };

    // 최대 6개 동시 병렬 로딩 (HTTP/2 및 브라우저 커넥션 최적화)
    const BATCH_SIZE = 6;
    for (let i = 0; i < validUrls.length; i += BATCH_SIZE) {
        const chunk = validUrls.slice(i, i + BATCH_SIZE);
        await Promise.all(
            chunk.map(async (url) => {
                await preloadImage(url);
                updateProgress();
            })
        );
    }
};

/**
 * 게임 시작 시 필수 코어 에셋 프리로딩 (1~2초 퀵 로딩바 연동용)
 */
export const preloadEssentialGameAssets = async (
    onProgress?: (percent: number, message: string) => void
): Promise<void> => {
    onProgress?.(5, "로컬 비주얼 에셋 인덱싱 중...");

    // 1. 로컬 정적 매니페스트 에셋 수집
    const localUrls = Object.values(LOCAL_VISUAL_MANIFEST);

    // 2. 초기 훈련 및 스타팅 마물 에셋 수집
    const starterMonsters = [
        "https://i.ibb.co/Qs72cXb/Gemini-Generated-Image-v12w7sv12w7sv12w.png", // 훈련용 허수아비
        "https://i.ibb.co/PspM9vv3/Gemini-Generated-Image-2wyu592wyu592wyu.png", // 나무 훈련 인형
        "https://i.ibb.co/fdss1kry/mechanical-training-robot-clean-1794397527683.jpg", // 기계식 훈련 로봇
        "https://i.ibb.co/7t8yMHMb/mana-infused-sparring-golem-1794397508197.jpg", // 마력 깃든 스파링 골렘
        "https://i.ibb.co/twc44z61/Gemini-Generated-Image-qkxuijqkxuijqkxu.png", // 산토끼
        "https://i.ibb.co/3yhJWX37/image.png", // 화난 멧돼지
        "https://i.ibb.co/0p7gHbgC/Gemini-Generated-Image-e9k0ge9k0ge9k0ge.png", // 길 잃은 삽살개
        "https://i.ibb.co/dw9Gpd4j/hell-asura.jpg", // 지옥의 아수라
        "https://i.ibb.co/VWqv9DKZ/holy-light-butterfly-1794397393983.jpg" // 빛의 나비
    ];

    const targets = Array.from(new Set([...localUrls, ...starterMonsters]));

    await preloadImageBatch(targets, (loaded, total, percent) => {
        const msg = percent < 50 ? "핵심 전투 및 몬스터 일러스트 캐싱 중..." : "초고속 0ms 렌더링 환경 준비 중...";
        onProgress?.(percent, msg);
    });

    onProgress?.(100, "모든 비주얼 에셋 준비 완료!");
};

/**
 * 지역(국가/도시) 이동 시 해당 지역 몬스터들을 백그라운드 유휴 스레드에서 선제 로딩
 */
export const preloadCurrentLocationAssets = (nation: string, city?: string): void => {
    if (typeof window === 'undefined') return;

    const task = () => {
        const urlsToPreload: string[] = [];

        // 아시아 계열 국가일 경우 아시아 필드 몬스터 선제 추출
        if (nation === '한국' || nation === '일본' || nation === '중국' || nation === '아시아') {
            Object.values(ASIA_MONSTER_IMAGE_MAP).slice(0, 15).forEach(url => {
                if (url) urlsToPreload.push(url);
            });
        }

        // 전체 몬스터 맵에서 일부 추출
        if (ALL_MONSTER_IMAGE_MAP) {
            Object.values(ALL_MONSTER_IMAGE_MAP).slice(0, 10).forEach(url => {
                if (url) urlsToPreload.push(url);
            });
        }

        if (urlsToPreload.length > 0) {
            preloadImageBatch(urlsToPreload).catch(() => {});
        }
    };

    if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(task, { timeout: 3000 });
    } else {
        setTimeout(task, 1000);
    }
};

/**
 * 이미 프리로드되어 메모리에 올라가 있는지 확인
 */
export const isImagePreloaded = (url: string): boolean => {
    return preloadedUrls.has(url);
};
