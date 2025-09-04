import { ApiProperty } from '@nestjs/swagger';
import {
	IsDateString,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	MaxLength,
} from 'class-validator';

export class CreateReservationDto {
	@ApiProperty({ description: 'Space ID', example: 1 })
	@IsNotEmpty({ message: '공간 ID는 필수입니다.' })
	@IsNumber({}, { message: '공간 ID는 숫자여야 합니다.' })
	spaceId: number;

	@ApiProperty({ description: 'Start time', example: '2023-01-01T09:00:00+09:00' })
	@IsNotEmpty({ message: '시작 시간은 필수입니다.' })
	@IsDateString({}, { message: '시작 시간은 유효한 날짜 형식이어야 합니다.' })
	startTime: string;

	@ApiProperty({ description: 'End time', example: '2023-01-01T10:00:00+09:00' })
	@IsNotEmpty({ message: '종료 시간은 필수입니다.' })
	@IsDateString({}, { message: '종료 시간은 유효한 날짜 형식이어야 합니다.' })
	endTime: string;

	@ApiProperty({
		description: 'Purpose of reservation',
		example: 'Team meeting',
		required: false,
	})
	@IsOptional()
	@IsString()
	@MaxLength(200, { message: '예약 목적은 200자를 초과할 수 없습니다.' })
	purpose?: string;
}
