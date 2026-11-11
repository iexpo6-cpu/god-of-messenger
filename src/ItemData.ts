import { Item, ItemRarity, CityTier, WeaponType, BlackMarketItem } from './types';
import { getAllBossDetailedLoots } from './services/bossLootService';
import { getRegisteredItemImage, isFallbackVisualUrl } from './services/visualRegistry';

// [NEW] 아이템 종류별 이미지 매핑 테이블
export const ITEM_IMAGE_MAP: Record<string, string> = {
    // 소모품
    "최하급 HP 포션": "https://i.ibb.co/7dckmsMV/1.png",
    "하급 HP 포션": "https://i.ibb.co/7dckmsMV/1.png",
    "중급 HP 포션": "https://i.ibb.co/p6x1061S/2.png",
    "상급 HP 포션": "https://i.ibb.co/FLhVqT71/3.png",
    "최상급 HP 포션": "https://i.ibb.co/d0RXmrDH/4.png",
    "최하급 MP 포션": "https://i.ibb.co/C5hhmbWb/1.png",
    "하급 MP 포션": "https://i.ibb.co/C5hhmbWb/1.png",
    "중급 MP 포션": "https://i.ibb.co/7tbS30zM/2.png",
    "상급 MP 포션": "https://i.ibb.co/chRFk45B/3.png",
    "최상급 MP 포션": "https://i.ibb.co/wrjpC0sv/4.png",
    "엘릭서": "https://i.ibb.co/cSZMwD69/5.png",
    "피로회복제": "https://i.ibb.co/FThpY9q/Gemini-Generated-Image-8o5ck98o5ck98o5c.png",
    "강력한 피로회복제": "https://i.ibb.co/cSZMwD69/5.png",
    "최하급 피로회복제": "https://i.ibb.co/7dckmsMV/1.png",
    "하급 피로회복제": "https://i.ibb.co/7dckmsMV/1.png",
    "중급 피로회복제": "https://i.ibb.co/p6x1061S/2.png",
    "상급 피로회복제": "https://i.ibb.co/FLhVqT71/3.png",
    "특급 피로회복제": "https://i.ibb.co/d0RXmrDH/4.png",
    "궁극의 피로회복제": "https://i.ibb.co/cSZMwD69/5.png",
    "신화급 피로회복제": "https://i.ibb.co/cSZMwD69/5.png",
    "활력의 물약":"https://i.ibb.co/FThpY9q/Gemini-Generated-Image-8o5ck98o5ck98o5c.png",
    "해독제":"https://i.ibb.co/zW0b6Dvf/Gemini-Generated-Image-rljcuqrljcuqrljc.png",
    "힘의 비약":"https://i.ibb.co/fYsnxhBn/Gemini-Generated-Image-3n24vt3n24vt3n24.png",
    "마나의 비약": "https://i.ibb.co/wrjpC0sv/4.png",
    "만병통치약":"https://i.ibb.co/1J7XGLRp/Gemini-Generated-Image-29rrw029rrw029rr.png",
    "만병통치약 (소)":"https://i.ibb.co/s9YvPHYk/Gemini-Generated-Image-f0flpmf0flpmf0fl.png",
    "화염 속성 저항 포션": "https://i.ibb.co/FThpY9q/Gemini-Generated-Image-8o5ck98o5ck98o5c.png",
    "빙결 속성 저항 포션": "https://i.ibb.co/zW0b6Dvf/Gemini-Generated-Image-rljcuqrljcuqrljc.png",
    "전격 속성 저항 포션": "https://i.ibb.co/fYsnxhBn/Gemini-Generated-Image-3n24vt3n24vt3n24.png",
    "대지 속성 저항 포션": "https://i.ibb.co/1J7XGLRp/Gemini-Generated-Image-29rrw029rrw029rr.png",
    "모든 속성 저항 영약": "https://i.ibb.co/cSZMwD69/5.png",
    "물리 방어 주문서": "https://i.ibb.co/35tcVwdj/3.png",
    "마법 방어 주문서": "https://i.ibb.co/35tcVwdj/3.png",
    "모든 속성 수호 주문서": "https://i.ibb.co/35tcVwdj/3.png",
    "최하급 포획 그물":"https://i.ibb.co/My5r1njR/Gemini-Generated-Image-lfhpjllfhpjllfhp.png",
    "하급 포획 그물":"https://i.ibb.co/PZ2nn4Gp/Gemini-Generated-Image-shn15bshn15bshn1.png",
    "중급 포획 그물":"https://i.ibb.co/tpbhkwLW/Gemini-Generated-Image-vsjruyvsjruyvsjr.png",
    "상급 포획 그물":"https://i.ibb.co/SwhGkwMS/Gemini-Generated-Image-22cot722cot722co.png",
    "최상급 포획 그물":"https://i.ibb.co/FPjZgNK/Gemini-Generated-Image-av5eb8av5eb8av5e.png",
    "신화급 포획 그물":"https://i.ibb.co/FPjZgNK/Gemini-Generated-Image-av5eb8av5eb8av5e.png",
    
    
    // 무기 (검류)
    "수련용 목검": "https://i.ibb.co/qGb8FPt/7.png",
    "철검": "https://i.ibb.co/qGb8FPt/7.png",
    "강철 검": "https://i.ibb.co/qGb8FPt/7.png",
    "아다만티움 소드": "https://i.ibb.co/qGb8FPt/7.png",
    "카타나": "https://i.ibb.co/RpSgfZ4s/6.png",
    "레이피어": "https://i.ibb.co/hFCtVz9n/5.png",
    "환웅의 검 (레플리카)": "https://i.ibb.co/VcRb927S/4.png",
    "각궁": "https://i.ibb.co/0jm72MhS/2.png",
    "두정갑": "https://i.ibb.co/cSM290NW/3.png",
    "엑스칼리버 (모조품)":"https://i.ibb.co/ns3rJgr5/1.png",
    "츠바 이핸더":"https://i.ibb.co/cKXCJH1x/11.png",
    "듀란달 (파편)":"https://i.ibb.co/yFYxPXQw/10.png",
    "코페쉬":"https://i.ibb.co/1f9Xhhpq/9.png",
    "마왕의 검":"https://i.ibb.co/RGBMBbwg/8.png",
    "마왕의 검 (레플리카)":"https://i.ibb.co/RGBMBbwg/8.png",
    "쿠사나기의 검":"https://i.ibb.co/M5BJ10tx/7.png",


    
    // 무기 (둔기/도끼)
    "나무 몽둥이": "https://i.ibb.co/QFwcSGBC/6.png",
    "철퇴 (Mace)": "https://i.ibb.co/QFwcSGBC/6.png",
    "워해머": "https://i.ibb.co/QFwcSGBC/6.png",
    "골든 해머": "https://i.ibb.co/QFwcSGBC/6.png",
    "나무 도끼": "https://i.ibb.co/G4Zt9Gnb/4.png",
    "철도끼": "https://i.ibb.co/G4Zt9Gnb/4.png",
    "배틀 액스": "https://i.ibb.co/G4Zt9Gnb/4.png",
    "드래곤 슬레이어 (Axe)":"https://i.ibb.co/G4Zt9Gnb/4.png",
    "전투용 아이스 도끼":"https://i.ibb.co/bMZC0v4g/Kakao-Talk-20251224-125511292-02.png",
    //무기 (근접)
    "철제 너클": "https://i.ibb.co/JWXCq217/5.png",
    "기본 격투 장갑":"https://i.ibb.co/JWXCq217/5.png",
    "스파이크 너클":"https://i.ibb.co/JWXCq217/5.png",
    "다이아몬드 너클":"https://i.ibb.co/JWXCq217/5.png",
    "타이탄의 건틀릿":"https://i.ibb.co/JWXCq217/5.png",
    // 무기 (창/원거리)
    "나무 창": "https://i.ibb.co/mdrgyVz/8.png",
    "철창": "https://i.ibb.co/mdrgyVz/8.png",
    "강철 창": "https://i.ibb.co/mdrgyVz/8.png",
    "미스릴 스피어": "https://i.ibb.co/mdrgyVz/8.png",
    "청룡언월도":"https://i.ibb.co/7dPnS6Kd/Kakao-Talk-20251224-125511292-03.png",
    "나무 활": "https://i.ibb.co/d0q4HSQ5/3.png",
    "철활": "https://i.ibb.co/d0q4HSQ5/3.png",
    "강철 활": "https://i.ibb.co/d0q4HSQ5/3.png",
    "롱보우":"https://i.ibb.co/d0q4HSQ5/3.png",
    "엘프의 명궁": "https://i.ibb.co/d0q4HSQ5/3.png",
    "플린트락 권총": "https://i.ibb.co/1tQhtqkk/2.png",
    "머스킷 소총": "https://i.ibb.co/pBt0cgwh/5.png",
    "철제 석궁":"https://i.ibb.co/v6Tt1NkN/4.png",
    "헤비 크로스보우":"https://i.ibb.co/v6Tt1NkN/4.png",
    "연발 석궁":"https://i.ibb.co/v6Tt1NkN/4.png",
    "저격용 레일건 (프로토타입)":"https://i.ibb.co/mx11nPw/target-10-prototype-railgun.jpg",
    "프로토타입 레일건":"https://i.ibb.co/mx11nPw/target-10-prototype-railgun.jpg",
    "철 수리검":"https://i.ibb.co/cSsfXy5N/3.png",
    "폭발 표창":"https://i.ibb.co/cSsfXy5N/3.png",
    "강철 표창":"https://i.ibb.co/cSsfXy5N/3.png",
    "피스메이커":"https://i.ibb.co/LDt6vW0W/Kakao-Talk-20251224-125511292-01.png",
    "프로토타입 레일걸":"https://i.ibb.co/mx11nPw/target-10-prototype-railgun.jpg",
    "정밀 공학 라이플":"https://i.ibb.co/S4zRD0Nv/Kakao-Talk-20251224-170321153.png",
    // 무기 (마법/기타)
    "낡은 나무 지팡이": "https://i.ibb.co/PzmWXLdG/4.png",
    "떡갈나무 지팡이": "https://i.ibb.co/PzmWXLdG/4.png",
    "마법사의 지팡이": "https://i.ibb.co/PzmWXLdG/4.png",
    "대현자의 지팡이": "https://i.ibb.co/PzmWXLdG/4.png",
    "입문용 마법서": "https://i.ibb.co/35tcVwdj/3.png",
    "견습 마법서": "https://i.ibb.co/35tcVwdj/3.png",
    "원소 마법서": "https://i.ibb.co/35tcVwdj/3.png",
    "금단의 마도서": "https://i.ibb.co/35tcVwdj/3.png",
    
    //보조무기
    "패링 대거": "https://i.ibb.co/C3wYMdWH/2.png",
    "마나석":"https://i.ibb.co/8LwZ59H1/1.png",
    "녹슨 단도":"https://i.ibb.co/C3wYMdWH/2.png",
    "대거 (보조)":"https://i.ibb.co/C3wYMdWH/2.png",
    "마력의 구슬":"https://i.ibb.co/8LwZ59H1/1.png",
    "앙크 부적": "https://i.ibb.co/MydZ27sy/Gemini-Generated-Image-e26aeme26aeme26a.png",
    // 방어구
    "천 옷": "https://i.ibb.co/dRJr9BC/1.png",
    "가죽 갑옷": "https://i.ibb.co/dRJr9BC/1.png",
    "사슬 갑옷": "https://i.ibb.co/dRJr9BC/1.png",
    "판금 갑옷 (Plate)": "https://i.ibb.co/dRJr9BC/1.png",
    "나무 방패": "https://i.ibb.co/7xdmfNt2/9.png",
    "라운드 실드": "https://i.ibb.co/7xdmfNt2/9.png",
    "카이트 실드": "https://i.ibb.co/7xdmfNt2/9.png",
    "타워 실드":"https://i.ibb.co/7xdmfNt2/9.png",
    "천 모자": "https://i.ibb.co/Xfnsyh5J/1.png",
    "가죽 투구": "https://i.ibb.co/Xfnsyh5J/1.png",
    "강철 투구": "https://i.ibb.co/Xfnsyh5J/1.png",
    "미스릴 투구":"https://i.ibb.co/Xfnsyh5J/1.png",
    "마법사의 로브": "https://i.ibb.co/xRg13p6/Gemini-Generated-Image-pphuljpphuljpphu.png",
     "아크메이지 로브": "https://i.ibb.co/xRg13p6/Gemini-Generated-Image-pphuljpphuljpphu.png",
    "천 신발": "https://i.ibb.co/fz7SNcmz/2.png",
    "가죽 부츠": "https://i.ibb.co/fz7SNcmz/2.png",
    "강철 부츠": "https://i.ibb.co/fz7SNcmz/2.png",
    "겨울 코트": "https://i.ibb.co/vMYtrLQ/Gemini-Generated-Image-pv9678pv9678pv96.png",
    "윙 부츠": "https://i.ibb.co/fz7SNcmz/2.png",
    "가죽 장갑": "https://i.ibb.co/Xx9gCGHh/Gemini-Generated-Image-1a1d6z1a1d6z1a1d.png",
    "무녀복":"https://i.ibb.co/MywPs9W4/Gemini-Generated-Image-bgf8e9bgf8e9bgf8.png",
    "보안관 뱃지":"https://i.ibb.co/CKB82QLc/Gemini-Generated-Image-ryuu5lryuu5lryuu.png",
    "오우거 건틀릿": "https://i.ibb.co/5xssZdpH/Gemini-Generated-Image-lm750tlm750tlm75.png",
    "천 장갑":"https://i.ibb.co/v6tW0qgM/Gemini-Generated-Image-txfgd2txfgd2txfg.png",
    "강철 건틀릿":"https://i.ibb.co/JFQk0L3r/Gemini-Generated-Image-w9xvniw9xvniw9xv.png",
    "현자의 돌 (파편)":"https://i.ibb.co/KpL5k28P/Gemini-Generated-Image-iki55giki55giki5.png",
    "암살자의 단도":"https://i.ibb.co/LGXFKQ9/Gemini-Generated-Image-12gsng12gsng12gs-1.png",
    "돌 부적":"https://i.ibb.co/HZQsTzH/Gemini-Generated-Image-j5bijcj5bijcj5bi.png",
    "돌멩이 주머니":"https://i.ibb.co/Vpt87K2C/Gemini-Generated-Image-etir5vetir5vetir.png",
    "여행용 육포":"https://i.ibb.co/VWynqyyT/Gemini-Generated-Image-s405yls405yls405.png",
    "마른 빵":"https://i.ibb.co/bjnP4hb4/Gemini-Generated-Image-iwx3isiwx3isiwx3.png",
    "보급형 붕대":"https://i.ibb.co/0RSnpQR6/Gemini-Generated-Image-ggej75ggej75ggej.png",
    //추가
    "천사의 날개 신발":"https://i.ibb.co/8DBbN4hs/Gemini-Generated-Image-ble476ble476ble4.png",
    "천국의 활":"https://i.ibb.co/8Dhk1YvR/Kakao-Talk-20251224-165533407-05.png",
    "아다만티움 갑옷":"https://i.ibb.co/dRJr9BC/1.png",
    "이지스의 방패":"https://i.ibb.co/mCWSXPpC/Kakao-Talk-20251224-165703403-01.png",
    "절대 반지의 파편":"https://i.ibb.co/35yMc1WV/Kakao-Talk-20251224-165703403.png",
    
    // 심야 암시장 고대 보물함 전용 장비 이미지 매핑
    "[전설] 고대 암흑의 마법도": "https://i.ibb.co/LXTw2Bmk/Kakao-Talk-20260105-221438797-01.png",
    "[전설] 그림자 사신의 흉갑": "https://i.ibb.co/1BzsCst/Kakao-Talk-20260105-221438797-04.png",
    "[전설] 흑요석 용의 가호 목걸이": "https://i.ibb.co/1GCj1Rx4/Gemini-Generated-Image-zexal1zexal1zexa.png",
    "[에픽] 심연 기사의 중갑": "https://i.ibb.co/RGqxb6kx/Gemini-Generated-Image-n56nd8n56nd8n56n.png",
    "[에픽] 어둠의 추적자 단검": "https://i.ibb.co/8gc7BCs8/Gemini-Generated-Image-t0mu6tt0mu6tt0mu.png",
    "[에픽] 황천의 마력 반지": "https://i.ibb.co/1GCj1Rx4/Gemini-Generated-Image-zexal1zexal1zexa.png",
    "[유니크] 고대 지하도시 장검": "https://i.ibb.co/ZpTVjmQZ/Gemini-Generated-Image-7k1m5e7k1m5e7k1m.png",
    "[유니크] 어둠 서린 가죽 튜닉": "https://i.ibb.co/pr6MWmK2/target-08-shadow-leather_tunic.jpg",
    "어둠 서린 가죽 튜닉": "https://i.ibb.co/pr6MWmK2/target-08-shadow-leather_tunic.jpg",
    "[유니크] 밀수꾼의 행운 나침반": "https://i.ibb.co/1GCj1Rx4/Gemini-Generated-Image-zexal1zexal1zexa.png",
    "[레어] 심연 암석 망치": "https://i.ibb.co/8DXCnWkm/Gemini-Generated-Image-5ec4um5ec4um5ec4.png",
    "[레어] 그림자 보행자 경갑": "https://i.ibb.co/8LNt6rRV/target-09-shadow-walker_greaves.jpg",
    "그림자 보행자 경갑": "https://i.ibb.co/8LNt6rRV/target-09-shadow-walker_greaves.jpg",
    "[레어] 어둠의 호신 부적": "https://i.ibb.co/1GCj1Rx4/Gemini-Generated-Image-zexal1zexal1zexa.png",
    
    // 몬스터 및 전리품 이미지 맵
    "산삼 뿌리": "https://i.ibb.co/TMvKnYfM/Gemini-Generated-Image-th72oith72oith72.png",
    "작은 뼛조각": "https://i.ibb.co/bM0MTqn6/Gemini-Generated-Image-k1mtjuk1mtjuk1mt.png",
    "환도": "https://i.ibb.co/k2Hsg3YZ/Gemini-Generated-Image-1k8zi91k8zi91k8z.png",
    "해태의 앞발톱": "https://i.ibb.co/vrXzgj4/Gemini-Generated-Image-3ezryc3ezryc3ezr.png",
    "벽조목 조각": "https://i.ibb.co/4nL2mBqs/Gemini-Generated-Image-ablvnwablvnwablv.png",
    "도깨비 방망이 조각": "https://i.ibb.co/GvYpZYSN/Gemini-Generated-Image-4vg2vw4vg2vw4vg2.png",
    "오색 비단": "https://i.ibb.co/Z6BkFRLS/Gemini-Generated-Image-7xebn37xebn37xeb.png",
    "여우 구슬": "https://i.ibb.co/hF4wpZNH/Gemini-Generated-Image-hjk2xhjk2xhjk2xh.png",
    "불가사리의 쇠조각": "https://i.ibb.co/xt3qLyNS/Gemini-Generated-Image-wz7ms7wz7ms7wz7m.png",
    "두정갑 파편": "https://i.ibb.co/Z1c64DsH/Gemini-Generated-Image-7yb6dk7yb6dk7yb6.png",
    "청룡의 역린검": "https://i.ibb.co/ksR236f9/Gemini-Generated-Image-rub865rub865rub8.png",
    "백호의 발톱 너클": "https://i.ibb.co/wrFMHBqn/Gemini-Generated-Image-89jws089jws089jw.png",
    "해태의 수호 방패": "https://i.ibb.co/DgV77n9G/Gemini-Generated-Image-wy5go9wy5go9wy5g.png",
    "사인검": "https://i.ibb.co/hRPdwHMP/Gemini-Generated-Image-1lu7sk1lu7sk1lu7.png",
    "화룡의 창": "https://i.ibb.co/CKN8472S/Gemini-Generated-Image-hzi6bbhzi6bbhzi6.png",
    "부서진 갓": "https://i.ibb.co/s9RqfwJp/Gemini-Generated-Image-u31nbvu31nbvu31n.png",
    "어둑시니의 눈물": "https://i.ibb.co/Fbp6Hd3T/Gemini-Generated-Image-tw2z9wtw2z9wtw2z.png",
    "귀면와 조각": "https://i.ibb.co/bM84k7r2/Gemini-Generated-Image-xnv46axnv46axnv4.png",
    "주작의 활": "https://i.ibb.co/r262qSyJ/Gemini-Generated-Image-9uyi5s9uyi5s9uyi.png",
    "영롱한 노리개": "https://i.ibb.co/k6r00nKh/Gemini-Generated-Image-139nop139nop139n.png",
    "화랑의 부러진 활": "https://i.ibb.co/hnS1dqb/Gemini-Generated-Image-9lqn0z9lqn0z9lqn.png",
    "사령의 부적": "https://i.ibb.co/9kddgYft/Gemini-Generated-Image-99nbg199nbg199nb.png",
    "무령왕릉 금제 관장식": "https://i.ibb.co/27pCNtct/Gemini-Generated-Image-v5xzokv5xzokv5xz.png",
    "거상 김만덕의 장부": "https://i.ibb.co/qYDd5mft/Gemini-Generated-Image-5ia2575ia2575ia2.png",
    "각시탈": "https://i.ibb.co/whQn4WSN/Gemini-Generated-Image-f34kl4f34kl4f34k.png",
    "불고기 도시락": "https://i.ibb.co/TBPPcMQv/Gemini-Generated-Image-e6gy3be6gy3be6gy.png",
    "강철이의 비늘": "https://i.ibb.co/pB2Rsn5x/Gemini-Generated-Image-fohwaffohwaffohw.png",
    "천년 묵은 산삼": "https://i.ibb.co/pvJ9Y5BW/Gemini-Generated-Image-8h7rzw8h7rzw8h7r.png",
    "마력석": "https://i.ibb.co/LzN2nMJx/Gemini-Generated-Image-ot9wlfot9wlfot9w.png",
    "희귀한 보석": "https://i.ibb.co/kN3MjSm/Gemini-Generated-Image-cmj8pmcmj8pmcmj8.png",
    "상급 포션 세트": "https://i.ibb.co/Lhnm5v1R/Gemini-Generated-Image-73pxa73pxa73pxa7.png",
    "용사의 증표": "https://i.ibb.co/PZdTg3K3/Gemini-Generated-Image-meuc59meuc59meuc.png",
    "보스 영혼석": "https://i.ibb.co/84zHFCyt/Gemini-Generated-Image-nbsdr6nbsdr6nbsd.png",
    "고대 문서": "https://i.ibb.co/XxVPH4F3/Gemini-Generated-Image-8hr48v8hr48v8hr4.png",
    "드래곤의 비늘": "https://i.ibb.co/5hqNrm16/Gemini-Generated-Image-j5fc6lj5fc6lj5fc.png",
    "가죽 조각": "https://i.ibb.co/CpVkKTB9/Gemini-Generated-Image-ozfn11ozfn11ozfn.png",
    "작은 돌": "https://i.ibb.co/mF5Lcp0j/Gemini-Generated-Image-loawr9loawr9loaw.png",
    "짐승의 가죽": "https://i.ibb.co/zTpv2tS4/Gemini-Generated-Image-hyb4kbhyb4kbhyb4.png",
    "날카로운 이빨": "https://i.ibb.co/NgRk4hgq/Gemini-Generated-Image-8adowo8adowo8ado.png",
    "고기": "https://i.ibb.co/SwJfJ5XV/Gemini-Generated-Image-fz4p7ufz4p7ufz4p.png",
    "야수의 발톱": "https://i.ibb.co/RG0D0X9q/Gemini-Generated-Image-6fs6ct6fs6ct6fs6.png",
    "부러진 뼈": "https://i.ibb.co/RTwjMSx9/Gemini-Generated-Image-l8j9iml8j9iml8j9.png",
    "저주받은 천": "https://i.ibb.co/pv69W1jn/Gemini-Generated-Image-pp0s7mpp0s7mpp0s.png",
    "해골 반지": "https://i.ibb.co/xVjCbw7/Gemini-Generated-Image-na3aj9na3aj9na3a.png",
    "어둠의 정수": "https://i.ibb.co/MxYj9Y4f/Gemini-Generated-Image-1qcd0q1qcd0q1qcd.png",
    "슬라임 젤리": "https://i.ibb.co/353hrGXj/Gemini-Generated-Image-svpa3dsvpa3dsvpa.png",
    "끈적한 액체": "https://i.ibb.co/93109NKs/Gemini-Generated-Image-pc7kjwpc7kjwpc7k.png",

    // [확장 신규 아이템 이미지 매핑]
    "은장도": "https://i.ibb.co/qGb8FPt/7.png",
    "바람의 단궁": "https://i.ibb.co/0jm72MhS/2.png",
    "경량 가죽 너클": "https://i.ibb.co/JWXCq217/5.png",
    "훈련용 목봉": "https://i.ibb.co/QFwcSGBC/6.png",
    "수련용 단창": "https://i.ibb.co/mdrgyVz/8.png",
    "초급 마법 지팡이": "https://i.ibb.co/PzmWXLdG/4.png",
    "가죽 방패": "https://i.ibb.co/7xdmfNt2/9.png",
    "견습 마법사 의복": "https://i.ibb.co/xRg13p6/Gemini-Generated-Image-pphuljpphuljpphu.png",
    
    "바람의 레이피어": "https://i.ibb.co/hFCtVz9n/5.png",
    "가시 철퇴": "https://i.ibb.co/QFwcSGBC/6.png",
    "쌍날 전도끼": "https://i.ibb.co/b5KLzxFN/6.png",
    "정밀 석궁": "https://i.ibb.co/v6Tt1NkN/4.png",
    "화염 너클": "https://i.ibb.co/4wVHS2rq/3.png",
    "화염의 지팡이": "https://i.ibb.co/zVWhhY9z/5.png",
    "빙결의 지팡이": "https://i.ibb.co/4nQznZKv/4.png",
    "독 수리검": "https://i.ibb.co/cSsfXy5N/3.png",
    "리볼버 피스톨": "https://i.ibb.co/43MWds6/7.png",
    "화염 수정구": "https://i.ibb.co/zVYMFS6z/2.png",
    "독에 젖은 단검": "https://i.ibb.co/C3wYMdWH/2.png",
    "철제 환영 투구": "https://i.ibb.co/Xfnsyh5J/1.png",
    "바람의 가죽 부츠": "https://i.ibb.co/fz7SNcmz/2.png",
    "정밀한 사냥꾼 장갑": "https://i.ibb.co/Xx9gCGHh/Gemini-Generated-Image-1a1d6z1a1d6z1a1d.png",
    "룬 문양 반지": "https://i.ibb.co/35yMc1WV/Kakao-Talk-20251224-165703403.png",

    "용혈검": "https://i.ibb.co/qGb8FPt/7.png",
    "적염의 창": "https://i.ibb.co/mdrgyVz/8.png",
    "파쇄의 해머": "https://i.ibb.co/QFwcSGBC/6.png",
    "질풍의 건틀릿": "https://i.ibb.co/JWXCq217/5.png",
    "정령의 활": "https://i.ibb.co/d0q4HSQ5/3.png",
    "흑철 연발 석궁": "https://i.ibb.co/v6Tt1NkN/4.png",
    "환영 표창": "https://i.ibb.co/cSsfXy5N/3.png",
    "장전식 쇼트건": "https://i.ibb.co/pBt0cgwh/5.png",
    "뇌전의 지팡이": "https://i.ibb.co/PzmWXLdG/4.png",
    "플라즈마 커터": "https://i.ibb.co/1DgJ8cm/6.png",
    "암흑의 마도서": "https://i.ibb.co/35tcVwdj/3.png",
    "기사단의 철방패": "https://i.ibb.co/7xdmfNt2/9.png",
    "은빛 패링 대거": "https://i.ibb.co/C3wYMdWH/2.png",
    "은빛 사슬 갑옷": "https://i.ibb.co/dRJr9BC/1.png",
    "지혜의 서클릿": "https://i.ibb.co/Xfnsyh5J/1.png",
    "신속의 깃털 부츠": "https://i.ibb.co/fz7SNcmz/2.png",
    "마력 증폭 장갑": "https://i.ibb.co/JFQk0L3r/Gemini-Generated-Image-w9xvniw9xvniw9xv.png",
    "수호의 아뮬렛": "https://i.ibb.co/HZQsTzH/Gemini-Generated-Image-j5bijcj5bijcj5bi.png",
    "광명의 펜던트": "https://i.ibb.co/MydZ27sy/Gemini-Generated-Image-e26aeme26aeme26a.png",
    "특급 HP 포션": "https://i.ibb.co/FLhVqT71/3.png",
    "특급 MP 포션": "https://i.ibb.co/chRFk45B/3.png",
    "공격력 강화 주문서": "https://i.ibb.co/8gmGQGzD/Gemini-Generated-Image-9tfrwj9tfrwj9tfr.png",
    "방어력 강화 주문서": "https://i.ibb.co/RTWm7gY7/Gemini-Generated-Image-ubpe0lubpe0lubpe.png",
    "신속의 도핑약": "https://i.ibb.co/FThpY9q/Gemini-Generated-Image-8o5ck98o5ck98o5c.png",

    "서리한": "https://i.ibb.co/MyNxL1N1/2.png",
    "빛의 성검": "https://i.ibb.co/N5bSDBt/3.png",
    "신뇌의 창": "https://i.ibb.co/7xLfV3xX/1.png",
    "대지의 울림 해머": "https://i.ibb.co/gLTWSHL2/4.png",
    "광전사의 도끼": "https://i.ibb.co/G4Zt9Gnb/4.png",
    "신마의 권갑": "https://i.ibb.co/dsyvRKDP/5.png",
    "태양의 각궁": "https://i.ibb.co/hJXxvXPQ/6.png",
    "신성한 발리스타": "https://i.ibb.co/v6Tt1NkN/4.png",
    "마공 라이플": "https://i.ibb.co/S4zRD0Nv/Kakao-Talk-20251224-170321153.png",
    "흑철 대포": "https://i.ibb.co/1DgJ8cm/6.png",
    "마도 파동포": "https://i.ibb.co/qMsY1wtL/7.png",
    "성스러운 지팡이": "https://i.ibb.co/cS8MZnY2/11.png",
    "소환사의 전서": "https://i.ibb.co/35tcVwdj/3.png",
    "천상 지식의 서": "https://i.ibb.co/jkkHZGjQ/8.png",
    "용비늘 방패": "https://i.ibb.co/L3124bg/9.png",
    "심연의 마정구": "https://i.ibb.co/DHjq0KQ8/10.png",
    "불멸의 이지스": "https://i.ibb.co/mCWSXPpC/Kakao-Talk-20251224-165703403-01.png",
    "칠흑의 암살자 의복": "https://i.ibb.co/xRg13p6/Gemini-Generated-Image-pphuljpphuljpphu.png",
    "드래곤 비늘 갑옷": "https://i.ibb.co/dRJr9BC/1.png",
    "성기사의 흉갑": "https://i.ibb.co/dRJr9BC/1.png",
    "용의 뿔 왕관": "https://i.ibb.co/Xfnsyh5J/1.png",
    "거인의 강철 부츠": "https://i.ibb.co/fz7SNcmz/2.png",
    "용인 건틀릿": "https://i.ibb.co/JFQk0L3r/Gemini-Generated-Image-w9xvniw9xvniw9xv.png",
    "심연의 목걸이": "https://i.ibb.co/35yMc1WV/Kakao-Talk-20251224-165703403.png",
    "전설의 행운 반지": "https://i.ibb.co/35yMc1WV/Kakao-Talk-20251224-165703403.png",
    "용의 심장 보석": "https://i.ibb.co/KpL5k28P/Gemini-Generated-Image-iki55giki55giki5.png",
    "용의 피": "https://i.ibb.co/1J7XGLRp/Gemini-Generated-Image-29rrw029rrw029rr.png",
    "마력 회복 영약": "https://i.ibb.co/cSZMwD69/5.png",

    // 국가 특산 확장
    "백두산의 기운이 담긴 도검": "https://i.ibb.co/1B6g474/1.png",
    "삼국시대 장수의 구각갑": "https://i.ibb.co/sdVM8mBh/15-7.png",
    "특수부대 전투 조끼": "https://i.ibb.co/WWgWnXcS/15-6.png",
    "전술 스나이퍼 건": "https://i.ibb.co/svzTGcBX/15-4.png",
    "왕실 근위대의 장검": "https://i.ibb.co/MkmTnfQb/16.png",
    "원탁의 기사 세이버": "https://i.ibb.co/0yCqWLsf/15-5.png",
    "요도 무라마사": "https://i.ibb.co/qYT539pp/15-2.png",
    "닌자 닌구 조끼": "https://i.ibb.co/f5fdrCR/15.png",
    "여포의 방천화극": "https://i.ibb.co/49vfGqZ/18.png",
    "비단 무협 도포": "https://i.ibb.co/B2kvFQL4/17.png",
    "왕실 펜싱검": "https://i.ibb.co/39gYLD3s/15-3.png",
    "태양왕의 비단 의복": "https://i.ibb.co/Q7GMBtcQ/15.png",
    "라인하르트의 전신 갑옷": "https://i.ibb.co/cRz3yBr/14.png",
    "철혈 정밀 대포": "https://i.ibb.co/r2DfgQh1/13.png",
    "혹한의 체인메일": "https://i.ibb.co/k2pmLR8h/12.png",
    "시베리아 모피 모자": "https://i.ibb.co/qMNhxyZ5/11.png",
    "파라오의 골든 핑거링": "https://i.ibb.co/DDLNQm11/10.png",
    "스핑크스의 부적": "https://i.ibb.co/PZJ4yvtc/9.png",
    "제국 근위대 제복": "https://i.ibb.co/k6SSFLJC/7.png",
    "마황의 왕관": "https://i.ibb.co/wZSnWy46/2.png",
    "영혼 흡수 단검": "https://i.ibb.co/LD9jMWt1/8.png",
    "사망의 유골 왕관": "https://i.ibb.co/zW9sgwJt/1.png",
    "세계수의 가지 지팡이": "https://i.ibb.co/B5KGxZ8K/4.png",
    "요정왕의 서클릿": "https://i.ibb.co/S74cNBfG/3.png",
    "야수왕의 가죽 벨트": "https://i.ibb.co/HTmmrrxG/5.png",
    "투기장 챔피언 너클": "https://i.ibb.co/k2TF5s7r/6.png"

};

export const getFallbackImage = (type: string, weaponType?: string) => {
    if (type === 'Weapon' || type.includes('Weapon')) {
        if (weaponType === 'Sword') return "https://i.ibb.co/qGb8FPt/7.png";
        if (weaponType === 'Bow') return "https://i.ibb.co/0jm72MhS/2.png";
        if (weaponType === 'Axe') return "https://i.ibb.co/G4Zt9Gnb/4.png";
        if (weaponType === 'Blunt') return "https://i.ibb.co/QFwcSGBC/6.png";
        return "https://i.ibb.co/Kz56VGDS/image.png";
    }
    if (type === 'SubWeapon') return "https://i.ibb.co/mCWSXPpC/Kakao-Talk-20251224-165703403-01.png";
    if (type === 'Body' || type.includes('Armor')) return "https://i.ibb.co/dRJr9BC/1.png";
    if (type === 'Head') return "https://i.ibb.co/cSM290NW/3.png";
    if (type === 'Feet') return "https://i.ibb.co/8DBbN4hs/Gemini-Generated-Image-ble476ble476ble4.png";
    if (type === 'Hand') return "https://i.ibb.co/Kz56VGDS/image.png";
    if (type === 'Accessory') return "https://i.ibb.co/35yMc1WV/Kakao-Talk-20251224-165703403.png";
    if (type.includes('Consumable')) return "https://i.ibb.co/7dckmsMV/1.png";
    return "https://i.ibb.co/6RsrXBZW/image.png";
};

export const getItemDisplayImageUrl = (item?: Partial<Item> | string | null): string => {
    if (!item) return "https://i.ibb.co/6RsrXBZW/image.png";
    if (typeof item === 'string') {
        const registered = getRegisteredItemImage(item);
        if (registered) return registered;
        return ITEM_IMAGE_MAP[item] || "https://i.ibb.co/6RsrXBZW/image.png";
    }
    if (item.name) {
        const registered = getRegisteredItemImage(item.name);
        if (registered) return registered;
        if (ITEM_IMAGE_MAP[item.name]) return ITEM_IMAGE_MAP[item.name];
    }
    if (item.visualUrl && !isFallbackVisualUrl(item.visualUrl)) return item.visualUrl.trim();
    if (item.imageUrl && !isFallbackVisualUrl(item.imageUrl)) return item.imageUrl.trim();
    return getFallbackImage(item.type || '', item.weaponType);
};

// Items Generation Helper
const createShopItem = (name: string, type: Item['type'], rarity: ItemRarity, cost: number, desc: string, stats?: any, options?: string[], stock?: number, weaponType?: WeaponType, elementalType?: string, reputationReq?: any, reputationPriceMod?: any): Item => {
    const item: Item = {
        name, type, rarity, description: desc, stats, secondaryOptions: options, enhancement: 0, stock: stock, weaponType, elementalType, price: cost, reputationReq, reputationPriceMod
    };
    item.imageUrl = getRegisteredItemImage(name) || ITEM_IMAGE_MAP[name] || getFallbackImage(type);
    return item;
};

// --- BASE ITEM SETS (Cumulative Logic) ---

const TIER_1_GENERAL = [
    createShopItem("최하급 HP 포션", "Consumable", ItemRarity.NORMAL, 300, "HP 50 회복", undefined, ["HP 50 회복"], 999),
    createShopItem("최하급 MP 포션", "Consumable", ItemRarity.NORMAL, 300, "MP 30 회복", undefined, ["MP 30 회복"], 999),
    createShopItem("피로회복제", "Consumable", ItemRarity.NORMAL, 80000, "복용 시 피로도를 30 회복(감소)시키는 활력 물약", undefined, ["피로도 10 감소"], 999),
    createShopItem("보급형 붕대", "Consumable", ItemRarity.NORMAL, 200, "출혈 상태이상 제거", undefined, ["상태이상 해제(출혈)"], 999),
    createShopItem("마른 빵", "Consumable", ItemRarity.NORMAL, 50, "HP 10 회복", undefined, ["HP 10 회복"], 999),
    createShopItem("최하급 포획 그물", "Consumable", ItemRarity.NORMAL, 5000, "레벨 30까지의 몬스터를 포획 가능하다.(몬스터 사육소 있어야 가능)", undefined, ["몬스터 포획(30)"], 999),
    createShopItem("하급 포획 그물", "Consumable", ItemRarity.MAGIC, 50000, "레벨 70까지의 몬스터를 포획 가능하다.(몬스터 사육소 있어야 가능)", undefined, ["몬스터 포획(70)"], 999),
    createShopItem("중급 포획 그물", "Consumable", ItemRarity.RARE, 100000, "레벨 120까지의 몬스터를 포획 가능하다.(몬스터 사육소 있어야 가능)", undefined, ["몬스터 포획(120)"], 999),
    createShopItem("상급 포획 그물", "Consumable", ItemRarity.UNIQUE, 500000, "레벨 200까지의 몬스터를 포획 가능하다.(몬스터 사육소 있어야 가능)", undefined, ["몬스터 포획(200)"], 999),
    createShopItem("최상급 포획 그물", "Consumable", ItemRarity.LEGENDARY, 1000000, "레벨 300까지의 몬스터를 포획 가능하다.(몬스터 사육소 있어야 가능)", undefined, ["몬스터 포획(300)"], 999),
];

const TIER_1_WEAPONS = [
    createShopItem("수련용 목검", "Weapon", ItemRarity.NORMAL, 500, "나무로 깎은 검", { str: 2 }, ["물리 공격력 +1"], 999, 'Sword'),
    createShopItem("나무 창", "Weapon", ItemRarity.NORMAL, 550, "끝을 뾰족하게 깎은 나무 창", { str: 2 }, ["agi +2"], 999, 'Spear'),
    createShopItem("나무 몽둥이", "Weapon", ItemRarity.NORMAL, 400, "단단한 나무 몽둥이", { str: 3 }, ["물리 공격력 +2"], 999, 'Blunt'),
    createShopItem("나무 도끼", "Weapon", ItemRarity.NORMAL, 600, "나무를 벨 때 쓰는 도끼", { str: 3 }, ["치명타 확률 +1%"], 999, 'Axe'),
    createShopItem("나무 활", "Weapon", ItemRarity.NORMAL, 700, "탄력이 적은 나무 활", { agi: 2 }, ["물리 명중률 +1%"], 999, 'Bow'),
    createShopItem("돌멩이 주머니", "Weapon", ItemRarity.NORMAL, 200, "던기기 좋은 돌멩이들", { agi: 1 }, ["물리 공격력 +1"], 999, 'Thrown'),
    createShopItem("낡은 나무 지팡이", "Weapon", ItemRarity.NORMAL, 600, "마력이 아주 조금 느껴지는 나뭇가지", { int: 2 }, ["마법 공격력 +1"], 999, 'Staff'),
    createShopItem("기본 격투 장갑", "Weapon", ItemRarity.NORMAL, 400, "손을 보호하는 천 장갑", { str: 1, agi: 1 }, ["AGI +1"], 999, 'Knuckle'),
        createShopItem("돌 부적", "SubWeapon", ItemRarity.NORMAL, 500, "행운을 비는 돌", { wis: 1 }, ["마법 방어력 +1"], 999, 'Orb'),
    createShopItem("녹슨 단도", "SubWeapon", ItemRarity.NORMAL, 450, "보조용 단도", { str: 1 }, ["agi +1"], 999, 'SubSword'),
    createShopItem("입문용 마법서", "Weapon", ItemRarity.NORMAL, 800, "기초 마법 이론이 적힌 책", { int: 2, wis: 1 }, ["MP +1%"], 999, 'Grimoire'),
];

const TIER_1_ARMOR = [
    createShopItem("천 옷", "Body", ItemRarity.NORMAL, 500, "거친 천으로 만든 옷", { def: 1 }, ["물리 방어력 +1"], 999),
    createShopItem("천 모자", "Head", ItemRarity.NORMAL, 300, "햇빛을 가리는 모자", { def: 1 }, [], 999),
    createShopItem("천 신발", "Feet", ItemRarity.NORMAL, 300, "발을 감싸는 천", { agi: 1 }, [], 999),
    createShopItem("천 장갑", "Hand", ItemRarity.NORMAL, 200, "얇은 장갑", { def: 1 }, [], 999),
    createShopItem("나무 방패", "SubWeapon", ItemRarity.NORMAL, 400, "나무 판자를 덧댄 방패", { def: 2 }, ["물리 방어력 +1"], 999, 'Shield'),
];

const TIER_2_GENERAL = [
    createShopItem("하급 HP 포션", "Consumable", ItemRarity.NORMAL, 1000, "HP 200 회복", undefined, ["HP 200 회복"], 200),
    createShopItem("하급 MP 포션", "Consumable", ItemRarity.NORMAL, 1200, "MP 100 회복", undefined, ["MP 100 회복"], 200),
    createShopItem("강력한 피로회복제", "Consumable", ItemRarity.MAGIC, 250000, "복용 시 피로도를 50 회복(감소)시키는 농축 활력 영약", undefined, ["피로도 20 감소"], 200),
    createShopItem("해독제", "Consumable", ItemRarity.NORMAL, 1500, "중독 상태이상 제거", undefined, ["상태이상 해제(중독)"], 100),
    createShopItem("여행용 육포", "Consumable", ItemRarity.NORMAL, 500, "HP 50 회복", undefined, ["HP 50 회복"], 200),
];

const TIER_2_WEAPONS = [
    createShopItem("철검", "Weapon", ItemRarity.NORMAL, 5000, "표준적인 철검", { str: 10 }, ["물리 공격력 +5"], 100, 'Sword'),
    createShopItem("철창", "Weapon", ItemRarity.NORMAL, 5500, "날카로운 철제 창", { str: 11 }, ["물리 명중률 +1%"], 100, 'Spear'),
    createShopItem("철퇴 (Mace)", "Weapon", ItemRarity.NORMAL, 5200, "묵직한 철퇴", { str: 12 }, ["치명타율 +2%"], 100, 'Blunt'),
    createShopItem("철도끼", "Weapon", ItemRarity.NORMAL, 6000, "무거운 철제 도끼", { str: 14 }, ["치명타율 +1%"], 100, 'Axe'),
    createShopItem("철제 너클", "Weapon", ItemRarity.NORMAL, 4500, "주먹을 강화하는 너클", { str: 8, agi: 5 }, ["AGI +5"], 100, 'Knuckle'),
    createShopItem("철활", "Weapon", ItemRarity.NORMAL, 6000, "탄성이 좋은 철제 활", { agi: 12 }, ["AGI +2"], 100, 'Bow'),
    createShopItem("철제 석궁", "Weapon", ItemRarity.NORMAL, 7000, "강력한 위력의 석궁", { str: 5, agi: 10 }, ["물리 명중률 +5%"], 50, 'Crossbow'),
    createShopItem("철 수리검", "Weapon", ItemRarity.NORMAL, 3000, "날카로운 수리검", { agi: 8 }, ["물리 명중률 +5%"], 200, 'Thrown'),
    createShopItem("떡갈나무 지팡이", "Weapon", ItemRarity.NORMAL, 6000, "마력 전도율이 좋은 지팡이", { int: 10 }, ["마법 공격력 +5"], 100, 'Staff'),
    createShopItem("견습 마법서", "Weapon", ItemRarity.NORMAL, 5500, "중급 마법이 적힌 책", { int: 8, wis: 5 }, ["최대 MP +3%"], 100, 'Grimoire'),
    createShopItem("플린트락 권총", "Weapon", ItemRarity.NORMAL, 12000, "구식 화약 권총", { agi: 15 }, ["물리 명중률 +5%"], 30, 'Firearm'),
        createShopItem("마력의 구슬", "SubWeapon", ItemRarity.NORMAL, 5000, "마력을 머금은 구슬", { int: 5 }, ["마법 공격력 +2"], 100, 'Orb'),
    createShopItem("대거 (보조)", "SubWeapon", ItemRarity.NORMAL, 3500, "호신용 대거", { agi: 5 }, ["치명타 확률 +2%"], 100, 'SubSword'),
];

const TIER_2_ARMOR = [
    createShopItem("가죽 갑옷", "Body", ItemRarity.NORMAL, 4000, "질긴 가죽 갑옷", { def: 5 }, ["물리 방어력 +3"], 100),
    createShopItem("가죽 투구", "Head", ItemRarity.NORMAL, 2500, "가죽으로 만든 투구", { def: 3 }, [], 100),
    createShopItem("가죽 부츠", "Feet", ItemRarity.NORMAL, 2500, "편안한 가죽 부츠", { agi: 3, def: 2 }, ["AGI +5"], 100),
    createShopItem("가죽 장갑", "Hand", ItemRarity.NORMAL, 2000, "손을 보호하는 가죽 장갑", { def: 2 }, [], 100),
    createShopItem("라운드 실드", "SubWeapon", ItemRarity.NORMAL, 4000, "원형 철제 방패", { def: 8 }, ["물리 방어력 +5"], 100, 'Shield'),
];

const TIER_3_GENERAL = [
    createShopItem("중급 HP 포션", "Consumable", ItemRarity.MAGIC, 5000, "HP 800 회복", undefined, ["HP 800 회복"], 100),
    createShopItem("중급 MP 포션", "Consumable", ItemRarity.MAGIC, 6000, "MP 400 회복", undefined, ["MP 400 회복"], 100),
    createShopItem("만병통치약 (소)", "Consumable", ItemRarity.MAGIC, 10000, "대부분의 상태이상 해제", undefined, ["상태이상 해제(화상,빙결,중독)"], 50),
    createShopItem("활력의 물약", "Consumable", ItemRarity.MAGIC, 15000, "일시적으로 공격력 증가", undefined, ["STR +5%"], 20),
];

const TIER_3_WEAPONS = [
    createShopItem("강철 검", "Weapon", ItemRarity.MAGIC, 25000, "잘 제련된 강철 검", { str: 25 }, ["물리 공격력 +10%"], 50, 'Sword'),
    createShopItem("강철 창", "Weapon", ItemRarity.MAGIC, 27000, "견고한 강철 창", { str: 26 }, ["치명타 확률 +5%"], 50, 'Spear'),
    createShopItem("워해머", "Weapon", ItemRarity.MAGIC, 30000, "갑옷을 부수는 강철 망치", { str: 35 }, ["물리 공격력 +10%"], 50, 'Blunt'),
    createShopItem("배틀 액스", "Weapon", ItemRarity.MAGIC, 32000, "전투용 강철 도끼", { str: 38 }, ["치명타 피해량 +15%"], 50, 'Axe'),
    createShopItem("스파이크 너클", "Weapon", ItemRarity.MAGIC, 22000, "가시가 달린 너클", { str: 20, agi: 10 }, [], 50, 'Knuckle'),
    createShopItem("강철 활", "Weapon", ItemRarity.MAGIC, 28000, "장력이 강한 강철 활", { agi: 25 }, ["AGI +1%"], 50, 'Bow'),
    createShopItem("헤비 크로스보우", "Weapon", ItemRarity.MAGIC, 35000, "중형 석궁", { str: 15, agi: 15 }, ["STR +1%"], 30, 'Crossbow'),
    createShopItem("강철 표창", "Weapon", ItemRarity.MAGIC, 15000, "정교한 강철 표창", { agi: 20 }, [], 100, 'Thrown'),
    createShopItem("마법사의 지팡이", "Weapon", ItemRarity.MAGIC, 30000, "마력석이 박힌 지팡이", { int: 25, wis: 10 }, ["MP +2%"], 50, 'Staff'),
    createShopItem("원소 마법서", "Weapon", ItemRarity.MAGIC, 28000, "원소의 힘이 담긴 책", { int: 20, ctrl: 10 }, ["ctrl +5%"], 50, 'Grimoire'),
    createShopItem("머스킷 소총", "Weapon", ItemRarity.MAGIC, 50000, "정밀한 강선의 소총", { agi: 40 }, ["치명타 확률 +15%"], 20, 'Firearm'),
        createShopItem("마나석", "SubWeapon", ItemRarity.MAGIC, 30000, "순도 높은 마나석", { int: 15 }, ["MP +2%"], 50, 'Orb'),
    createShopItem("패링 대거", "SubWeapon", ItemRarity.MAGIC, 22000, "방어용 단검", { agi: 15 }, ["str +2"], 50, 'SubSword'),
];

const TIER_3_ARMOR = [
    createShopItem("사슬 갑옷", "Body", ItemRarity.MAGIC, 40000, "튼튼한 사슬 갑옷", { def: 15 }, ["물리 방어력 +10%"], 50),
    createShopItem("강철 투구", "Head", ItemRarity.MAGIC, 20000, "머리를 완벽히 보호하는 투구", { def: 8 }, ["wis +5"], 50),
    createShopItem("강철 부츠", "Feet", ItemRarity.MAGIC, 20000, "무겁지만 튼튼한 부츠", { def: 8 }, ["def +5"], 50),
    createShopItem("강철 건틀릿", "Hand", ItemRarity.MAGIC, 18000, "손목까지 보호하는 건틀릿", { def: 6 }, [], 50),
    createShopItem("카이트 실드", "SubWeapon", ItemRarity.MAGIC, 25000, "기병용 방패", { def: 15 }, [], 50, 'Shield'),

    createShopItem("마법사의 로브", "Body", ItemRarity.MAGIC, 35000, "마력이 깃든 로브", { def: 5, wis: 20 }, ["마법 방어력 +15%"], 50),
];

const TIER_4_GENERAL = [
    createShopItem("상급 HP 포션", "Consumable", ItemRarity.RARE, 6000, "HP 2000 회복", undefined, ["HP 2000 회복"], 50),
    createShopItem("상급 MP 포션", "Consumable", ItemRarity.RARE, 8000, "MP 1000 회복", undefined, ["MP 1000 회복"], 50),
    createShopItem("만병통치약", "Consumable", ItemRarity.RARE, 30000, "모든 상태이상 해제", undefined, ["모든 상태이상 해제"], 20),
    createShopItem("힘의 비약", "Consumable", ItemRarity.RARE, 50000, "일시적으로 힘 대폭 증가 (10턴)", undefined, ["STR +15% (10턴)"], 10),
    createShopItem("마나의 비약", "Consumable", ItemRarity.RARE, 50000, "일시적으로 지력 대폭 증가 (10턴)", undefined, ["INT +15% (10턴)"], 10),
];

const TIER_4_WEAPONS = [
    createShopItem("아다만티움 소드", "Weapon", ItemRarity.RARE, 500000, "절대 부러지지 않는 검", { str: 50, def: 10 }, ["물리 공격력 +20%"], 10, 'Sword'),
    createShopItem("미스릴 스피어", "Weapon", ItemRarity.RARE, 520000, "가볍고 치명적인 창", { str: 45, agi: 20 }, ["AGI +10%"], 10, 'Spear'),
    createShopItem("골든 해머", "Weapon", ItemRarity.RARE, 550000, "황금으로 장식된 파괴적인 망치", { str: 70 }, ["DEF +5%"], 10, 'Blunt'),
    createShopItem("드래곤 슬레이어 (Axe)", "Weapon", ItemRarity.RARE, 600000, "용의 비늘을 가르는 도끼", { str: 80 }, ["STR +5%"], 5, 'Axe'),
    createShopItem("다이아몬드 너클", "Weapon", ItemRarity.RARE, 480000, "가장 단단한 물질로 만든 너클", { str: 40, def: 20 }, ["AGI +5%"], 10, 'Knuckle'),
    createShopItem("엘프의 명궁", "Weapon", ItemRarity.RARE, 580000, "엘프 장인이 만든 활", { agi: 60, wis: 20 }, ["AGI +5%", "치명타율 +20%"], 10, 'Bow'),
    createShopItem("연발 석궁", "Weapon", ItemRarity.RARE, 620000, "빠르게 발사되는 석궁", { agi: 50 }, ["AGI +10%"], 10, 'Crossbow'),
    createShopItem("폭발 표창", "Weapon", ItemRarity.RARE, 400000, "폭발하는 표창", { agi: 40, int: 20 }, ["STR +10%"], 20, 'Thrown'),
    createShopItem("대현자의 지팡이", "Weapon", ItemRarity.RARE, 650000, "고대 현자의 지혜가 담긴 지팡이", { int: 60, wis: 40 }, ["마법 공격력 +25%"], 10, 'Staff'),
        createShopItem("현자의 돌 (파편)", "SubWeapon", ItemRarity.RARE, 700000, "무한한 마력을 가진 돌조각", { int: 40, wis: 40 }, ["MP +10%"], 5, 'Orb'),
    createShopItem("암살자의 단도", "SubWeapon", ItemRarity.RARE, 500000, "치명적인 독이 발린 보조무기", { agi: 30 }, ["치명타율 +30%"], 10, 'SubSword'),
    createShopItem("금단의 마도서", "Weapon", ItemRarity.RARE, 700000, "강력한 흑마법이 적힌 책", { int: 80, hp: -100 }, ["마법 공격력 +20%","모든 속성 피해 +20%"], 5, 'Grimoire'),
    createShopItem("저격용 레일건 (프로토타입)", "Weapon", ItemRarity.RARE, 1000000, "마법 공학의 정수", { agi: 80, int: 30 }, ["AGI +10%", "STR +10%"], 3, 'Energy'),
];

const TIER_4_ARMOR = [
    createShopItem("판금 갑옷 (Plate)", "Body", ItemRarity.RARE, 800000, "전신을 감싸는 판금 갑옷", { def: 60 }, ["물리 방어력 +25%", "최대 HP +1000"], 10),
    createShopItem("미스릴 투구", "Head", ItemRarity.RARE, 400000, "가볍고 단단한 투구", { def: 30, wis: 10 }, ["상태이상 저항 +10%"], 10),
    createShopItem("윙 부츠", "Feet", ItemRarity.RARE, 450000, "바람의 정령이 깃든 신발", { agi: 30 }, ["회피율 +10%", "AGI +5%"], 10),
    createShopItem("오우거 건틀릿", "Hand", ItemRarity.RARE, 350000, "오우거의 힘을 주는 장갑", { str: 20, def: 20 }, ["물리 공격력 +5%"], 10),
    createShopItem("타워 실드", "SubWeapon", ItemRarity.RARE, 600000, "거대한 방패", { def: 80, agi: -10 }, ["물리방어력 +10%"], 10, 'Shield'),
   createShopItem("아크메이지 로브", "Body", ItemRarity.RARE, 750000, "대마법사의 로브", { def: 20, int: 40, wis: 60 }, ["마법 공격력 +20%", "최대 MP +1000", "모든 속성 저항 +5%"], 10),
];

const TIER_5_GENERAL = [
    createShopItem("최상급 HP 포션", "Consumable", ItemRarity.EPIC, 60000, "HP 50% 회복", undefined, ["HP 50% 회복"], 20),
    createShopItem("최상급 MP 포션", "Consumable", ItemRarity.EPIC, 60000, "MP 50% 회복", undefined, ["MP 50% 회복"], 20),
    createShopItem("엘릭서", "Consumable", ItemRarity.UNIQUE, 100000, "HP/MP 100% 회복", undefined, ["HP 100% 회복", "MP 100% 회복"], 5),
];

export const getCityScroll = (nation: string, city: string): Item => {
    return {
        name: `[${city}] 차원이동 주문서`,
        type: 'Consumable',
        rarity: ItemRarity.MAGIC,
        description: `사용 시 ${nation}의 ${city}(으)로 즉시 이동합니다. (시간 소모 없음)`,
        price: 30000,
        imageUrl: "https://i.ibb.co/Zp1VCkcQ/Gemini-Generated-Image-o35is9o35is9o35i.png", // Generic scroll image
        secondaryOptions: [`['${nation}', '${city}' 으로 차원이동 주문서]`],
        stock: 10
    };
};



// ==========================================
// [EXTENDED ITEM DATA SETS - NEW ADDITIONS]
// ==========================================

const EXTENDED_TIER_1_GENERAL = [
    createShopItem("가죽 방패", "SubWeapon", ItemRarity.NORMAL, 600, "기본적인 가죽 방패", { def: 3 }, ["물리 방어력 +2"], 999, 'Shield'),
];

const EXTENDED_TIER_1_WEAPONS = [
    createShopItem("은장도", "Weapon", ItemRarity.NORMAL, 800, "은으로 만든 정교한 호신용 단검", { str: 3, agi: 2 }, ["AGI +1"], 999, 'Sword'),
    createShopItem("바람의 단궁", "Weapon", ItemRarity.NORMAL, 750, "가볍게 쏠 수 있는 미니 활", { agi: 4 }, ["물리 명중률 +2%"], 999, 'Bow'),
    createShopItem("경량 가죽 너클", "Weapon", ItemRarity.NORMAL, 600, "가벼운 가죽 권갑", { agi: 3 }, ["AGI +2"], 999, 'Knuckle'),
    createShopItem("훈련용 목봉", "Weapon", ItemRarity.NORMAL, 500, "단단하게 잘 마른 목봉", { str: 3 }, ["물리 공격력 +1"], 999, 'Blunt'),
    createShopItem("수련용 단창", "Weapon", ItemRarity.NORMAL, 650, "초보 무관용 찌르기 창", { str: 2, agi: 2 }, ["물리 명중률 +1%"], 999, 'Spear'),
    createShopItem("초급 마법 지팡이", "Weapon", ItemRarity.NORMAL, 850, "원소 마력을 다루는 입문 지팡이", { int: 3, wis: 2 }, ["마법 공격력 +2"], 999, 'Staff'),
];

const EXTENDED_TIER_1_ARMOR = [
    createShopItem("견습 마법사 의복", "Body", ItemRarity.NORMAL, 600, "마법 수련용의 얇은 로브", { def: 2, wis: 5 }, ["마법 방어력 +2"], 999),
];

const EXTENDED_TIER_2_GENERAL = [
    createShopItem("룬 문양 반지", "Accessory", ItemRarity.MAGIC, 25000, "희미한 마력 룬이 새겨진 반지", { int: 8, wis: 8 }, ["최대 MP +5%"], 100),
];

const EXTENDED_TIER_2_WEAPONS = [
    createShopItem("바람의 레이피어", "Weapon", ItemRarity.MAGIC, 15000, "바람처럼 빠른 찌르기 검", { agi: 15 }, ["치명타 확률 +5%", "AGI +5"], 100, 'Sword'),
    createShopItem("가시 철퇴", "Weapon", ItemRarity.MAGIC, 12000, "가시 돋친 쇠구슬 둔기", { str: 18 }, ["치명타 피해량 +10%"], 100, 'Blunt'),
    createShopItem("쌍날 전도끼", "Weapon", ItemRarity.MAGIC, 16000, "양쪽에 날이 선 중형 도끼", { str: 22 }, ["STR +3%"], 100, 'Axe'),
    createShopItem("정밀 석궁", "Weapon", ItemRarity.MAGIC, 18000, "조준경이 달린 정밀 조준 석궁", { agi: 18, str: 5 }, ["물리 명중률 +10%"], 80, 'Crossbow'),
    createShopItem("화염 너클", "Weapon", ItemRarity.MAGIC, 14000, "불꽃을 품은 타격 권갑", { str: 12, agi: 10 }, ["화염계 속성 부여"], 100, 'Knuckle', '화염계'),
    createShopItem("화염의 지팡이", "Weapon", ItemRarity.MAGIC, 17000, "불길을 불어넣는 마법 지팡이", { int: 18, wis: 8 }, ["화염계 속성 피해 +10%"], 100, 'Staff', '화염계'),
    createShopItem("빙결의 지팡이", "Weapon", ItemRarity.MAGIC, 17000, "냉기를 발산하는 정령 지팡이", { int: 18, wis: 8 }, ["빙결계 속성 피해 +10%"], 100, 'Staff', '빙결계'),
    createShopItem("독 수리검", "Weapon", ItemRarity.MAGIC, 8000, "독약에 적신 암살용 수리검", { agi: 14 }, ["상태이상 부여(중독)"], 150, 'Thrown'),
    createShopItem("리볼버 피스톨", "Weapon", ItemRarity.MAGIC, 25000, "6발 연사가 가능한 피스톨", { agi: 20 }, ["치명타율 +8%"], 50, 'Firearm'),
    createShopItem("화염 수정구", "SubWeapon", ItemRarity.MAGIC, 20000, "화염 마력을 축적하는 구슬", { int: 12 }, ["마법 공격력 +5%"], 80, 'Orb', '화염계'),
    createShopItem("독에 젖은 단검", "SubWeapon", ItemRarity.MAGIC, 18000, "기습용 치명적 보조 단검", { agi: 12, str: 5 }, ["치명타 피해량 +10%"], 80, 'SubSword'),
];

const EXTENDED_TIER_2_ARMOR = [
    createShopItem("철제 환영 투구", "Head", ItemRarity.MAGIC, 15000, "환영 효과로 공격을 교란하는 투구", { def: 6, agi: 4 }, ["회피율 +3%"], 100),
    createShopItem("바람의 가죽 부츠", "Feet", ItemRarity.MAGIC, 12000, "발걸음을 가볍게 만들어주는 부츠", { agi: 8, def: 3 }, ["AGI +3"], 100),
    createShopItem("정밀한 사냥꾼 장갑", "Hand", ItemRarity.MAGIC, 10000, "손가락 마디가 트인 활잡이 장갑", { agi: 6, str: 4 }, ["물리 명중률 +5%"], 100),
];

const EXTENDED_TIER_3_GENERAL = [
    createShopItem("수호의 아뮬렛", "Accessory", ItemRarity.RARE, 120000, "방어의 가호가 서린 아뮬렛", { def: 15, wis: 15 }, ["모든 속성 저항 +5%"], 50),
    createShopItem("광명의 펜던트", "Accessory", ItemRarity.RARE, 150000, "정신력을 드높이는 빛의 목걸이", { wis: 25 }, ["MP +10%"], 50),
    createShopItem("특급 HP 포션", "Consumable", ItemRarity.RARE, 15000, "HP 3500 회복", undefined, ["HP 3500 회복"], 50),
    createShopItem("특급 MP 포션", "Consumable", ItemRarity.RARE, 15000, "MP 1800 회복", undefined, ["MP 1800 회복"], 50),
    createShopItem("특급 피로회복제", "Consumable", ItemRarity.RARE, 1000000, "복용 시 피로도를 80 회복(감소)시키는 최고급 활력 비약", undefined, ["피로도 50 감소"], 50),
    createShopItem("궁극의 피로회복제", "Consumable", ItemRarity.UNIQUE, 2000000, "복용 시 피로도를 100 완전 회복(0으로 감소)시키는 전설의 영약", undefined, ["피로도 100 감소"], 20),
    createShopItem("공격력 강화 주문서", "Consumable", ItemRarity.RARE, 20000, "1회 전투 동안 공격력을 끌어올립니다", undefined, ["물리 공격력 +15%", "마법 공격력 +15%"], 30),
    createShopItem("방어력 강화 주문서", "Consumable", ItemRarity.RARE, 20000, "1회 전투 동안 방어력을 끌어올립니다", undefined, ["물리 방어력 +15%", "마법 방어력 +15%"], 30),
    createShopItem("신속의 도핑약", "Consumable", ItemRarity.RARE, 25000, "폭발적인 민첩성을 부여하는 약물", undefined, ["AGI +20%"], 20),
    createShopItem("화염 속성 저항 포션", "Consumable", ItemRarity.RARE, 25000, "1회 전투 동안 화염 속성 저항을 증가시킵니다", undefined, ["화염 속성 저항 +30%"], 50),
    createShopItem("빙결 속성 저항 포션", "Consumable", ItemRarity.RARE, 25000, "1회 전투 동안 빙결 속성 저항을 증가시킵니다", undefined, ["빙결 속성 저항 +30%"], 50),
    createShopItem("전격 속성 저항 포션", "Consumable", ItemRarity.RARE, 25000, "1회 전투 동안 전격 속성 저항을 증가시킵니다", undefined, ["전격 속성 저항 +30%"], 50),
    createShopItem("대지 속성 저항 포션", "Consumable", ItemRarity.RARE, 25000, "1회 전투 동안 대지 속성 저항을 증가시킵니다", undefined, ["대지 속성 저항 +30%"], 50),
    createShopItem("모든 속성 저항 영약", "Consumable", ItemRarity.EPIC, 80000, "1회 전투 동안 모든 속성 저항을 대폭 증가시킵니다", undefined, ["모든 속성 저항 +25%"], 30),
    createShopItem("물리 방어 주문서", "Consumable", ItemRarity.RARE, 30000, "1회 전투 동안 물리 방어력을 크게 증가시킵니다", undefined, ["물리 방어력 +25%"], 40),
    createShopItem("마법 방어 주문서", "Consumable", ItemRarity.RARE, 30000, "1회 전투 동안 마법 방어력을 크게 증가시킵니다", undefined, ["마법 방어력 +25%"], 40),
    createShopItem("모든 속성 수호 주문서", "Consumable", ItemRarity.EPIC, 100000, "1회 전투 동안 모든 속성 저항과 방어력을 극대화합니다", undefined, ["모든 속성 저항 +30%", "물리 방어력 +20%", "마법 방어력 +20%"], 20),
];

const EXTENDED_TIER_3_WEAPONS = [
    createShopItem("용혈검", "Weapon", ItemRarity.RARE, 180000, "드래곤의 피가 스민 붉은 대검", { str: 45, int: 15 }, ["화염계 속성 부여", "STR +10%"], 20, 'Sword', '화염계'),
    createShopItem("적염의 창", "Weapon", ItemRarity.RARE, 190000, "불꽃을 뿜어내는 장창", { str: 48 }, ["화염계 속성 피해 +15%"], 20, 'Spear', '화염계'),
    createShopItem("파쇄의 해머", "Weapon", ItemRarity.RARE, 210000, "방어구를 부수는 거대 충격 망치", { str: 60 }, ["물리 공격력 +15%"], 20, 'Blunt'),
    createShopItem("질풍의 건틀릿", "Weapon", ItemRarity.RARE, 170000, "바람처럼 빠른 연타용 권갑", { str: 30, agi: 30 }, ["AGI +15%", "질풍계 속성 부여"], 20, 'Knuckle', '질풍계'),
    createShopItem("정령의 활", "Weapon", ItemRarity.RARE, 220000, "바람의 정령의 은총이 담긴 활", { agi: 55 }, ["질풍계 속성 피해 +20%"], 20, 'Bow', '질풍계'),
    createShopItem("흑철 연발 석궁", "Weapon", ItemRarity.RARE, 240000, "연속 사격이 가능한 묵직한 석궁", { agi: 45, str: 20 }, ["치명타율 +15%"], 20, 'Crossbow'),
    createShopItem("환영 표창", "Weapon", ItemRarity.RARE, 150000, "잔상을 남기는 신비한 암기", { agi: 40 }, ["회피율 +10%"], 30, 'Thrown'),
    createShopItem("장전식 쇼트건", "Weapon", ItemRarity.RARE, 300000, "근접에서 가공할 파괴력을 내는 화기", { str: 30, agi: 35 }, ["치명타 피해량 +25%"], 15, 'Firearm'),
    createShopItem("뇌전의 지팡이", "Weapon", ItemRarity.RARE, 250000, "번개의 에너지를 응축한 지팡이", { int: 45, wis: 25 }, ["전격계 속성 부여", "마법 공격력 +15%"], 20, 'Staff', '전격계'),
    createShopItem("플라즈마 커터", "Weapon", ItemRarity.RARE, 350000, "고온의 에너지 칼날을 형성하는 무기", { int: 35, agi: 35 }, ["전격계 속성 피해 +20%"], 15, 'Energy', '전격계'),
    createShopItem("암흑의 마도서", "Weapon", ItemRarity.RARE, 280000, "심연의 흑마법이 기록된 마도서", { int: 50, wis: 20 }, ["암흑계 속성 부여"], 20, 'Grimoire', '암흑계'),
    createShopItem("기사단의 철방패", "SubWeapon", ItemRarity.RARE, 150000, "정예 기사단의 방패", { def: 25 }, ["물리 방어력 +15%"], 20, 'Shield'),
    createShopItem("은빛 패링 대거", "SubWeapon", ItemRarity.RARE, 140000, "적의 공격을 받아치는 고급 패링검", { agi: 20, def: 10 }, ["반격률 +10%"], 20, 'SubSword'),
];

const EXTENDED_TIER_3_ARMOR = [
    createShopItem("은빛 사슬 갑옷", "Body", ItemRarity.RARE, 250000, "은으로 코팅되어 경량이면서 견고한 사슬 갑옷", { def: 35, wis: 15 }, ["물리 방어력 +15%"], 30),
    createShopItem("지혜의 서클릿", "Head", ItemRarity.RARE, 180000, "집중력을 극대화하는 성스러운 서클릿", { int: 20, wis: 15 }, ["INT +10%"], 30),
    createShopItem("신속의 깃털 부츠", "Feet", ItemRarity.RARE, 200000, "정령의 깃털이 부착된 날렵한 부츠", { agi: 25 }, ["AGI +10%"], 30),
    createShopItem("마력 증폭 장갑", "Hand", ItemRarity.RARE, 160000, "주문 시전 속도를 높여주는 장갑", { int: 18 }, ["마법 공격력 +10%"], 30),
];

const EXTENDED_TIER_4_GENERAL = [
    createShopItem("심연의 목걸이", "Accessory", ItemRarity.EPIC, 2000000, "심연의 기운이 맴도는 묵직한 목걸이", { int: 40, str: 20 }, ["모든 속성 피해 +10%"], 10),
    createShopItem("전설의 행운 반지", "Accessory", ItemRarity.UNIQUE, 7500000, "운명을 바꾸는 희대의 반지", { str: 25, agi: 25, int: 25, wis: 25 }, ["모든 스탯 +10%", "치명타율 +10%"], 5),
    createShopItem("용의 심장 보석", "Accessory", ItemRarity.LEGENDARY, 25000000, "고대 드래곤의 심장이 결정화된 보석", { hp: 1500, mp: 800, str: 40, int: 40 }, ["최종 능력치 +15%"], 2),
    createShopItem("용의 피", "Consumable", ItemRarity.LEGENDARY, 1000000, "전설 속 드래곤의 수액 같은 혈액", undefined, ["HP 80% 회복", "MP 80% 회복", "모든 스탯 +15%"], 5),
    createShopItem("마력 회복 영약", "Consumable", ItemRarity.UNIQUE, 480000, "지혜의 신이 선사한 완벽한 엘릭서", undefined, ["MP 100% 회복", "마법 공격력 +30%"], 3),
];

const EXTENDED_TIER_4_WEAPONS = [
    createShopItem("서리한", "Weapon", ItemRarity.LEGENDARY, 45000000, "대지를 동결시키는 절멸의 서리 대검", { str: 180, int: 100 }, ["빙결계 속성 부여", "빙결계 속성 피해 +50%", "물리 공격력 +80%"], 1, 'Sword', '빙결계'),
    createShopItem("빛의 성검", "Weapon", ItemRarity.UNIQUE, 12000000, "광휘의 성기가 깃든 신성한 장검", { str: 130, wis: 60 }, ["광휘계 속성 부여", "광휘계 속성 피해 +30%"], 3, 'Sword', '광휘계'),
    createShopItem("신뇌의 창", "Weapon", ItemRarity.UNIQUE, 11000000, "하늘의 벼락을 끌어내리는 강창", { str: 125, agi: 50 }, ["전격계 속성 부여", "AGI +20%"], 3, 'Spear', '전격계'),
    createShopItem("대지의 울림 해머", "Weapon", ItemRarity.EPIC, 4500000, "지진을 일으키는 거대 대지 망치", { str: 100, def: 40 }, ["대지계 속성 부여", "DEF +15%"], 5, 'Blunt', '대지계'),
    createShopItem("광전사의 도끼", "Weapon", ItemRarity.EPIC, 4800000, "피를 갈구하는 분노의 대형 배틀액스", { str: 110 }, ["치명타 피해량 +40%"], 5, 'Axe'),
    createShopItem("신마의 권갑", "Weapon", ItemRarity.UNIQUE, 9500000, "신과 마의 기운이 조화된 신격의 너클", { str: 90, agi: 70 }, ["STR +20%", "AGI +20%"], 3, 'Knuckle'),
    createShopItem("태양의 각궁", "Weapon", ItemRarity.UNIQUE, 10500000, "태양의 빛살을 화살로 발사하는 장궁", { agi: 120, wis: 40 }, ["광휘계 속성 피해 +35%"], 3, 'Bow', '광휘계'),
    createShopItem("신성한 발리스타", "Weapon", ItemRarity.EPIC, 5200000, "신성 거대 화살을 기계로 연사하는 중석궁", { str: 60, agi: 80 }, ["물리 공격력 +30%"], 5, 'Crossbow'),
    createShopItem("마공 라이플", "Weapon", ItemRarity.EPIC, 6000000, "마력 코어가 탑재된 정밀 타격 마공 총기", { agi: 90, int: 40 }, ["치명타율 +25%"], 5, 'Firearm'),
    createShopItem("흑철 대포", "Weapon", ItemRarity.RARE, 800000, "중갑을 일격에 파쇄하는 공성 중화기", { str: 70 }, ["물리 공격력 +25%"], 10, 'Heavy'),
    createShopItem("마도 파동포", "Weapon", ItemRarity.UNIQUE, 15000000, "광범위 마력 입자선을 뿜는 초병기", { str: 100, int: 100 }, ["마법 공격력 +50%"], 2, 'Heavy'),
    createShopItem("성스러운 지팡이", "Weapon", ItemRarity.EPIC, 5000000, "여신의 가호로 치유와 성광을 부르는 지팡이", { int: 90, wis: 60 }, ["광휘계 속성 피해 +30%"], 5, 'Staff', '광휘계'),
    createShopItem("소환사의 전서", "Weapon", ItemRarity.EPIC, 4200000, "상급 고대 정령 계약이 기록된 책", { int: 85, wis: 40 }, ["최대 MP +20%"], 5, 'Grimoire'),
    createShopItem("천상 지식의 서", "Weapon", ItemRarity.UNIQUE, 13000000, "세상의 모든 마법 법칙이 해명된 비서", { int: 130, wis: 80 }, ["INT +30%"], 2, 'Grimoire'),
    createShopItem("용비늘 방패", "SubWeapon", ItemRarity.EPIC, 3200000, "화염 가호가 담긴 강철 용비늘 방패", { def: 70, hp: 500 }, ["화염계 속성 저항 +30%"], 5, 'Shield'),
    createShopItem("심연의 마정구", "SubWeapon", ItemRarity.EPIC, 3800000, "어둠의 심연을 응축한 수정구", { int: 70, wis: 30 }, ["암흑계 속성 피해 +25%"], 5, 'Orb', '암흑계'),
    createShopItem("불멸의 이지스", "SubWeapon", ItemRarity.LEGENDARY, 30000000, "어떠한 신성도 뚫지 못하는 가호의 절대 방패", { def: 180, hp: 2000, wis: 100 }, ["모든 속성 저항 +30%", "물리 방어력 +40%"], 1, 'Shield'),
];

const EXTENDED_TIER_4_ARMOR = [
    createShopItem("칠흑의 암살자 의복", "Body", ItemRarity.EPIC, 2800000, "어둠 속에서 움직임을 은폐해주는 특수 슈트", { def: 30, agi: 50 }, ["치명타 확률 +15%", "AGI +15%"], 5),
    createShopItem("드래곤 비늘 갑옷", "Body", ItemRarity.UNIQUE, 8500000, "고대 드래곤의 가죽으로 엮은 신화적 방어구", { def: 100, wis: 50, hp: 1000 }, ["물리 방어력 +30%", "상태이상 저항 +20%"], 3),
    createShopItem("성기사의 흉갑", "Body", ItemRarity.EPIC, 3500000, "성기로 빛나는 중갑 플레이트", { def: 80, wis: 30 }, ["광휘계 속성 저항 +30%"], 5),
    createShopItem("용의 뿔 왕관", "Head", ItemRarity.UNIQUE, 6000000, "용의 위엄과 절대 마력을 자극하는 왕관", { str: 30, int: 30, def: 40 }, ["모든 스탯 +10%"], 3),
    createShopItem("거인의 강철 부츠", "Feet", ItemRarity.EPIC, 2200000, "거인의 중량을 버텨내는 단단한 신발", { def: 45, str: 20 }, ["STR +10%"], 5),
    createShopItem("용인 건틀릿", "Hand", ItemRarity.EPIC, 2500000, "용의 악력을 구현하는 무거운 건틀릿", { str: 35, def: 25 }, ["물리 공격력 +15%"], 5),
];


// Nation Specific Items Registry
export const NATION_SPECIFIC_ITEMS: Record<string, Item[]> = {

    "대한민국": [
        createShopItem("환웅의 검 (레플리카)", "Weapon", ItemRarity.UNIQUE, 5000000, "고조선의 건국 신화가 담긴 검의 모조품.", { str: 100, wis: 20 }, ["광휘계 속성 부여","광휘계 속성 피해+20%","물리공격력 +20%"], 1, 'Sword'),
        createShopItem("각궁", "Weapon", ItemRarity.RARE, 650000, "탄력이 뛰어난 전통 활.", { agi: 55, str: 10 }, ["AGI +25%", "치명타 확률 +5%"], 5, 'Bow'),
        createShopItem("두정갑", "Body", ItemRarity.RARE, 1000000, "내부에 철판을 덧댄 조선의 갑옷.", { def: 35 }, ["물리 방어력 +15%", "마법 방어력 +10%"], 5),
        createShopItem("백두산의 기운이 담긴 도검", "Weapon", ItemRarity.UNIQUE, 4800000, "영산 백두산의 정기가 깃든 명검", { str: 80, wis: 30 }, ["광휘계 속성 부여", "STR +15%","AGI +15%"], 2, 'Sword'),
        createShopItem("삼국시대 장수의 구각갑", "Body", ItemRarity.UNIQUE, 6500000, "고대 장수가 착용했던 견고한 갑옷", { def: 90, hp: 500 }, ["물리 방어력 +25%"], 1),
    ],
    "미국": [
        createShopItem("피스메이커", "Weapon", ItemRarity.RARE, 2000000, "서부 개척 시대를 상징하는 리볼버.", { agi: 50, ctrl: 10 }, ["AGI +25%", "치명타율 +10%"], 5, 'Firearm'),
        createShopItem("프로토타입 레일건", "Weapon", ItemRarity.LEGENDARY, 100000000, "미군의 비밀 병기.", { str: 150, int: 50 }, ["STR +50%", "전격계 속성 부여"], 1, 'Energy'),
        createShopItem("보안관 뱃지", "Accessory", ItemRarity.UNIQUE, 3000000, "정의의 상징.", { wis: 80, ctrl: 20 }, ["상태이상 저항 +20%", "물리 명중률 +10%"], 3),
        createShopItem("특수부대 전투 조끼", "Body", ItemRarity.RARE, 1200000, "방탄 섬유로 제작된 전술 조끼", { def: 40, agi: 15 }, ["물리 방어력 +15%"], 3),
        createShopItem("전술 스나이퍼 건", "Weapon", ItemRarity.EPIC, 4200000, "초장거리 정밀 타격 라이플", { agi: 85 }, ["치명타 피해량 +35%"], 2, 'Firearm'),
    ],
    "영국": [
        createShopItem("엑스칼리버 (모조품)", "Weapon", ItemRarity.UNIQUE, 6000000, "바위에 꽂혀있던 검의 정교한 복제품.", { str: 105, def: 10 }, ["모든 능력치 +25%"], 1, 'Sword'),
        createShopItem("롱보우", "Weapon", ItemRarity.MAGIC, 500000, "영국의 전통적인 장궁.", { str: 15, agi: 10 }, ["AGI +10%"], 20, 'Bow'),
        createShopItem("왕실 근위대의 장검", "Weapon", ItemRarity.RARE, 850000, "버킹엄 궁전 근위대의 격식 장검", { str: 40, def: 15 }, ["STR +10%"], 3, 'Sword'),
        createShopItem("원탁의 기사 세이버", "Weapon", ItemRarity.UNIQUE, 7000000, "원탁의 성기사가 다루던 성스러운 검", { str: 95, wis: 35 }, ["광휘계 속성 부여", "물리 공격력 +20%"], 1, 'Sword'),
    ],
    "일본": [
        createShopItem("쿠사나기의 검", "Weapon", ItemRarity.LEGENDARY, 90000000, "삼종신기 중 하나.", { str: 120, agi: 50 }, ["질풍계 속성 부여","물리 공격력 +35%","AGI +15%"], 1, 'Sword'),
        createShopItem("카타나", "Weapon", ItemRarity.RARE, 1000000, "예리한 일본도.", { str: 20, agi: 20 }, ["치명타 피해량 +10%", "치명타 확률 +10%"], 10, 'Sword'),
        createShopItem("무녀복", "Body", ItemRarity.RARE, 800000, "신성한 기운이 감도는 옷.", { int: 20, wis: 20, def: 5 }, ["마법 방어력 +15%", "MP +10%"], 5),
        createShopItem("요도 무라마사", "Weapon", ItemRarity.EPIC, 4500000, "핏빛 섬광을 발하는 전설의 명검", { str: 85, agi: 40 }, ["치명타 확률 +20%", "치명타 피해량 +30%"], 2, 'Sword'),
        createShopItem("닌자 닌구 조끼", "Body", ItemRarity.RARE, 900000, "은신 사토비 닌자의 경량 전투복", { def: 20, agi: 35 }, ["회피율 +10%"], 3),
    ],
    "중국": [
        createShopItem("청룡언월도", "Weapon", ItemRarity.UNIQUE, 7000000, "관우가 사용했다는 전설의 무기.", { str: 100, def: 10 }, ["AGI +15%", "STR +20%"], 1, 'Spear'),
        createShopItem("연미복 (무투복)", "Body", ItemRarity.RARE, 600000, "움직임이 편한 무술 복장.", { agi: 20, str: 10 }, ["물리 회피율 +10%", "AGI +10%"], 10),
        createShopItem("여포의 방천화극", "Weapon", ItemRarity.LEGENDARY, 25000000, "천하무쌍 여포가 다루던 최강의 중창", { str: 160, agi: 50 }, ["물리 공격력 +40%", "STR +25%"], 1, 'Spear'),
        createShopItem("비단 무협 도포", "Body", ItemRarity.RARE, 950000, "내력이 소통되는 자수 비단 도포", { def: 25, int: 25 }, ["마법 방어력 +20%"], 3),
    ],
    "프랑스": [
        createShopItem("듀란달 (파편)", "Weapon", ItemRarity.UNIQUE, 5500000, "성기사 롤랑의 검 조각으로 만든 단검.", { str: 80, int: 50 }, ["STR +20%", "광휘계 속성 부여"], 1, 'Sword'),
        createShopItem("레이피어", "Weapon", ItemRarity.MAGIC, 400000, "귀족들이 사용하는 찌르기용 검.", { agi: 20 }, ["치명타 확률 +15%"], 20, 'Sword'),
        createShopItem("왕실 펜싱검", "Weapon", ItemRarity.RARE, 750000, "베르사유 왕실의 고품격 펜싱검", { agi: 35 }, ["치명타율 +15%"], 3, 'Sword'),
        createShopItem("태양왕의 비단 의복", "Body", ItemRarity.UNIQUE, 5500000, "루이 14세의 품격이 서린 화려한 로브", { def: 40, int: 60, wis: 40 }, ["INT +20%"], 1),
    ],
    "독일": [
        createShopItem("츠바 이핸더", "Weapon", ItemRarity.RARE, 1200000, "거대한 양손 검.", { str: 40 }, ["STR +25%"], 5, 'Sword'),
        createShopItem("정밀 공학 라이플", "Weapon", ItemRarity.UNIQUE, 6000000, "장인의 손길이 닿은 저격총.", { agi: 50, ctrl: 30 }, ["치명타율 +30%"], 1, 'Firearm'),
        createShopItem("라인하르트의 전신 갑옷", "Body", ItemRarity.EPIC, 4800000, "철혈 기사단 장군의 전신 강철 갑옷", { def: 110 }, ["물리 방어력 +35%"], 2),
        createShopItem("철혈 정밀 대포", "Weapon", ItemRarity.UNIQUE, 8000000, "라인 강 공학의 결정체 중포", { str: 100 }, ["물리 공격력 +30%"], 1, 'Heavy'),
    ],
    "러시아": [
        createShopItem("전투용 아이스 도끼", "Weapon", ItemRarity.RARE, 900000, "혹한을 견디는 강인한 도끼.", { str: 35, hp: 50 }, ["빙결계 속성 부여"], 10, 'Axe'),
        createShopItem("겨울 코트", "Body", ItemRarity.MAGIC, 300000, "두꺼운 털로 만든 코트.", { def: 15 }, ["빙결계 속성 저항 +20%"], 50),
        createShopItem("혹한의 체인메일", "Body", ItemRarity.RARE, 650000, "동상을 방지하는 특수 사슬 갑옷", { def: 40, hp: 200 }, ["빙결계 속성 저항 +30%"], 3),
        createShopItem("시베리아 모피 모자", "Head", ItemRarity.MAGIC, 180000, "극한의 추위를 막는 담비 모피 모자", { def: 10, hp: 100 }, ["HP +100"], 5),
    ],
    "이집트": [
        createShopItem("코페쉬", "Weapon", ItemRarity.RARE, 1100000, "낫과 같은 형태의 고대 도검.", { str: 25, agi: 15 }, ["STR +10%","AGI +10%"], 5, 'Sword'),
        createShopItem("앙크 부적", "Accessory", ItemRarity.UNIQUE, 4000000, "생명을 상징하는 부적.", { hp: 200, wis: 80 }, ["HP +10%", "MP +10%"], 1),
        createShopItem("파라오의 골든 핑거링", "Accessory", ItemRarity.EPIC, 3200000, "투탕카멘의 무덤에서 출토된 금반지", { int: 35, wis: 35 }, ["최대 MP +15%"], 2),
        createShopItem("스핑크스의 부적", "Accessory", ItemRarity.RARE, 800000, "고대 수호신 스핑크스의 가호", { def: 20, wis: 20 }, ["모든 속성 저항 +10%"], 3),
    ],
    "임페리얼 제국": [
        createShopItem("마왕의 검", "Weapon", ItemRarity.LEGENDARY, 1100000000, "마왕이 사용하던 검.", { str: 250, ctrl: 150 }, ["물리 공격력 +150%", "암흑계 속성 부여", "마법 공격력 +100%"], 1, 'Sword', '암흑계'),
        createShopItem("제국 근위대 제복", "Body", ItemRarity.EPIC, 5000000, "임페리얼 황실 근위 대장의 정복", { def: 75, str: 25 }, ["물리 공격력 +10%", "물리 방어력 +15%"], 2),
        createShopItem("마황의 왕관", "Head", ItemRarity.UNIQUE, 12000000, "마계를 통치하던 자의 황금 족두리", { int: 80, wis: 50 }, ["마법 공격력 +25%"], 1),
    ],
    "네크로디움 제국": [
        createShopItem("영혼 흡수 단검", "Weapon", ItemRarity.EPIC, 3500000, "적의 생명을 빨아들이는 칠흑 단검", { str: 50, agi: 40 }, ["HP 흡수 +5%"], 2, 'SubSword', '암흑계'),
        createShopItem("사망의 유골 왕관", "Head", ItemRarity.UNIQUE, 8000000, "언데드의 군주가 착용하는 왕관", { int: 70, def: 30 }, ["암흑계 속성 피해 +20%"], 1),
    ],
    "미르탈 숲연합": [
        createShopItem("세계수의 이슬", "Consumable", ItemRarity.UNIQUE, 150000, "모든 상처를 치유하고 마력을 회복시킵니다.", undefined, ["HP 100% 회복", "MP 100% 회복"], 3, undefined, undefined, { faction: '엘프', value: 50 }),
        createShopItem("엘프의 은총", "Accessory", ItemRarity.RARE, 300000, "숲의 가호가 깃든 목걸이.", { wis: 50, agi: 20 }, ["마법 저항 +20%"], 1, undefined, undefined, { faction: '엘프', value: 30 }, { faction: '엘프', multiplier: 0.8 }),
        createShopItem("세계수의 가지 지팡이", "Weapon", ItemRarity.EPIC, 4000000, "태초 세계수의 가지로 다듬은 지팡이", { int: 75, wis: 45 }, ["마법 공격력 +20%"], 2, 'Staff'),
        createShopItem("요정왕의 서클릿", "Head", ItemRarity.UNIQUE, 7500000, "요정왕의 은총이 내린 하이엘프 머리띠", { int: 50, wis: 50 }, ["최대 MP +20%"], 1),
    ],
    "레오니스 투기국": [
        createShopItem("투사의 훈장", "Accessory", ItemRarity.RARE, 250000, "강인한 투사임을 증명하는 훈장.", { str: 40, def: 20 }, ["물리 공격력 +10%"], 1, undefined, undefined, { faction: '수인', value: 40 }),
        createShopItem("야수의 심장", "Consumable", ItemRarity.UNIQUE, 200000, "일시적으로 폭발적인 힘을 줍니다.", undefined, ["STR +30%", "AGI +30%"], 2, undefined, undefined, { faction: '수인', value: 60 }, { faction: '수인', multiplier: 0.75 }),
        createShopItem("야수왕의 가죽 벨트", "Accessory", ItemRarity.EPIC, 2800000, "맹수 수인의 가죽으로 만든 용맹 벨트", { str: 45, hp: 300 }, ["STR +15%"], 2),
        createShopItem("투기장 챔피언 너클", "Weapon", ItemRarity.UNIQUE, 6500000, "투기장 무패 챔피언의 황금 권갑", { str: 80, agi: 50 }, ["물리 공격력 +25%"], 1, 'Knuckle'),
    ]

};

// Consolidated Shop Inventory with Explicit Categories & Cumulative Tiers
export const SHOP_INVENTORY: Record<CityTier, { general: Item[], weapon: Item[], armor: Item[] }> = {
    'Village': {
        general: [...TIER_1_GENERAL, ...EXTENDED_TIER_1_GENERAL],
        weapon: [...TIER_1_WEAPONS, ...EXTENDED_TIER_1_WEAPONS],
        armor: [...TIER_1_ARMOR, ...EXTENDED_TIER_1_ARMOR]
    },
    'Town': {
        general: [...TIER_1_GENERAL, ...TIER_2_GENERAL, ...EXTENDED_TIER_1_GENERAL, ...EXTENDED_TIER_2_GENERAL],
        weapon: [...TIER_1_WEAPONS, ...TIER_2_WEAPONS, ...EXTENDED_TIER_1_WEAPONS, ...EXTENDED_TIER_2_WEAPONS],
        armor: [...TIER_1_ARMOR, ...TIER_2_ARMOR, ...EXTENDED_TIER_1_ARMOR, ...EXTENDED_TIER_2_ARMOR]
    },
    'City': {
        general: [...TIER_1_GENERAL, ...TIER_2_GENERAL, ...TIER_3_GENERAL, ...EXTENDED_TIER_1_GENERAL, ...EXTENDED_TIER_2_GENERAL, ...EXTENDED_TIER_3_GENERAL],
        weapon: [...TIER_1_WEAPONS, ...TIER_2_WEAPONS, ...TIER_3_WEAPONS, ...EXTENDED_TIER_1_WEAPONS, ...EXTENDED_TIER_2_WEAPONS, ...EXTENDED_TIER_3_WEAPONS],
        armor: [...TIER_1_ARMOR, ...TIER_2_ARMOR, ...TIER_3_ARMOR, ...EXTENDED_TIER_1_ARMOR, ...EXTENDED_TIER_2_ARMOR, ...EXTENDED_TIER_3_ARMOR]
    },
    'Capital': {
        general: [...TIER_1_GENERAL, ...TIER_2_GENERAL, ...TIER_3_GENERAL, ...TIER_4_GENERAL, ...TIER_5_GENERAL, ...EXTENDED_TIER_1_GENERAL, ...EXTENDED_TIER_2_GENERAL, ...EXTENDED_TIER_3_GENERAL, ...EXTENDED_TIER_4_GENERAL],
        weapon: [
            ...TIER_1_WEAPONS, ...TIER_2_WEAPONS, ...TIER_3_WEAPONS, ...TIER_4_WEAPONS, ...EXTENDED_TIER_1_WEAPONS, ...EXTENDED_TIER_2_WEAPONS, ...EXTENDED_TIER_3_WEAPONS, ...EXTENDED_TIER_4_WEAPONS,
            // Capital Exclusives (Tier 5+)
            createShopItem("마왕의 검 (레플리카)", "Weapon", ItemRarity.LEGENDARY, 10000000, "마왕이 사용하던 검의 모조품", { str: 200, ctrl: 50 }, ["물리 공격력 +100%", "암흑계 속성 부여", "암흑계 속성 피해 +20%"], 1, 'Sword', '암흑계'),
            createShopItem("천국의 활", "Weapon", ItemRarity.LEGENDARY, 9500000, "천사가 사용하던 활", { agi: 150, wis: 50 }, ["광휘계 속성 부여", "물리 명중률 +100%"], 1, 'Bow', '광휘계'),
            createShopItem("타이탄의 건틀릿", "Weapon", ItemRarity.EPIC, 3500000, "거인의 힘이 깃든 건틀릿", { str: 120, def: 50 }, ["AGI +15%", "DEF +10%"], 2, 'Knuckle'),
        ],
        armor: [
            ...TIER_1_ARMOR, ...TIER_2_ARMOR, ...TIER_3_ARMOR, ...TIER_4_ARMOR, ...EXTENDED_TIER_1_ARMOR, ...EXTENDED_TIER_2_ARMOR, ...EXTENDED_TIER_3_ARMOR, ...EXTENDED_TIER_4_ARMOR,
            // Capital Exclusives (Tier 5+)
            createShopItem("아다만티움 갑옷", "Body", ItemRarity.EPIC, 5000000, "절대 부서지지 않는 갑옷", { def: 150 }, ["물리 방어력 +50%","마법 방어력 +20%"], 1),
            createShopItem("천사의 날개 신발", "Feet", ItemRarity.EPIC, 4500000, "하늘을 걷는 듯한 신발", { agi: 80 }, ["물리 회피율 +30%", "마법 회피율 +30%", "질풍계 속성 부여"], 1, undefined, '질풍계'),
            createShopItem("절대 반지의 파편", "Accessory", ItemRarity.LEGENDARY, 20000000, "절대적인 힘의 일부", { str: 50, int: 50, def: 50 }, ["모든 스탯 +20%", "물리공격력 +20%"], 1),
            createShopItem("이지스의 방패", "SubWeapon", ItemRarity.UNIQUE, 10000000, "신의 가호가 깃든 방패", { def: 100, wis: 50 }, ["상태이상 저항 +30%","물리 방어력 +20%","마법 방어력 +20%"], 2, 'Shield'),
        ]
    }
};

/**
 * [NEW] 암시장 전용 상품 목록 생성 함수
 * - 타 대륙/국가의 희귀 특산품 4~6종
 * - 마정석, 마석, 신력꽃, 각종 광석 중 랜덤 1~2종 (수량 한정)
 */
export const generateBlackMarketInventory = (currentNation?: string): BlackMarketItem[] => {
    const items: BlackMarketItem[] = [];

    // 1. 타 지역 특산품 풀 수집
    const allNationItems: Item[] = [];
    Object.entries(NATION_SPECIFIC_ITEMS).forEach(([nat, natItems]) => {
        natItems.forEach(item => {
            // 복제품이 아닌 원본이나 희귀 아이템들 포함 (출처 국가 태깅)
            allNationItems.push({ ...item, originNation: nat });
        });
    });

    // 특수 아이템 중 랜덤 4~6개 선별 (셔플)
    const shuffledNationItems = [...allNationItems].sort(() => Math.random() - 0.5);
    const selectedSpecialItems = shuffledNationItems.slice(0, Math.floor(Math.random() * 3) + 4);

    selectedSpecialItems.forEach(item => {
        // 암시장 프리미엄/희소성: 재고 1~3개 한정, 가격은 정가 유지 또는 암시장가
        const stockQty = Math.max(1, Math.min(item.stock || 2, 3));
        items.push({
            ...item,
            stock: stockQty,
            maxStock: stockQty
        });
    });

    // 2. 특수 자원 풀 (마정석, 마석, 신력꽃, 각종 광석)
    const resourceTemplates: {
        name: string;
        desc: string;
        rarity: ItemRarity;
        price: number;
        resourceType: 'magicStone' | 'manaCrystal' | 'shinryokuFlower' | 'specialOre';
        amountPerBuy: number;
        stock: number;
        imageUrl: string;
    }[] = [
        {
            name: "암시장 유통 마정석 묶음",
            desc: "마계 및 고대 유적에서 밀반입된 고순도 마정석 100개 묶음입니다. 구매 즉시 마정석 자원이 증가합니다.",
            rarity: ItemRarity.RARE,
            price: 50000,
            resourceType: 'magicStone',
            amountPerBuy: 100,
            stock: Math.floor(Math.random() * 5) + 2, // 2~4개
            imageUrl: "https://i.ibb.co/N2wLv33C/Gemini-Generated-Image-v295hav295hav295.png"
        },
        {
            name: "농축 마석 보따리",
            desc: "신비한 마력이 결정화된 마석 1000개 꾸러미입니다. 구매 즉시 마석 자원이 증가합니다.",
            rarity: ItemRarity.MAGIC,
            price: 30000,
            resourceType: 'manaCrystal',
            amountPerBuy: 1000,
            stock: Math.floor(Math.random() * 4) + 3, // 3~6개
            imageUrl: "https://i.ibb.co/ch3hS9yf/Gemini-Generated-Image-1ntivy1ntivy1nti.png"
        },
        {
            name: "희귀 신력꽃 포장 상자",
            desc: "신계의 정기가 깃든 희귀한 신력꽃 10송이입니다. 구매 즉시 신력꽃 자원이 증가합니다.",
            rarity: ItemRarity.EPIC,
            price: 80000,
            resourceType: 'shinryokuFlower',
            amountPerBuy: 10,
            stock: Math.floor(Math.random() * 2) + 2, // 2~3개
            imageUrl: "https://i.ibb.co/23G4MmQ4/Gemini-Generated-Image-q93t48q93t48q93t.png"
        },
        {
            name: "희귀 심연 광석 묶음",
            desc: "미스릴, 아다만티움 등이 함유된 고순도 정제 광석 20개입니다. 구매 즉시 특수 광석 자원이 증가합니다.",
            rarity: ItemRarity.RARE,
            price: 45000,
            resourceType: 'specialOre',
            amountPerBuy: 20,
            stock: Math.floor(Math.random() * 3) + 3, // 3~5개
            imageUrl: "https://i.ibb.co/HDTLT6v9/Gemini-Generated-Image-xtwogrxtwogrxtwo.png"
        }
    ];

    // 자원 1~2종 랜덤 선정
    const shuffledResources = [...resourceTemplates].sort(() => Math.random() - 0.5);
    const selectedResourceCount = Math.random() < 0.5 ? 1 : 2;
    const chosenResources = shuffledResources.slice(0, selectedResourceCount);

    chosenResources.forEach(res => {
        const item: BlackMarketItem = {
            name: res.name,
            type: 'Consumable',
            rarity: res.rarity,
            description: res.desc,
            price: res.price,
            stock: res.stock,
            maxStock: res.stock,
            enhancement: 0,
            imageUrl: res.imageUrl,
            resourceGain: {
                resourceType: res.resourceType,
                amount: res.amountPerBuy
            }
        };
        items.push(item);
    });

    // 3. 암시장 전용 특별 물품: 신화급 포획 그물 (레벨 500 이하 몬스터 포획 가능)
    const mythicNetStock = Math.floor(Math.random() * 2) + 1; // 1~2개
    items.push({
        name: "신화급 포획 그물",
        type: "Consumable",
        rarity: ItemRarity.MYTHTIC,
        description: "신화적인 마력으로 직조된 금단의 포획 그물입니다. 레벨 500 이하의 강력한 몬스터를 포획할 수 있습니다. (암시장 전용, 몬스터 사육소 필요)",
        price: 5000000,
        stock: mythicNetStock,
        maxStock: mythicNetStock,
        enhancement: 0,
        secondaryOptions: ["몬스터 포획(500)"],
        imageUrl: "https://i.ibb.co/99tC3d96/Gemini-Generated-Image-8tmy5q8tmy5q8tmy.png"
    });

    // 4. 아주 가끔 보스 고유 전리품을 초고가에 진열 (30% 확률, 최소 3천만 골드 이상)
    if (Math.random() < 0.1) {
        try {
            const bossLoots = getAllBossDetailedLoots();
            if (bossLoots.length > 0) {
                const randomBossLoot = bossLoots[Math.floor(Math.random() * bossLoots.length)];
                // 가격을 최소 3천만 골드 이상으로 설정 (30,000,000G ~ 45,000,000G)
                const extremePrice = Math.floor(Math.random() * 150000000) + 30000000;
                items.push({
                    ...randomBossLoot,
                    price: extremePrice,
                    stock: 1,
                    maxStock: 1,
                    description: `${randomBossLoot.description} (특별상점 독점 판매품 - 보스 고유 전리품)`
                });
            }
        } catch (e) {
            console.error('특별상점 보스 전리품 생성 중 오류:', e);
        }
    }

    return items;
};

