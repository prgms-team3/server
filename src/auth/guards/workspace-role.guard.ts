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
import { Group } from '../../groups/entities/group.entity';

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		@InjectRepository(WorkspaceUser)
		private workspaceUserRepository: Repository<WorkspaceUser>,
		@InjectRepository(Group)
		private groupRepository: Repository<Group>,
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

		const parsedCandidate =
			candidate !== undefined && candidate !== null
				? Number.parseInt(String(candidate), 10)
				: NaN;

		let workspaceId: number = Number.isFinite(parsedCandidate) ? parsedCandidate : NaN;

		// workspaceId가 없으면 groupId로 group을 조회해서 workspaceId를 얻음
		if (!Number.isFinite(workspaceId)) {
			const groupIdCandidate = request.params?.groupId;
			const groupId =
				groupIdCandidate !== undefined && groupIdCandidate !== null
					? Number.parseInt(String(groupIdCandidate), 10)
					: NaN;

			if (!Number.isFinite(groupId)) {
				throw new BadRequestException('워크스페이스 ID 또는 그룹 ID를 찾을 수 없습니다.');
			}

			const group = await this.groupRepository.findOne({
				where: { id: groupId },
				relations: ['workspace'],
			});
			if (!group) {
				throw new BadRequestException('워크스페이스 ID를 찾을 수 없습니다.');
			}

			// group에서 workspaceId 추출 (엔티티 구조에 따라 둘 다 시도)
			const workspaceIdFromGroup = group.workspaceId;
			if (!Number.isFinite(Number(workspaceIdFromGroup))) {
				throw new BadRequestException('그룹에서 워크스페이스 ID를 찾을 수 없습니다.');
			}
			workspaceId = Number(workspaceIdFromGroup);
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
