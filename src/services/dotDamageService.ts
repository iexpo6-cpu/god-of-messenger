import { Stats } from '../types';

/**
 * 대상의 통제력(CTRL) 및 저항 수치를 반영한 DoT(지속 피해) 데미지를 계산합니다.
 */
export const calculateDotDamage = (
    ailmentName: string,
    targetMaxHp: number,
    targetStats?: Stats | any,
    attackerStats?: Stats | any
): number => {
    const hp = Math.max(100, targetMaxHp || 100);
    const defCtrl = Math.max(0, targetStats?.ctrl || 0);
    const atkInt = Math.max(10, attackerStats?.int || 10);
    
    let rawDot = 0;
    
    // 1. 기본 DoT 비율 산정
    if (['화상', '출혈', '흡정'].includes(ailmentName)) {
        rawDot = Math.ceil(hp * 0.05);
    } else if (ailmentName === '소멸') {
        rawDot = Math.ceil(hp * 0.07);
    } else if (ailmentName === '중독') {
        rawDot = Math.max(1, Math.floor(atkInt * 0.08));
    } else {
        rawDot = Math.ceil(hp * 0.03);
    }

    // 2. 대상 통제력(CTRL)에 의한 저항 및 피해 감소 점감 곡선
    // CTRL 0 => 저항 0% (피해 100% 전달)
    // CTRL 10만 => 약 95% 피해 감소
    // 최대 저항 상한선: 95% 피해 감소 (최소 5% 피해는 항시 보장)
    const resistRatio = defCtrl / (defCtrl + 5263);
    const cappedResist = Math.min(0.95, resistRatio);
    
    const finalDot = Math.max(1, Math.ceil(rawDot * (1 - cappedResist)));
    return finalDot;
};
