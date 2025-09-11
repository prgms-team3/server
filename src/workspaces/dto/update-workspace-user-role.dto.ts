import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { WorkspaceRole } from '../entities/workspace-user.entity';

export class UpdateWorkspaceUserRoleDto {
	@ApiProperty({
		description: '역할을 변경할 사용자의 ID',
		example: 2,
	})
	@IsNumber()
	@IsNotEmpty()
	userId: number;

	@ApiProperty({
		description: '변경할 워크스페이스 역할 (SUPER_ADMIN으로의 변경은 불가)',
		enum: [WorkspaceRole.ADMIN, WorkspaceRole.MEMBER],
		example: WorkspaceRole.ADMIN,
	})
	@IsEnum(WorkspaceRole)
	@IsNotEmpty()
	role: WorkspaceRole;
}
