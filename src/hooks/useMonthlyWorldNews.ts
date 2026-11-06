import { useEffect, useRef } from 'react';
import { Character, WorldNewsItem } from '../types';
import { checkAndGenerateMonthlyWorldNews } from '../services/worldNewsService';

/**
 * 게임 진행 중 월 변경(매달 1일 또는 한 달 경과)을 감지하여 월간 세계 정세 모달을 자동으로 팝업합니다.
 */
export function useMonthlyWorldNews(
  character: Character,
  view: string,
  setCharacter: (char: Character | ((prev: Character) => Character)) => void,
  setWorldNewsList: (news: WorldNewsItem[] | null) => void
) {
  const lastProcessedMonthRef = useRef<string | null>(null);
  const setCharacterRef = useRef(setCharacter);
  const setWorldNewsListRef = useRef(setWorldNewsList);

  setCharacterRef.current = setCharacter;
  setWorldNewsListRef.current = setWorldNewsList;

  useEffect(() => {
    if (view !== 'game' || !character?.currentDate) return;
    const curMonth = character.currentDate.substring(0, 7);
    if (!curMonth) return;

    // 이미 이번 달 뉴스를 처리했거나 확인한 경우 중복 실행 방지
    if (lastProcessedMonthRef.current === curMonth || character.lastWorldNewsMonth === curMonth) {
      lastProcessedMonthRef.current = curMonth;
      return;
    }

    lastProcessedMonthRef.current = curMonth;

    // 신규 게임 시작 시점(2000-03-02)인 경우 첫 시작 월만 기록하고 모달 스킵
    if (!character.lastWorldNewsMonth && character.currentDate === '2000-03-02') {
      setCharacterRef.current(prev => ({ ...prev, lastWorldNewsMonth: curMonth }));
      return;
    }

    // 월 변경 감지: 신규 월간 뉴스 생성 및 모달 오픈
    const { updatedCharacter, news } = checkAndGenerateMonthlyWorldNews(character);
    if (news && news.length > 0) {
      setCharacterRef.current(updatedCharacter);
      setWorldNewsListRef.current(news);
    } else {
      setCharacterRef.current(prev => ({ ...prev, lastWorldNewsMonth: curMonth }));
    }
  }, [character?.currentDate, character?.lastWorldNewsMonth, view]);
}
