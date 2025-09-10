import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class WorkspaceQueryDto {
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

	@ApiProperty({ description: 'Search by name', example: '', required: false })
	@IsOptional()
	@IsString()
	search?: string;
}
