export type SchoolVisualEventTone = 'positive' | 'negative' | 'warning' | 'special' | 'neutral';

export interface SchoolVisualEvent {
    id: string;
    kind:
        | 'instructor_praise'
        | 'sleep_scold'
        | 'teacher_praise'
        | 'teacher_scold'
        | 'scholarship'
        | 'festival'
        | 'transfer_student'
        | 'study_group'
        | 'lunch_chat'
        | 'conflict'
        | 'love_letter'
        | 'rival_duel'
        | 'rival_sabotage'
        | 'choice_injury'
        | 'choice_legend'
        | 'exam_notice'
        | 'advancement'
        | 'other';
    badge: string;
    emoji: string;
    title: string;
    description: string;
    actorName?: string;
    bubbleText?: string;
    tone: SchoolVisualEventTone;
}

const extractQuotedName = (text: string): string | undefined => {
    const m = text.match(/'([^']+)'/);
    return m?.[1];
};

export function parseSchooltimeLogsToVisualEvents(
    systemLogs: string[] = [],
    extraEvents: SchoolVisualEvent[] = []
): SchoolVisualEvent[] {
    const parsed: SchoolVisualEvent[] = [...extraEvents];

    systemLogs.forEach((raw, idx) => {
        const line = raw.trim();
        if (!line) return;
        const id = `ev_${idx}_${line.slice(0, 12)}`;
        const quoted = extractQuotedName(line);

        if (line.includes('[장학금]')) {
            parsed.push({
                id,
                kind: 'scholarship',
                badge: '장학금',
                emoji: '🏆',
                title: '성적 우수 장학금 수령',
                description: line.replace(/^\[장학금\]\s*/, ''),
                bubbleText: '🏆 전교 상위권 장학금!',
                tone: 'special'
            });
        } else if (line.includes('[학교 축제]')) {
            parsed.push({
                id,
                kind: 'festival',
                badge: '학교 축제',
                emoji: '🎉',
                title: '10월 학교 축제 개막',
                description: line.replace(/^\[학교 축제\]\s*/, ''),
                bubbleText: '🎉 즐거운 학교 축제!',
                tone: 'special'
            });
        } else if (line.includes('전학생')) {
            parsed.push({
                id,
                kind: 'transfer_student',
                badge: '전학생 합류',
                emoji: '🆕',
                title: quoted ? `전학생 '${quoted}' 합류` : '새 전학생 합류',
                description: line.replace(/^\[학교\]\s*/, ''),
                actorName: quoted,
                bubbleText: quoted ? `안녕! 전학생 ${quoted}이야!` : '🆕 반가워요!',
                tone: 'special'
            });
        } else if (line.includes('스터디 그룹')) {
            parsed.push({
                id,
                kind: 'study_group',
                badge: '스터디 그룹',
                emoji: '📘',
                title: '방과 후 스터디 그룹',
                description: line.replace(/^\[학교\]\s*/, ''),
                actorName: quoted,
                bubbleText: '📘 같이 공부하니까 쑥쑥 느네!',
                tone: 'positive'
            });
        } else if (line.includes('기숙사 책상 위에')) {
            parsed.push({
                id,
                kind: 'love_letter',
                badge: '러브레터 & 선물',
                emoji: '💌',
                title: quoted ? `'${quoted}'의 비밀 선물` : '책상 위 선물과 쪽지',
                description: line.replace(/^\[학교\]\s*/, ''),
                actorName: quoted,
                bubbleText: '💌 기숙사 책상에 선물이 놓여있다!',
                tone: 'positive'
            });
        } else if (line.includes('점심 시간')) {
            parsed.push({
                id,
                kind: 'lunch_chat',
                badge: '학우 담소',
                emoji: '💬',
                title: quoted ? `'${quoted}'와(과) 점심 담소` : '학우와 담소',
                description: line.replace(/^\[학교\]\s*/, ''),
                actorName: quoted,
                bubbleText: '💬 오늘 수업 어땠어?',
                tone: 'positive'
            });
        } else if (line.includes('[학교 갈등]') || line.includes('말다툼')) {
            parsed.push({
                id,
                kind: 'conflict',
                badge: '갈등 발생',
                emoji: '💢',
                title: quoted ? `'${quoted}'와(과) 다툼` : '학우와 말다툼',
                description: line.replace(/^\[학교 갈등\]\s*/, ''),
                actorName: quoted,
                bubbleText: '💢 치사하게 왜 그래!',
                tone: 'negative'
            });
        } else if (line.includes('라이벌') && line.includes('결투')) {
            parsed.push({
                id,
                kind: 'rival_duel',
                badge: '라이벌 결투',
                emoji: '⚔️',
                title: quoted ? `라이벌 '${quoted}'의 결투 신청!` : '라이벌 결투 신청!',
                description: line,
                actorName: quoted,
                bubbleText: '⚔️ 나와 한 판 붙자!',
                tone: 'warning'
            });
        } else if (line.includes('[학교 음해]')) {
            parsed.push({
                id,
                kind: 'rival_sabotage',
                badge: '라이벌 음해',
                emoji: '⚡',
                title: '라이벌의 악의적 소문',
                description: line.replace(/^\[학교 음해\]\s*/, ''),
                bubbleText: '⚡ 헛소문이 퍼지고 있어...',
                tone: 'negative'
            });
        } else if (line.includes('[학교 긴급]')) {
            parsed.push({
                id,
                kind: 'choice_injury',
                badge: '돌발 상황',
                emoji: '🚨',
                title: quoted ? `'${quoted}' 훈련 중 부상!` : '훈련 중 부상자 발생!',
                description: line.replace(/^\[학교 긴급\]\s*/, ''),
                actorName: quoted,
                bubbleText: '🚨 으악! 신력 제어가 풀렸어!',
                tone: 'warning'
            });
        } else if (line.includes('전설적인 졸업생')) {
            parsed.push({
                id,
                kind: 'choice_legend',
                badge: '특별 교관',
                emoji: '🌟',
                title: '전설적인 졸업생 방문',
                description: line.replace(/^\[학교 소식\]\s*/, ''),
                bubbleText: '🌟 전설의 선배가 오셨다!',
                tone: 'special'
            });
        } else if (line.includes('선생님') || line.includes('담임 교사')) {
            const isBad = line.includes('지적') || line.includes('꾸중') || line.includes('우려') || line.includes('호감도 -');
            parsed.push({
                id,
                kind: isBad ? 'teacher_scold' : 'teacher_praise',
                badge: isBad ? '교사 지도' : '교사 격려',
                emoji: isBad ? '💢' : '💖',
                title: quoted ? `'${quoted}' 선생님 ${isBad ? '지적' : '격려'}` : `담임 교사 ${isBad ? '지적' : '격려'}`,
                description: line.replace(/^\[학교\]\s*/, ''),
                actorName: quoted,
                bubbleText: isBad ? '💢 태도를 바르게 하세요!' : '💖 정말 잘하고 있어요!',
                tone: isBad ? 'negative' : 'positive'
            });
        } else if (line.includes('[시험 안내]') || line.includes('[경고: 유급 위기]')) {
            parsed.push({
                id,
                kind: 'exam_notice',
                badge: line.includes('유급') ? '유급 경고' : '시험 안내',
                emoji: '📝',
                title: line.includes('유급') ? '진급 시험 마감 임박!' : '정기 시험 기간 안내',
                description: line.replace(/^\[(시험 안내|경고: 유급 위기)\]\s*/, ''),
                bubbleText: '📝 교무실에서 시험에 응시하세요!',
                tone: 'warning'
            });
        } else if (line.includes('진급') || line.includes('졸업 요건') || line.includes('유급 알림')) {
            parsed.push({
                id,
                kind: 'advancement',
                badge: '학사 변동',
                emoji: '🎓',
                title: line.includes('유급') ? '유급 알림' : '학년 진급 · 졸업 안내',
                description: line.replace(/^\[학교\]\s*/, ''),
                bubbleText: line.includes('유급') ? '😢 다음엔 꼭 통과하자!' : '🎓 축하합니다!',
                tone: line.includes('유급') ? 'negative' : 'special'
            });
        }
    });

    return parsed;
}

/**
 * 캔버스 위에 컷신 말풍선과 감정 이모티콘을 렌더링합니다.
 */
export function drawSchoolCutsceneBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    emoji: string,
    text: string,
    tone: SchoolVisualEventTone
): void {
    const bob = Math.sin(Date.now() / 160) * 3;
    const label = `${emoji} ${text}`;
    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    const tw = Math.min(260, Math.max(96, ctx.measureText(label).width + 20));
    const bx = x - tw / 2;
    const by = y - 82 + bob;

    const bg =
        tone === 'positive'
            ? 'rgba(6, 78, 59, 0.94)'
            : tone === 'negative'
              ? 'rgba(127, 29, 29, 0.94)'
              : tone === 'warning'
                ? 'rgba(120, 53, 15, 0.95)'
                : tone === 'special'
                  ? 'rgba(88, 28, 135, 0.95)'
                  : 'rgba(15, 23, 42, 0.94)';
    const border =
        tone === 'positive'
            ? '#34d399'
            : tone === 'negative'
              ? '#f87171'
              : tone === 'warning'
                ? '#fbbf24'
                : tone === 'special'
                  ? '#e879f9'
                  : '#38bdf8';

    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(bx, by, tw, 24, 8);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 말풍선 꼬리
    ctx.beginPath();
    ctx.moveTo(x - 5, by + 24);
    ctx.lineTo(x + 5, by + 24);
    ctx.lineTo(x, by + 30);
    ctx.closePath();
    ctx.fillStyle = bg;
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, by + 16, tw - 12);
    ctx.restore();
}
