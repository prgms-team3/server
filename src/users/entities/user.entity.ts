import { ApiProperty } from '@nestjs/swagger';

import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { WorkspaceUser } from '../../workspaces/entities/workspace-user.entity';
// import { GroupUser } from '../../groups/entities/group-user.entity';
// import { Reservation } from '../../reservations/entities/reservation.entity';
import { InvitationHistory } from '../../workspaces/entities/invitation-history.entity';

@Entity('user')
export class User {
	@ApiProperty({ description: 'User ID', example: 1 })
	@PrimaryGeneratedColumn({ name: 'id', type: 'int' })
	id: number;

	@ApiProperty({ description: 'User email', example: 'user@example.com' })
	@Column({ nullable: false, type: 'varchar', length: 255, unique: true })
	email: string;

	@ApiProperty({ description: 'Social login provider', example: 'google', required: false })
	@Column({ name: 'provider', type: 'varchar', length: 50, nullable: true })
	provider?: string;

	@ApiProperty({ description: 'Social login provider ID', example: '123456789', required: false })
	@Column({ name: 'provider_id', type: 'varchar', length: 255, nullable: true })
	providerId?: string;

	@ApiProperty({ description: 'User name', example: 'John Doe' })
	@Column({ nullable: false, type: 'varchar', length: 100 })
	name: string;

	@ApiProperty({ description: 'User phone number', example: '010-1234-5678' })
	@Column({ nullable: true, type: 'varchar', length: 20 })
	phone?: string;

	@ApiProperty({ description: 'Creation date', example: '2023-01-01T00:00:00.000Z' })
	@CreateDateColumn({ name: 'created_at', type: 'datetime' })
	createdAt: Date;

	@ApiProperty({ description: 'Update date', example: '2023-01-01T00:00:00.000Z' })
	@UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
	updatedAt: Date;

	@ApiProperty({ description: 'Whether user is active', example: true })
	@Column({ name: 'is_active', type: 'boolean', default: true })
	isActive: boolean;

	/* Relations */
	@OneToMany(() => WorkspaceUser, (workspaceUser) => workspaceUser.user)
	workspaceUsers: WorkspaceUser[];

	// @OneToMany(() => GroupUser, (groupUser) => groupUser.user)
	// groupUsers: GroupUser[];

	// @OneToMany(() => Reservation, (reservation) => reservation.user)
	// reservations: Reservation[];

	@OneToMany(() => InvitationHistory, (invitationHistory) => invitationHistory.createdByUser)
	createdInvitations: InvitationHistory[];

	@OneToMany(() => InvitationHistory, (invitationHistory) => invitationHistory.usedByUser)
	usedInvitations: InvitationHistory[];
}
