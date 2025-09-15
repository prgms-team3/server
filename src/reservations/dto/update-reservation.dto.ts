import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReservationDto {
	@ApiProperty({
		description: 'Start time',
		example: '2023-01-01T09:00:00+09:00',
		required: false,
	})
	@IsOptional()
	@IsDateString({}, { message: '시작 시간은 유효한 날짜 형식이어야 합니다.' })
	startTime?: string;

	@ApiProperty({ description: 'End time', example: '2023-01-01T10:00:00+09:00', required: false })
	@IsOptional()
	@IsDateString({}, { message: '종료 시간은 유효한 날짜 형식이어야 합니다.' })
	endTime?: string;

	@ApiProperty({
		description: 'Purpose of reservation',
		example: 'Updated team meeting',
		required: false,
	})
	@IsOptional()
	@IsString()
	@MaxLength(200, { message: '예약 목적은 200자를 초과할 수 없습니다.' })
	purpose?: string;

	@ApiProperty({ description: 'Attendees', example: 'John Doe, Jane Smith', required: false })
	@IsOptional()
	@IsString()
	@MaxLength(200, { message: '참석자 이름은 200자를 초과할 수 없습니다.' })
	attendees?: string;

	@ApiProperty({ description: 'Memo', example: 'Meeting with team', required: false })
	@IsOptional()
	@IsString()
	@MaxLength(200, { message: '메모는 200자를 초과할 수 없습니다.' })
	memo?: string;
}
