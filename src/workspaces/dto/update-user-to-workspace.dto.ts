import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateWorkspaceUserDto {
	@ApiProperty({
		description: '부서',
		example: 'Engineering',
		required: false,
	})
	@IsOptional()
	@IsString()
	department?: string;

	@ApiProperty({
		description: '직급',
		example: 'Software Engineer',
		required: false,
	})
	@IsOptional()
	@IsString()
	position?: string;
}
