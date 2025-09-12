import { ApiProperty } from '@nestjs/swagger';
import {
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Length,
	Max,
	Min,
	ValidateIf,
} from 'class-validator';
import { GroupType } from '../entities/group.entity';

export class CreateGroupDto {
	@ApiProperty({ description: '그룹명', example: '개발팀' })
	@IsString()
	@Length(1, 100, { message: '그룹명은 1-100자 사이여야 합니다' })
	name: string;

	@ApiProperty({ description: '그룹 설명', required: false, example: '프론트엔드 개발팀입니다' })
	@IsOptional()
	@IsString()
	@Length(1, 500, { message: '그룹 설명은 1-500자 사이여야 합니다' })
	description?: string;

	@ApiProperty({ description: '최대 멤버 수', example: 10, minimum: 1, maximum: 50 })
	@IsOptional()
	@IsNumber()
	@Min(1, { message: '최대 멤버 수는 최소 1명이어야 합니다' })
	@Max(50, { message: '최대 멤버 수는 50명을 초과할 수 없습니다' })
	maxMembers?: number = 10;

	@ApiProperty({ description: '그룹 타입', enum: GroupType, example: GroupType.DEPARTMENT })
	@IsEnum(GroupType)
	type: GroupType;

	@ApiProperty({
		description: `리더 이름`,
		required: false,
		example: '홍길동',
	})
	@IsOptional()
	@Length(1, 20, { message: '리더 이름은 1-20자 사이여야 합니다' })
	leaderName?: string;

	@ApiProperty({ description: '워크스페이스 ID', example: 1 })
	@IsNumber()
	workspaceId: number;
}
