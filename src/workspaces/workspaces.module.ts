import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module'; // 추가
import { UsersModule } from '../users/users.module';
import { WorkspacesController } from './controllers/workspaces.controller';
import { InvitationHistory } from './entities/invitation-history.entity';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceInvitationCode } from './entities/workspace-invitation-code.entity';
import { WorkspaceUser } from './entities/workspace-user.entity';
import { WorkspacesService } from './services/workspaces.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			Workspace,
			WorkspaceUser,
			WorkspaceInvitationCode,
			InvitationHistory,
		]),
		AuthModule, // 추가
		UsersModule, // 추가
	],
	controllers: [WorkspacesController],
	providers: [WorkspacesService],
	exports: [WorkspacesService],
})
export class WorkspacesModule {}
