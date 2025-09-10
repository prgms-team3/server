import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AvailableTimesQueryDto {
	@ApiProperty({ description: 'Space ID', example: 1 })
	@IsNotEmpty({ message: '공간 ID는 필수입니다.' })
	@Transform(({ value }) => parseInt(value))
	@IsNumber({}, { message: '공간 ID는 숫자여야 합니다.' })
	spaceId: number;

	@ApiProperty({ description: 'Date to check availability', example: '2023-01-01' })
	@IsNotEmpty({ message: '날짜는 필수입니다.' })
	@Transform(({ value }) => {
		// 날짜 형식 검증 및 변환
		const date = new Date(value);
		if (isNaN(date.getTime())) {
			throw new Error('유효한 날짜 형식이어야 합니다.');
		}
		// YYYY-MM-DD 형식으로 반환
		return date.toISOString().split('T')[0];
	})
	date: string;
}
