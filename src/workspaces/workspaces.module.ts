import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesService } from './services/workspaces.service';
import { WorkspacesController } from './controllers/workspaces.controller';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceUser } from './entities/workspace-user.entity';
import { WorkspaceInvitationCode } from './entities/workspace-invitation-code.entity';
import { InvitationHistory } from './entities/invitation-history.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			Workspace,
			WorkspaceUser,
			WorkspaceInvitationCode,
			InvitationHistory,
		]),
	],
	controllers: [WorkspacesController],
	providers: [WorkspacesService],
	exports: [WorkspacesService],
})
export class WorkspacesModule {}
