import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsService } from './services/reservations.service';
import {
	ReservationsController,
	WorkspaceReservationsController,
} from './controllers/reservations.controller';
import { Reservation } from './entities/reservation.entity';
import { Space } from '../spaces/entities/space.entity';
import { UnavailableTime } from '../spaces/entities/unavailable-time.entity';
import { WorkspaceUser } from '../workspaces/entities/workspace-user.entity';

@Module({
	imports: [TypeOrmModule.forFeature([Reservation, Space, UnavailableTime, WorkspaceUser])],
	controllers: [ReservationsController, WorkspaceReservationsController],
	providers: [ReservationsService],
	exports: [ReservationsService],
})
export class ReservationsModule {}
