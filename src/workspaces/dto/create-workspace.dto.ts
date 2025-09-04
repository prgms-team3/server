import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWorkspaceDto {
	@ApiProperty({ description: 'Workspace name', example: 'Tech Company' })
	@IsNotEmpty({ message: '워크스페이스 이름은 필수입니다.' })
	@IsString()
	@MaxLength(100, { message: '워크스페이스 이름은 100자를 초과할 수 없습니다.' })
	name: string;

	@ApiProperty({
		description: 'Workspace description',
		example: 'Our main office workspace',
		required: false,
	})
	@IsOptional()
	@IsString()
	description?: string;

	@ApiProperty({
		description: 'Workspace image URL',
		example: 'https://example.com/image.png',
		required: false,
	})
	@IsOptional()
	@IsString()
	@MaxLength(255, { message: '워크스페이스 이미지 URL은 255자를 초과할 수 없습니다.' })
	imageUrl?: string;
}
