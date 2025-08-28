import { ApiProperty } from '@nestjs/swagger';
import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';
import { WorkspaceInvitationCode } from './workspace-invitation-code.entity';
import { User } from '../../users/entities/user.entity';

export enum InvitationStatus {
	SENT = 'SENT',
	USED = 'USED',
	EXPIRED = 'EXPIRED',
}

@Entity('invitation_history')
export class InvitationHistory {
	@ApiProperty({ description: 'Invitation History ID', example: 1 })
	@PrimaryGeneratedColumn({ name: 'id', type: 'int' })
	id: number;

	@ApiProperty({ description: 'Workspace ID', example: 1 })
	@Column({ name: 'workspace_id', type: 'int' })
	workspaceId: number;

	@ApiProperty({ description: 'Invitation Code ID', example: 1 })
	@Column({ name: 'invitation_code_id', type: 'int' })
	invitationCodeId: number;

	@ApiProperty({ description: 'Email sent to', example: 'user@example.com' })
	@Column({ name: 'email_sent_to', type: 'varchar', length: 100 })
	emailSentTo: string;

	@ApiProperty({ description: 'Created by user ID', example: 1 })
	@Column({ name: 'created_by_user_id', type: 'int' })
	createdByUserId: number;

	@ApiProperty({ description: 'Creation date', example: '2023-01-01T00:00:00.000Z' })
	@CreateDateColumn({ name: 'created_at', type: 'datetime' })
	createdAt: Date;

	@ApiProperty({ description: 'Used date', example: '2023-01-01T00:00:00.000Z', required: false })
	@Column({ name: 'used_at', type: 'datetime', nullable: true })
	usedAt: Date;

	@ApiProperty({ description: 'Used by user ID', example: 1, required: false })
	@Column({ name: 'used_by_user_id', type: 'int', nullable: true })
	usedByUserId: number;

	@ApiProperty({
		description: 'Invitation status',
		example: InvitationStatus.SENT,
		enum: InvitationStatus,
	})
	@Column({ type: 'enum', enum: InvitationStatus, default: InvitationStatus.SENT })
	status: InvitationStatus;

	/* Relations */
	@ManyToOne(() => Workspace, (workspace) => workspace.invitationHistories)
	@JoinColumn({ name: 'workspace_id' })
	workspace: Workspace;

	@ManyToOne(
		() => WorkspaceInvitationCode,
		(invitationCode) => invitationCode.invitationHistories,
	)
	@JoinColumn({ name: 'invitation_code_id' })
	invitationCode: WorkspaceInvitationCode;

	@ManyToOne(() => User)
	@JoinColumn({ name: 'created_by_user_id' })
	createdByUser: User;

	@ManyToOne(() => User)
	@JoinColumn({ name: 'used_by_user_id' })
	usedByUser: User;
}
