import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class TransferSuperAdminDto {
	@ApiProperty({
		description: '새로운 SUPER_ADMIN으로 지정할 사용자의 ID',
		example: 2,
	})
	@IsNumber()
	@IsNotEmpty()
	newSuperAdminId: number;
}
