import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateGroupDto {
	@ApiProperty({ description: '그룹명', example: '개발팀' })
	@IsString()
	@MaxLength(100, { message: '그룹명은 100자를 초과할 수 없습니다' })
	name: string;

	@ApiProperty({ description: '그룹 설명', example: '프론트엔드 개발팀입니다', required: false })
	@IsOptional()
	@IsString()
	description?: string;

	@ApiProperty({
		description: '최대 멤버 수',
		example: 10,
		minimum: 1,
		maximum: 100,
		required: false,
	})
	@IsOptional()
	@IsNumber()
	@Min(1, { message: '최대 멤버 수는 1명 이상이어야 합니다' })
	@Max(100, { message: '최대 멤버 수는 100명을 초과할 수 없습니다' })
	maxMembers?: number;
}
