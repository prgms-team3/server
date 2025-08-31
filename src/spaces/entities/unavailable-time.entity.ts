import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Space } from './space.entity';

@Entity('unavailable_time')
export class UnavailableTime {
	@ApiProperty({ description: 'Unavailable Time ID', example: 1 })
	@PrimaryGeneratedColumn({ name: 'id', type: 'int' })
	id: number;

	@ApiProperty({ description: 'Space ID', example: 1 })
	@Column({ name: 'space_id', type: 'int' })
	spaceId: number;

	@ApiProperty({ description: 'Start time', example: '2023-01-01T09:00:00.000Z' })
	@Column({ name: 'start_time', type: 'datetime' })
	startTime: Date;

	@ApiProperty({ description: 'End time', example: '2023-01-01T17:00:00.000Z' })
	@Column({ name: 'end_time', type: 'datetime' })
	endTime: Date;

	@ApiProperty({ description: 'Reason for unavailability', example: 'Maintenance work' })
	@Column({ nullable: true, type: 'varchar', length: 200 })
	reason: string;

	/* Relations */
	@ManyToOne(() => Space, (space) => space.unavailableTimes)
	@JoinColumn({ name: 'space_id' })
	space: Space;
}
