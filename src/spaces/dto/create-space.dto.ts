import { ApiProperty } from '@nestjs/swagger';
import {
	IsArray,
	IsBoolean,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	MaxLength,
	Min,
} from 'class-validator';

export class CreateSpaceDto {
	@ApiProperty({ description: 'Space name', example: 'Conference Room A' })
	@IsNotEmpty({ message: '공간 이름은 필수입니다.' })
	@IsString()
	@MaxLength(100, { message: '공간 이름은 100자를 초과할 수 없습니다.' })
	name: string;

	@ApiProperty({
		description: 'Space description',
		example: 'Large conference room with projector',
		required: false,
	})
	@IsOptional()
	@IsString()
	description?: string;

	@ApiProperty({
		description: 'Space location',
		example: '2nd Floor, East Wing',
		required: false,
	})
	@IsOptional()
	@IsString()
	@MaxLength(200, { message: '위치는 200자를 초과할 수 없습니다.' })
	location?: string;

	@ApiProperty({ description: 'Space size in square meters', example: 25.5, required: false })
	@IsOptional()
	@IsNumber({}, { message: '크기는 숫자여야 합니다.' })
	@Min(0, { message: '크기는 0 이상이어야 합니다.' })
	size?: number;

	@ApiProperty({ description: 'Maximum capacity', example: 12 })
	@IsNotEmpty({ message: '수용 인원은 필수입니다.' })
	@IsNumber({}, { message: '수용 인원은 숫자여야 합니다.' })
	@Min(1, { message: '수용 인원은 1 이상이어야 합니다.' })
	capacity: number;

	@ApiProperty({
		description: 'Whether approval is required for booking',
		example: false,
		required: false,
	})
	@IsOptional()
	@IsBoolean()
	requiresApproval?: boolean = false;

	@ApiProperty({ description: 'Available amenities', example: ['tv', 'projector', 'whiteboard'], required: false })
	@IsOptional()
	@IsArray()
	@IsString({ each: true, message: '시설명은 문자열이어야 합니다.' })
	amenities?: string[];
}
