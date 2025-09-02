import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber } from 'class-validator';

export class AvailableTimesQueryDto {
	@ApiProperty({ description: 'Space ID', example: 1 })
	@IsNotEmpty({ message: '공간 ID는 필수입니다.' })
	@IsNumber({}, { message: '공간 ID는 숫자여야 합니다.' })
	spaceId: number;

	@ApiProperty({ description: 'Date to check availability', example: '2023-01-01' })
	@IsNotEmpty({ message: '날짜는 필수입니다.' })
	@IsDateString({}, { message: '유효한 날짜 형식이어야 합니다.' })
	date: string;
}
