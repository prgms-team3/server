import { ApiProperty } from '@nestjs/swagger';
import { Space } from '../entities/space.entity';

export class SpaceWithStatsDto extends Space {
	@ApiProperty({ 
		description: '해당 공간의 월간 예약 건수', 
		example: 15,
		type: 'number'
	})
	monthlyReservationCount: number;

	@ApiProperty({ 
		description: '해당 공간의 현재 이용률 (백분율)', 
		example: 75.5,
		type: 'number',
		minimum: 0,
		maximum: 100
	})
	currentUtilizationRate: number;
}
