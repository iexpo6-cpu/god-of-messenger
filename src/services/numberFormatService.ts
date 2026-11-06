/**
 * 숫자를 한국어 단위(만, 억, 조 등)로 포맷팅하는 유틸리티 서비스
 */

export function formatKoreanNumber(num: number): string {
    if (isNaN(num) || num === 0) return '0';
    const isNegative = num < 0;
    const absNum = Math.abs(num);

    if (absNum < 10000) {
        return num.toLocaleString();
    }

    const units = [
        { value: 1000000000000, symbol: '조' },
        { value: 100000000, symbol: '억' },
        { value: 10000, symbol: '만' }
    ];

    let result = '';
    let temp = absNum;

    for (const unit of units) {
        if (temp >= unit.value) {
            const count = Math.floor(temp / unit.value);
            temp %= unit.value;
            result += `${count.toLocaleString()}${unit.symbol} `;
        }
    }

    if (temp > 0) {
        result += `${temp.toLocaleString()}`;
    }

    result = result.trim();
    return isNegative ? `-${result}` : result;
}

/**
 * 한국어 단위 표기 또는 일반 숫자 문자열을 정수(number)로 역변환하는 함수
 */
export function parseKoreanNumber(str: string): number {
    if (!str) return 0;
    const cleanStr = str.replace(/,/g, '').trim();
    if (!cleanStr) return 0;

    const isNegative = cleanStr.startsWith('-');
    const s = cleanStr.replace(/^[-+]/, '');

    let total = 0;

    const unitMap: { [key: string]: number } = {
        '조': 1000000000000,
        '억': 100000000,
        '만': 10000
    };

    let remaining = s;
    for (const [symbol, val] of Object.entries(unitMap)) {
        if (remaining.includes(symbol)) {
            const parts = remaining.split(symbol);
            const numPart = parseFloat(parts[0].trim()) || 0;
            total += numPart * val;
            remaining = parts[1] || '';
        }
    }

    if (remaining.trim()) {
        const leftover = parseFloat(remaining.trim()) || 0;
        total += leftover;
    }

    return isNegative ? -total : total;
}
