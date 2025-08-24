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
import { Workspace } from './workspace.entity';
import { InvitationHistory } from './invitation-history.entity';

@Entity('workspace_invitation_code')
export class WorkspaceInvitationCode {
  @ApiProperty({ description: 'Invitation Code ID', example: 1 })
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @ApiProperty({ description: 'Workspace ID', example: 1 })
  @Column({ name: 'workspace_id', type: 'int' })
  workspaceId: number;

  @ApiProperty({ description: 'Invitation code', example: 'ABC123DEF' })
  @Column({ nullable: false, type: 'varchar', length: 50, unique: true })
  code: string;

  @ApiProperty({ description: 'Creation date', example: '2023-01-01T00:00:00.000Z' })
  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ApiProperty({ description: 'Update date', example: '2023-01-01T00:00:00.000Z' })
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @ApiProperty({ description: 'Whether code is active', example: true })
  @Column({ name: 'is_active', nullable: false, type: 'boolean', default: true })
  isActive: boolean;

  /* Relations */
  @ManyToOne(() => Workspace, (workspace) => workspace.invitationCodes)
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @OneToMany(() => InvitationHistory, (invitationHistory) => invitationHistory.invitationCode)
  invitationHistories: InvitationHistory[];
}
