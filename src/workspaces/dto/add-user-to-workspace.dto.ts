import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class AddUserToWorkspaceDto {
	@ApiProperty({ description: 'User ID to add', example: 1 })
	@IsNotEmpty({ message: '사용자 ID는 필수입니다.' })
	@IsNumber({}, { message: '사용자 ID는 숫자여야 합니다.' })
	userId: number;

	@ApiProperty({
		description: '부서',
		example: 'Engineering',
		required: false,
	})
	@IsOptional()
	department?: string;

	@ApiProperty({
		description: '직급',
		example: 'Software Engineer',
		required: false,
	})
	@IsOptional()
	position?: string;
}
