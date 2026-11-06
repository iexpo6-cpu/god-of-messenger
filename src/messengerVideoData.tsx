
import { JobType } from './types';

export interface VideoData {
    url: string;
    duration: number; // ms
}

// 태양/월광은 10초(10000ms), 나머지는 6초(6000ms)
const LONG_DUR = 10500;
const SHORT_DUR = 6500;

// 실제 비디오 URL이 준비되면 아래 URL들을 교체하십시오.
export const MESSENGER_VIDEOS: Partial<Record<JobType, { male: string; female: string }>> = {
    [JobType.SOLAR_MESSENGER]: {
        male: "https://www.youtube.com/embed/iEamQXJvJ34", 
        female: "https://www.youtube.com/embed/nzi_SgS64hw" 
    },
    [JobType.MOONLIGHT_MESSENGER]: {
        male: "https://www.youtube.com/embed/Z9NvR8jHciE",
        female: "https://www.youtube.com/embed/GqvSr9m5Aro"
    },
    [JobType.FIRE_MESSENGER]: {
        male: "https://www.youtube.com/embed/Vd0oDWVeySA",
        female: "https://www.youtube.com/embed/nQaaGEBjHKM"
    },
    [JobType.RADIANT_MESSENGER]: {
        male: "https://www.youtube.com/embed/MwokbV3lUck",
        female: "https://www.youtube.com/embed/PKGjGI_4Ql4"
    },
    [JobType.ELECTRIC_MESSENGER]: {
        male: "https://www.youtube.com/embed/2MCH-lp9Ejs",
        female: "https://www.youtube.com/embed/SENym6AXWXw"
    },
    [JobType.ICE_MESSENGER]: {
        male: "https://www.youtube.com/embed/7crHkZ54hjc",
        female: "https://www.youtube.com/embed/pME2pNUtG-g"
    },
    [JobType.SEA_MESSENGER]: {
        male: "https://www.youtube.com/embed/AO4FhRiuFps",
        female: "https://www.youtube.com/embed/hhZxGS7VZ-k"
    },
    [JobType.STEEL_MESSENGER]: {
        male: "https://www.youtube.com/embed/rodMnW2Gk-k",
        female: "https://www.youtube.com/embed/l1cK7g62jOc"
    },
    [JobType.DARK_MESSENGER]: {
        male: "https://www.youtube.com/embed/rMIg5ADGSiA",
        female: "https://www.youtube.com/embed/e4bZVC0wJ2k"
    },
    [JobType.GALE_MESSENGER]: {
        male: "https://www.youtube.com/embed/53WBXttEDW0",
        female: "https://www.youtube.com/embed/wZx_f46poqM"
    },
    [JobType.EARTH_MESSENGER]: {
        male: "https://www.youtube.com/embed/nDbjmII37aM",
        female: "https://www.youtube.com/embed/3Tb26vy3aXc"
    },
    [JobType.NATURE_MESSENGER]: {
        male: "https://www.youtube.com/embed/yxAcfg1KkQ8",
        female: "https://www.youtube.com/embed/Tlwj2Lz4w7o"
    },
    [JobType.VOID_MESSENGER]: {
        male: "https://www.youtube.com/embed/4zcYLnT_xTE",
        female: "https://www.youtube.com/embed/udAX0vEwf9Y"
    }
};

export const MESSENGER_VIDEO_DURATIONS: Partial<Record<JobType, number>> = {
    [JobType.SOLAR_MESSENGER]: LONG_DUR,
    [JobType.MOONLIGHT_MESSENGER]: LONG_DUR,
    [JobType.FIRE_MESSENGER]: SHORT_DUR,
    [JobType.RADIANT_MESSENGER]: SHORT_DUR,
    [JobType.ELECTRIC_MESSENGER]: SHORT_DUR,
    [JobType.ICE_MESSENGER]: SHORT_DUR,
    [JobType.SEA_MESSENGER]: SHORT_DUR,
    [JobType.STEEL_MESSENGER]: SHORT_DUR,
    [JobType.DARK_MESSENGER]: SHORT_DUR,
    [JobType.GALE_MESSENGER]: SHORT_DUR,
    [JobType.EARTH_MESSENGER]: SHORT_DUR,
    [JobType.NATURE_MESSENGER]: SHORT_DUR,
    [JobType.VOID_MESSENGER]: SHORT_DUR,
};

// [NEW] 보스 등장 전용 영상 매핑
export const BOSS_ENTRANCE_VIDEOS: Record<string, { url: string, duration: number }> = {
    "절대신 엘라": {
        url: "https://www.youtube.com/embed/NJ1cmoxpWtw",
        duration: 10500
    },
    "마신 임페리얼": {
        url: "https://www.youtube.com/embed/BUGPvF4GmmA",
        duration: 10500
    },
    "엘클": {
        url: "https://www.youtube.com/embed/hzQqSc-n16A",
        duration: 10500
    },
    "줄리엣": {
        url:"https://www.youtube.com/embed/PKGjGI_4Ql4",
        duration: 6500
    },
    "최원한": {
        url:"https://www.youtube.com/embed/Z9NvR8jHciE",
        duration: 10500
    },
    "라 페르난데스": {
        url:"https://www.youtube.com/embed/nQaaGEBjHKM",
        duration: 6500
    },
"권율": {
        url:"https://www.youtube.com/embed/2MCH-lp9Ejs",
        duration: 6500
    },"원지원": {
        url:"https://www.youtube.com/embed/nDbjmII37aM",
        duration: 6500
    },"네오 다크 볼튼": {
        url:"https://www.youtube.com/embed/rMIg5ADGSiA",
        duration: 6500
    },"퍼스트 스틸스": {
        url:"https://www.youtube.com/embed/-IBcm0Jks1A",
        duration: 6500
    },"이케 블리자더": {
        url:"https://www.youtube.com/embed/pME2pNUtG-g",
        duration: 6500
    },"오션 레이크": {
        url:"https://www.youtube.com/embed/hhZxGS7VZ-k",
        duration: 6500
    },"블랙 스톰": {
        url:"https://www.youtube.com/embed/53WBXttEDW0",
        duration: 6500
    },"홍길동": {
        url:"hhttps://www.youtube.com/embed/4zcYLnT_xTE",
        duration: 6500
    },"라크 슈카인": {
        url:"https://www.youtube.com/embed/yxAcfg1KkQ8",
        duration: 6500
    },
    "제1 제너럴 제로":{url:"https://www.youtube.com/embed/sOdRybXH2R0",
        duration: 6500
    }, "제2 제너럴 루시엔":{url:"https://www.youtube.com/embed/NGhq3lm-qrU",
        duration: 6500
    }, "제3 제너럴 아포리아":{url:"https://www.youtube.com/embed/Ac5D4FELxNo",
        duration: 6500
    }, "제4 제너럴 바르칼론":{url:"https://www.youtube.com/embed/SmeJgkvWdu4",
        duration: 6500
    }, "제5 제너럴 아자르":{url:"https://www.youtube.com/embed/qI8m7Xg4YvY",
        duration: 6500
    }, "제6 제너럴 카르니발":{url:"https://www.youtube.com/embed/qtvIuA8JRPA",
        duration: 6500
    }, "제7 제너럴 이그니스":{url:"https://www.youtube.com/embed/U5K4DU13tvQ",
        duration: 6500
    }, "제8 제너럴 몰드릭":{url:"https://www.youtube.com/embed/A7V-tInl5LI",
        duration: 6500
    }, "제9 제너럴 스콜라":{url:"https://www.youtube.com/embed/vD26dp4xFXw",
        duration: 6500
    }, "제10 제너럴 카이로스":{url:"https://www.youtube.com/embed/XBLXOEmNBd0",
        duration: 6500
    }, "제11 제너럴 루나스":{url:"https://www.youtube.com/embed/XfN7fSSiqhQ",
        duration: 6500
    }
};
