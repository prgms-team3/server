/**
 * JWT 만료 시간 문자열을 밀리초로 변환
 * 예: "1d" → 86400000 (24시간 * 60분 * 60초 * 1000ms)
 */
export function parseJwtExpiration(timeString: string): number {
	const unit = timeString.slice(-1); // 마지막 문자 (d, h, m, s)
	const value = parseInt(timeString.slice(0, -1), 10); // 숫자 부분

	if (Number.isNaN(value)) {
		throw new Error(`Invalid time format: ${timeString}`);
	}

	switch (unit) {
		case 'd': // days
			return value * 24 * 60 * 60 * 1000;
		case 'h': // hours
			return value * 60 * 60 * 1000;
		case 'm': // minutes
			return value * 60 * 1000;
		case 's': // seconds
			return value * 1000;
		default:
			// 단위가 없으면 초로 가정
			return parseInt(timeString, 10) * 1000;
	}
}

/**
 * 시간 문자열을 초 단위로 변환 (JWT library용)
 */
export function parseJwtExpirationToSeconds(timeString: string): number {
	return Math.floor(parseJwtExpiration(timeString) / 1000);
}
