import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { WorkspaceUser } from '../workspaces/entities/workspace-user.entity';
import { GroupsController } from './controllers/groups.controller';
import { Group } from './entities/group.entity';
import { GroupUser } from './entities/group-user.entity';
import { GroupsService } from './services/groups.service';

@Module({
	imports: [TypeOrmModule.forFeature([Group, GroupUser, WorkspaceUser]), AuthModule],
	controllers: [GroupsController],
	providers: [GroupsService],
	exports: [GroupsService, TypeOrmModule],
})
export class GroupsModule {}
