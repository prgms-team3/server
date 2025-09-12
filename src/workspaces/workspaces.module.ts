import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module'; // 추가
import { UsersModule } from '../users/users.module';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceUser } from './entities/workspace-user.entity';
import { WorkspaceInvitationCode } from './entities/workspace-invitation-code.entity';
import { InvitationHistory } from './entities/invitation-history.entity';
import { Group } from '../groups/entities/group.entity'; // 추가
import { WorkspacesController } from './controllers/workspaces.controller';
import { WorkspacesService } from './services/workspaces.service';
import { UsersService } from '../users/services/users.service';
import { User } from '../users/entities/user.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			Workspace,
			WorkspaceUser,
			WorkspaceInvitationCode,
			InvitationHistory,
			Group,
			User,
		]),
		AuthModule,
		UsersModule,
	],
	controllers: [WorkspacesController],
	providers: [WorkspacesService, UsersService],
	exports: [WorkspacesService],
})
export class WorkspacesModule {}
