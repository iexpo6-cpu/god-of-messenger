import { Character, Companion, Quest, ClassTier } from '../types';

export const registerEvolutionQuest = (character: Character | Companion, targetTier: ClassTier): Quest | null => {
    if (character.evolutionQuests?.find(q => q.targetClassTier === targetTier)) return null;

    let monsterCountRequired = 0;
    if (targetTier === ClassTier.SECOND) monsterCountRequired = 20;
    else if (targetTier === ClassTier.LAST) monsterCountRequired = 50;
    else if (targetTier === ClassTier.FINAL) monsterCountRequired = 100;
    else return null;

    const newQuest: Quest = {
        id: `evolution-${targetTier}-${Date.now()}`,
        type: 'Subjugation',
        rank: 'Low',
        title: `${targetTier} 해방 퀘스트`,
        goal: `${targetTier} 해방을 위한 몬스터 처치`,
        details: `${targetTier} 해방을 위해 몬스터 ${monsterCountRequired}마리를 처치하세요.`,
        danger: 'Mid',
        rewardGold: 0,
        rewardExp: 0,
        targetClassTier: targetTier,
        targetAmount: monsterCountRequired,
        currentAmount: 0,
    };

    return newQuest;
};

export const updateQuestProgress = (character: Character | Companion, monsterCount: number): { updatedCharacter: Character | Companion, completedQuests: Quest[] } => {
    const updatedCharacter = { ...character };
    const completedQuests: Quest[] = [];
    
    if (updatedCharacter.evolutionQuests) {
        updatedCharacter.evolutionQuests = updatedCharacter.evolutionQuests.map(quest => {
            if (quest.targetClassTier && (quest.currentAmount || 0) < (quest.targetAmount || 0)) {
                const newAmount = (quest.currentAmount || 0) + monsterCount;
                const updatedQuest = { ...quest, currentAmount: Math.min(newAmount, quest.targetAmount || 0) };
                if (updatedQuest.currentAmount >= (updatedQuest.targetAmount || 0)) {
                    completedQuests.push(updatedQuest);
                }
                return updatedQuest;
            }
            return quest;
        });
    }
    
    return { updatedCharacter, completedQuests };
};
