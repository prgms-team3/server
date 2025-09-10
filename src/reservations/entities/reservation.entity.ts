import { ApiProperty } from '@nestjs/swagger';
import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { Space } from '../../spaces/entities/space.entity';
import { User } from '../../users/entities/user.entity';

export enum ReservationStatus {
	PENDING = 'PENDING',
	APPROVED = 'APPROVED',
	REJECTED = 'REJECTED',
	CANCELLED = 'CANCELLED',
	COMPLETED = 'COMPLETED',
}

@Entity('reservation')
export class Reservation {
	@ApiProperty({ description: 'Reservation ID', example: 1 })
	@PrimaryGeneratedColumn({ name: 'id', type: 'int' })
	id: number;

	@ApiProperty({ description: 'Space ID', example: 1 })
	@Column({ name: 'space_id', type: 'int' })
	spaceId: number;

	@ApiProperty({ description: 'User ID', example: 1 })
	@Column({ name: 'user_id', type: 'int' })
	userId: number;

	@ApiProperty({ description: 'Start time', example: '2023-01-01T09:00:00+09:00' })
	@Column({ name: 'start_time', type: 'datetime' })
	startTime: Date;

	@ApiProperty({ description: 'End time', example: '2023-01-01T10:00:00+09:00' })
	@Column({ name: 'end_time', type: 'datetime' })
	endTime: Date;

	@ApiProperty({
		description: 'Reservation status',
		example: ReservationStatus.PENDING,
		enum: ReservationStatus,
	})
	@Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
	status: ReservationStatus;

	@ApiProperty({ description: 'Purpose of reservation', example: 'Team meeting' })
	@Column({ nullable: true, type: 'varchar', length: 200 })
	purpose: string;

	@ApiProperty({ description: 'Creation date', example: '2023-01-01T00:00:00+09:00' })
	@CreateDateColumn({ name: 'created_at', type: 'datetime' })
	createdAt: Date;

	@ApiProperty({ description: 'Update date', example: '2023-01-01T00:00:00+09:00' })
	@UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
	updatedAt: Date;

	/* Relations */
	@ManyToOne(() => Space, (space) => space.reservations)
	@JoinColumn({ name: 'space_id' })
	space: Space;

	@ManyToOne(() => User)
	@JoinColumn({ name: 'user_id' })
	user: User;
}
