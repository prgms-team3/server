import { ApiProperty } from '@nestjs/swagger';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceInvitationCode } from '../entities/workspace-invitation-code.entity';
import { WorkspaceRole } from '../entities/workspace-user.entity';

export class findMyWorkspacesResponseDto {
	@ApiProperty({ type: [Workspace], description: '워크스페이스 목록' })
	workspaces: Workspace[];

	@ApiProperty({ description: '전체 워크스페이스 수' })
	total: number;
}

export class WorkspaceCreateResponseDto {
	@ApiProperty({ type: Workspace, description: '워크스페이스' })
	workspace: Workspace;

	@ApiProperty({ description: '초대 코드' })
	invitationCode: string | null;
}

export class findUserWorkspacesResponseDto {
	@ApiProperty({ description: '초대 코드가 포함된 워크스페이스 목록' })
	workspaces: WorkspaceWithActiveInvitationCode[];

	@ApiProperty({ description: '전체 워크스페이스 수' })
	total: number;
}

export type WorkspaceWithActiveInvitationCode = Workspace & {
	activeInvitationCode: string | null;
	userCount: number;
	userRole?: WorkspaceRole;
};
