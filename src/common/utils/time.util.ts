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

/**
 * Date 객체를 한국 시간(KST, UTC+9)으로 변환하여 ISO 문자열로 반환
 */
export function toKoreanTime(date: Date): string {
	// UTC 시간에 9시간을 더해 한국 시간으로 변환
	const koreaTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);

	// ISO 문자열로 변환 후 Z를 +09:00으로 대체
	return koreaTime.toISOString().replace('Z', '+09:00');
}

/**
 * Date 객체 배열을 한국 시간(KST)으로 변환
 * 순환 참조를 처리하기 위해 방문한 객체를 추적
 */
export function convertDatesToKoreanTime<T>(obj: T, visited = new WeakMap()): T {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (obj instanceof Date) {
		return toKoreanTime(obj) as unknown as T;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => convertDatesToKoreanTime(item, visited)) as unknown as T;
	}

	if (typeof obj === 'object') {
		// 이미 방문한 객체인지 확인
		if (visited.has(obj as object)) {
			return visited.get(obj as object);
		}

		const result = { ...obj };

		// 현재 객체를 방문 목록에 추가
		visited.set(obj as object, result);

		for (const key in result) {
			if (Object.prototype.hasOwnProperty.call(result, key)) {
				result[key] = convertDatesToKoreanTime(result[key], visited);
			}
		}
		return result;
	}

	return obj;
}

/**
 * 한국 시간대 기준으로 특정 날짜의 특정 시간을 생성
 * @param date 기준 날짜 (YYYY-MM-DD 형식)
 * @param hour 시간 (0-23)
 * @param minute 분 (0-59)
 * @param second 초 (0-59)
 * @param millisecond 밀리초 (0-999)
 * @returns 한국 시간대 기준 Date 객체
 */
export function createKoreanDateTime(
	date: string | Date,
	hour: number = 0,
	minute: number = 0,
	second: number = 0,
	millisecond: number = 0
): Date {
	const targetDate = typeof date === 'string' ? new Date(date) : date;
	
	// 한국 시간대(UTC+9) 기준으로 시간 생성
	const koreanTime = new Date();
	koreanTime.setUTCFullYear(targetDate.getFullYear());
	koreanTime.setUTCMonth(targetDate.getMonth());
	koreanTime.setUTCDate(targetDate.getDate());
	koreanTime.setUTCHours(hour - 9); // UTC로 변환 (한국시간 - 9시간)
	koreanTime.setUTCMinutes(minute);
	koreanTime.setUTCSeconds(second);
	koreanTime.setUTCMilliseconds(millisecond);
	
	return koreanTime;
}
