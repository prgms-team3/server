import { ApiProperty } from '@nestjs/swagger';
import {
	IsArray,
	IsBoolean,
	IsNumber,
	IsOptional,
	IsString,
	MaxLength,
	Min,
	ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SpaceImageDto } from './space-image.dto';

export class UpdateSpaceDto {
	@ApiProperty({
		description: 'Space name',
		example: 'Conference Room A Updated',
		required: false,
	})
	@IsOptional()
	@IsString()
	@MaxLength(100, { message: '공간 이름은 100자를 초과할 수 없습니다.' })
	name?: string;

	@ApiProperty({
		description: 'Space description',
		example: 'Updated conference room description',
		required: false,
	})
	@IsOptional()
	@IsString()
	description?: string;

	@ApiProperty({
		description: 'Space location',
		example: '3rd Floor, West Wing',
		required: false,
	})
	@IsOptional()
	@IsString()
	@MaxLength(200, { message: '위치는 200자를 초과할 수 없습니다.' })
	location?: string;

	@ApiProperty({ description: 'Maximum capacity', example: 15, required: false })
	@IsOptional()
	@IsNumber({}, { message: '수용 인원은 숫자여야 합니다.' })
	@Min(1, { message: '수용 인원은 1 이상이어야 합니다.' })
	capacity?: number;

	@ApiProperty({
		description: 'Whether approval is required for booking',
		example: true,
		required: false,
	})
	@IsOptional()
	@IsBoolean()
	requiresApproval?: boolean;

	@ApiProperty({
		description: 'Available amenities',
		example: ['tv', 'projector', 'whiteboard'],
		required: false,
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true, message: '시설명은 문자열이어야 합니다.' })
	amenities?: string[];

	@ApiProperty({
		description: 'Space images',
		type: [SpaceImageDto],
		example: [
			{ imageUrl: 'https://example.com/image1.jpg', imageType: 'PHOTO' },
			{ imageUrl: 'https://example.com/image2.jpg', imageType: 'FLOOR_PLAN' }
		]
	})
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => SpaceImageDto)
	images?: SpaceImageDto[];
}
