import {
	Body,
	ClassSerializerInterceptor,
	Controller,
	Get,
	Patch,
	Req,
	UseGuards,
	Delete,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { UsersService } from '../services/users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get('me')
	@ApiOperation({ summary: '내 정보 조회 (미사용)' })
	@ApiResponse({ status: 200, description: '현재 로그인한 사용자 정보', type: User })
	@ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
	async getMe(@Req() req: AuthenticatedRequest): Promise<User> {
		return this.usersService.findOne(req.user.sub);
	}

	@Patch('me')
	@ApiOperation({ summary: '내 정보 수정 (미사용)' })
	@ApiResponse({ status: 200, description: '수정된 사용자 정보', type: User })
	@ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
	@ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
	async updateMe(
		@Req() req: AuthenticatedRequest,
		@Body() updateUserDto: UpdateUserDto,
	): Promise<User> {
		return this.usersService.update(req.user.sub, updateUserDto);
	}

	@Delete('me')
	@ApiOperation({ summary: '회원탈퇴' })
	@ApiResponse({ status: 204, description: '회원 탈퇴 완료' })
	@ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
	async deleteMe(@Req() req: AuthenticatedRequest) {
		await this.usersService.remove(req.user.sub);
		return { message: '회원 탈퇴 완료되었습니다.' };
	}
}
