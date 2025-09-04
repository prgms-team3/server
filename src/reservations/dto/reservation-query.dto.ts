import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsDateString, IsEnum, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ReservationStatus } from '../entities/reservation.entity';

export class ReservationQueryDto {
	@ApiProperty({ description: 'Page number', example: 1, required: false })
	@IsOptional()
	@Transform(({ value }) => parseInt(value))
	@IsNumber({}, { message: '페이지 번호는 숫자여야 합니다.' })
	@Min(1, { message: '페이지 번호는 1 이상이어야 합니다.' })
	page?: number = 1;

	@ApiProperty({ description: 'Items per page', example: 10, required: false })
	@IsOptional()
	@Transform(({ value }) => parseInt(value))
	@IsNumber({}, { message: '페이지 크기는 숫자여야 합니다.' })
	@Min(1, { message: '페이지 크기는 1 이상이어야 합니다.' })
	limit?: number = 10;

	@ApiProperty({
		description: 'Filter by status',
		example: ReservationStatus.PENDING,
		enum: ReservationStatus,
		required: false,
	})
	@IsOptional()
	@IsEnum(ReservationStatus, { message: '유효한 예약 상태여야 합니다.' })
	status?: ReservationStatus;

	@ApiProperty({ description: 'Filter by start date', example: '2023-01-01T00:00:00+09:00', required: false })
	@IsOptional()
	@IsDateString({}, { message: '시작 날짜는 유효한 날짜 형식이어야 합니다.' })
	startDate?: string;

	@ApiProperty({ description: 'Filter by end date', example: '2023-01-31T23:59:59+09:00', required: false })
	@IsOptional()
	@IsDateString({}, { message: '종료 날짜는 유효한 날짜 형식이어야 합니다.' })
	endDate?: string;
}
