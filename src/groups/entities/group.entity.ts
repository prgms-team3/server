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
import { User } from '../../users/entities/user.entity';

@Entity('groups')
export class Group {
	@ApiProperty({ description: '그룹 ID' })
	@PrimaryGeneratedColumn()
	id: number;

	@ApiProperty({ description: '그룹명' })
	@Column({ length: 100 })
	name: string;

	@ApiProperty({ description: '그룹 설명', required: false })
	@Column({ type: 'text', nullable: true })
	description?: string;

	@ApiProperty({ description: '그룹 생성자 ID' })
	@Column({ name: 'creator_id' })
	creatorId: number;

	@ApiProperty({ description: '최대 멤버 수' })
	@Column({ name: 'max_members', default: 10 })
	maxMembers: number;

	@ApiProperty({ description: '활성 상태' })
	@Column({ name: 'is_active', default: true })
	isActive: boolean;

	@ApiProperty({ description: '생성일시' })
	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@ApiProperty({ description: '수정일시' })
	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;

	// Relations
	@ApiProperty({ description: '그룹 생성자', type: () => User })
	@ManyToOne(() => User, { eager: true })
	@JoinColumn({ name: 'creator_id' })
	creator: User;
}
