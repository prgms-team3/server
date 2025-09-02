import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUnavailableTimeDto {
	@ApiProperty({ description: 'Start time', example: '2023-01-01T09:00:00.000Z' })
	@IsNotEmpty({ message: '시작 시간은 필수입니다.' })
	@IsDateString({}, { message: '시작 시간은 유효한 날짜 형식이어야 합니다.' })
	startTime: string;

	@ApiProperty({ description: 'End time', example: '2023-01-01T17:00:00.000Z' })
	@IsNotEmpty({ message: '종료 시간은 필수입니다.' })
	@IsDateString({}, { message: '종료 시간은 유효한 날짜 형식이어야 합니다.' })
	endTime: string;

	@ApiProperty({
		description: 'Reason for unavailability',
		example: 'Maintenance work',
		required: false,
	})
	@IsOptional()
	@IsString()
	@MaxLength(200, { message: '사유는 200자를 초과할 수 없습니다.' })
	reason?: string;
}
