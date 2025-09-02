import { ApiProperty } from '@nestjs/swagger';
import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { SpaceImage } from './space-image.entity';
import { UnavailableTime } from './unavailable-time.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';

@Entity('space')
export class Space {
	@ApiProperty({ description: 'Space ID', example: 1 })
	@PrimaryGeneratedColumn({ name: 'id', type: 'int' })
	id: number;

	@ApiProperty({ description: 'Workspace ID', example: 1 })
	@Column({ name: 'workspace_id', type: 'int' })
	workspaceId: number;

	@ApiProperty({ description: 'Space name', example: 'Conference Room A' })
	@Column({ nullable: false, type: 'varchar', length: 100 })
	name: string;

	@ApiProperty({
		description: 'Space description',
		example: 'Large conference room with projector',
	})
	@Column({ nullable: true, type: 'text' })
	description: string;

	@ApiProperty({ description: 'Space location', example: '2nd Floor, East Wing' })
	@Column({ nullable: true, type: 'varchar', length: 200 })
	location: string;

	@ApiProperty({ description: 'Maximum capacity', example: 12 })
	@Column({ nullable: false, type: 'int' })
	capacity: number;

	@ApiProperty({ description: 'Whether approval is required for booking', example: false })
	@Column({ name: 'requires_approval', type: 'boolean', default: false })
	requiresApproval: boolean;

	@ApiProperty({ description: 'Whether space is active', example: true })
	@Column({ name: 'is_active', type: 'boolean', default: true })
	isActive: boolean;

	@ApiProperty({ description: 'Available amenities', example: ['tv', 'projector', 'whiteboard'] })
	@Column({ type: 'json', nullable: true })
	amenities: string[];

	@ApiProperty({ description: 'Creation date', example: '2023-01-01T00:00:00.000Z' })
	@CreateDateColumn({ name: 'created_at', type: 'datetime' })
	createdAt: Date;

	@ApiProperty({ description: 'Update date', example: '2023-01-01T00:00:00.000Z' })
	@UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
	updatedAt: Date;

	@ApiProperty({ description: 'Whether space is deleted', example: false })
	@Column({ name: 'deleted', type: 'boolean', default: false })
	deleted: boolean;

	/* Relations */
	@ManyToOne(() => Workspace, (workspace) => workspace.spaces)
	@JoinColumn({ name: 'workspace_id' })
	workspace: Workspace;

	@OneToMany(() => SpaceImage, (spaceImage) => spaceImage.space)
	images: SpaceImage[];

	@OneToMany(() => UnavailableTime, (unavailableTime) => unavailableTime.space)
	unavailableTimes: UnavailableTime[];

	@OneToMany(() => Reservation, (reservation) => reservation.space)
	reservations: Reservation[];
}
