import React, { useMemo } from 'react';
import { Character, Companion, JobType } from '../types';
import { isGodJob, getGodTransformedVisualUrl } from '../services/visualManager';
import { GodAppearanceModal, GodAppearanceTarget } from './GodAppearanceModal';

interface Props {
    character: Character | null;
    onUpdateCharacter?: (newChar: Character, logMsg?: string) => void;
}

/**
 * 신의 사자 또는 마신 직업을 가진 플레이어 및 동료 중,
 * 외형 변환 여부(godVisualChoice)가 아직 결정되지 않은 대상을 감지하여
 * 전후 비교 및 선택 모달을 표시하는 관리자 컴포넌트입니다.
 */
export const GodAppearanceManager: React.FC<Props> = ({ character, onUpdateCharacter }) => {
    // 외형 선택이 대기 중인 대상 탐색
    const pendingTarget = useMemo<GodAppearanceTarget | null>(() => {
        if (!character) return null;

        // 1. 플레이어 확인
        if (isGodJob(character.job) && character.godVisualChoice === undefined) {
            return {
                id: 'player',
                name: character.name,
                job: character.job,
                gender: character.gender,
                visualUrl: character.visualUrl,
                originalVisualUrl: character.originalVisualUrl || character.visualUrl
            };
        }

        // 2. 활성 동료 확인
        for (const comp of character.companions || []) {
            if (isGodJob(comp.job) && comp.godVisualChoice === undefined) {
                return {
                    id: comp.id,
                    name: comp.name,
                    job: comp.job,
                    gender: comp.gender,
                    visualUrl: comp.visualUrl || comp.defaultVisualUrl,
                    originalVisualUrl: comp.originalVisualUrl || comp.visualUrl || comp.defaultVisualUrl
                };
            }
        }

        // 3. 대기실(비활성) 동료 확인
        for (const comp of character.inactiveCompanions || []) {
            if (isGodJob(comp.job) && comp.godVisualChoice === undefined) {
                return {
                    id: comp.id,
                    name: comp.name,
                    job: comp.job,
                    gender: comp.gender,
                    visualUrl: comp.visualUrl || comp.defaultVisualUrl,
                    originalVisualUrl: comp.originalVisualUrl || comp.visualUrl || comp.defaultVisualUrl
                };
            }
        }

        return null;
    }, [character]);

    const handleSelectChoice = (targetId: string, choice: 'original' | 'transformed') => {
        if (!character || !onUpdateCharacter || !pendingTarget) return;

        const newChar: Character = JSON.parse(JSON.stringify(character));
        const targetJobName = pendingTarget.job ? pendingTarget.job.toString() : '신성 직업';

        if (targetId === 'player') {
            const original = newChar.originalVisualUrl || newChar.visualUrl;
            newChar.originalVisualUrl = original;
            newChar.godVisualChoice = choice;

            if (choice === 'transformed') {
                const newUrl = getGodTransformedVisualUrl(newChar.job, newChar.gender);
                if (newUrl) {
                    newChar.visualUrl = newUrl;
                }
            } else {
                newChar.visualUrl = original;
            }

            const logMsg = choice === 'transformed'
                ? `[외형 변환] ${newChar.name}이(가) ${targetJobName}의 새로운 위엄 있는 외형으로 변환되었습니다.`
                : `[외형 유지] ${newChar.name}이(가) ${targetJobName}의 권능을 얻었으나 본래의 외형을 유지하기로 결정했습니다.`;

            onUpdateCharacter(newChar, logMsg);
        } else {
            // 동료 대상 업데이트
            let targetName = pendingTarget.name;
            const updateCompanionList = (list: Companion[]) => {
                const idx = list.findIndex(c => c.id === targetId);
                if (idx !== -1) {
                    const comp = list[idx];
                    targetName = comp.name;
                    const original = comp.originalVisualUrl || comp.visualUrl || comp.defaultVisualUrl;
                    comp.originalVisualUrl = original;
                    comp.godVisualChoice = choice;

                    if (choice === 'transformed') {
                        const newUrl = getGodTransformedVisualUrl(comp.job, comp.gender);
                        if (newUrl) {
                            comp.visualUrl = newUrl;
                        }
                    } else {
                        comp.visualUrl = original;
                    }
                }
            };

            if (newChar.companions) updateCompanionList(newChar.companions);
            if (newChar.inactiveCompanions) updateCompanionList(newChar.inactiveCompanions);

            const logMsg = choice === 'transformed'
                ? `[외형 변환] ${targetName}이(가) ${targetJobName}의 새로운 위엄 있는 외형으로 변환되었습니다.`
                : `[외형 유지] ${targetName}이(가) ${targetJobName}의 권능을 얻었으나 본래의 외형을 유지하기로 결정했습니다.`;

            onUpdateCharacter(newChar, logMsg);
        }
    };

    if (!pendingTarget) return null;

    return (
        <GodAppearanceModal
            target={pendingTarget}
            onSelectChoice={handleSelectChoice}
        />
    );
};

export default GodAppearanceManager;
