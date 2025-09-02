import { ApiProperty } from '@nestjs/swagger';
import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { Space } from './space.entity';

export enum ImageType {
	PHOTO = 'PHOTO',
	FLOOR_PLAN = 'FLOOR_PLAN',
}

@Entity('space_image')
export class SpaceImage {
	@ApiProperty({ description: 'Space Image ID', example: 1 })
	@PrimaryGeneratedColumn({ name: 'id', type: 'int' })
	id: number;

	@ApiProperty({ description: 'Space ID', example: 1 })
	@Column({ name: 'space_id', type: 'int' })
	spaceId: number;

	@ApiProperty({ description: 'Image URL', example: 'https://example.com/image.jpg' })
	@Column({ name: 'image_url', type: 'varchar', length: 500 })
	imageUrl: string;

	@ApiProperty({ description: 'Image type', example: ImageType.PHOTO, enum: ImageType })
	@Column({ name: 'image_type', type: 'enum', enum: ImageType })
	imageType: ImageType;

	@ApiProperty({ description: 'Display order', example: 1 })
	@Column({ name: 'display_order', type: 'int', default: 1 })
	displayOrder: number;

	@ApiProperty({ description: 'Creation date', example: '2023-01-01T00:00:00.000Z' })
	@CreateDateColumn({ name: 'created_at', type: 'datetime' })
	createdAt: Date;

	/* Relations */
	@ManyToOne(() => Space, (space) => space.images)
	@JoinColumn({ name: 'space_id' })
	space: Space;
}
