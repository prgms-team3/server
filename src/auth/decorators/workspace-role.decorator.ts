// src/auth/decorators/workspace-roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { WorkspaceRole } from '../../workspaces/entities/workspace-user.entity';

export const WORKSPACE_ROLES_KEY = 'workspaceRoles';
export const WorkspaceRoles = (...roles: WorkspaceRole[]) =>
	SetMetadata(WORKSPACE_ROLES_KEY, roles);
