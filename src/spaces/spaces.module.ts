import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpacesService } from './services/spaces.service';
import { SpacesController, AmenitiesController } from './controllers/spaces.controller';
import { Space } from './entities/space.entity';
import { SpaceImage } from './entities/space-image.entity';
import { UnavailableTime } from './entities/unavailable-time.entity';
import { WorkspaceUser } from '../workspaces/entities/workspace-user.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Space, SpaceImage, UnavailableTime, WorkspaceUser, Reservation]),
		AuthModule,
	],
	controllers: [SpacesController, AmenitiesController],
	providers: [SpacesService],
	exports: [SpacesService],
})
export class SpacesModule {}
