import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateGroupDto {
	@ApiProperty({ description: '그룹명', example: '개발팀' })
	@IsString()
	@Length(1, 100, { message: '그룹명은 1-100자 사이여야 합니다' })
	name: string;

	@ApiProperty({ description: '그룹 설명', required: false, example: '프론트엔드 개발팀입니다' })
	@IsOptional()
	@IsString()
	description?: string;

	@ApiProperty({ description: '워크스페이스 ID', example: 1 })
	@IsNumber()
	workspaceId: number;

	@ApiProperty({ description: '최대 멤버 수', example: 10, minimum: 1, maximum: 50 })
	@IsNumber()
	@Min(1, { message: '최대 멤버 수는 최소 1명이어야 합니다' })
	@Max(50, { message: '최대 멤버 수는 50명을 초과할 수 없습니다' })
	maxMembers: number = 10;
}
