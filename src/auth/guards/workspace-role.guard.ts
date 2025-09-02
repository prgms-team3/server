import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedRequest } from '../../types/authenticated-request';
import { WorkspaceRole, WorkspaceUser } from '../../workspaces/entities/workspace-user.entity';
import { WORKSPACE_ROLES_KEY } from '../decorators/workspace-role.decorator';

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		@InjectRepository(WorkspaceUser)
		private workspaceUserRepository: Repository<WorkspaceUser>,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
			WORKSPACE_ROLES_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (!requiredRoles) {
			return true;
		}

		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
		const userId = request.user.sub;

		// URL에서 워크스페이스 ID 추출 (라우트 파라미터에서)
		const workspaceId = parseInt(request.params.id || request.params.workspaceId);

		if (!workspaceId) {
			throw new ForbiddenException('워크스페이스 ID가 필요합니다.');
		}

		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { userId, workspaceId },
		});

		if (!workspaceUser) {
			throw new ForbiddenException('워크스페이스에 접근할 권한이 없습니다.');
		}

		return requiredRoles.includes(workspaceUser.role);
	}
}
