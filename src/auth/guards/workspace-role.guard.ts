import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
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
		const userId = request.user?.sub;
		if (!userId) {
			throw new ForbiddenException('인증 정보가 필요합니다.');
		}

		// 명시적 키만 허용: params, query, body 중 workspaceId 찾기
		const candidate =
			request.params?.workspaceId ??
			request.query?.workspaceId ??
			request.body?.workspaceId ??
			request.body?.workspace?.id;

		const workspaceId =
			candidate !== undefined && candidate !== null
				? Number.parseInt(String(candidate), 10)
				: NaN;
		if (Number.isNaN(workspaceId)) {
			throw new BadRequestException('워크스페이스 ID가 필요합니다.');
		}

		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { userId, workspaceId },
		});

		if (!workspaceUser) {
			throw new ForbiddenException('워크스페이스에 접근할 권한이 없습니다.');
		}

		if (!requiredRoles.includes(workspaceUser.role)) {
			throw new ForbiddenException('워크스페이스 관리자 권한이 없습니다.');
		}

		return true;
	}
}
