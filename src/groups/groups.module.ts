import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { WorkspaceUser } from '../workspaces/entities/workspace-user.entity';
import { GroupsController } from './controllers/groups.controller';
import { Group } from './entities/group.entity';
import { GroupUser } from './entities/group-user.entity';
import { GroupsService } from './services/groups.service';
import { WorkspacesModule } from 'src/workspaces/workspaces.module';
import { WorkspacesService } from 'src/workspaces/services/workspaces.service';
import { UsersModule } from 'src/users/users.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Group, GroupUser, WorkspaceUser]),
		AuthModule,
		WorkspacesModule,
		UsersModule,
	],
	controllers: [GroupsController],
	providers: [GroupsService],
	exports: [GroupsService, TypeOrmModule],
})
export class GroupsModule {}
