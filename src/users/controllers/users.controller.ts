import {
	Body,
	ClassSerializerInterceptor,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Req,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../types/authenticated-request';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { UsersService } from '../services/users.service';

@ApiTags('Users (데모)')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Post()
	@ApiOperation({ summary: '데모 사용자 생성' })
	@ApiResponse({ status: 201, description: '사용자 생성 성공', type: User })
	@ApiResponse({ status: 409, description: '이미 존재하는 이메일' })
	create(@Body() createUserDto: CreateUserDto): Promise<User> {
		return this.usersService.create(createUserDto);
	}

	@Get()
	@ApiOperation({ summary: '모든 데모 사용자 조회' })
	@ApiResponse({ status: 200, description: '사용자 목록', type: [User] })
	findAll(): Promise<User[]> {
		return this.usersService.findAll();
	}

	@Get('me')
	@ApiOperation({ summary: '내 정보 조회 (마이페이지)' })
	@ApiResponse({ status: 200, description: '현재 로그인한 사용자 정보', type: User })
	@ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	async getMyProfile(@Req() req: AuthenticatedRequest): Promise<User> {
		// JWT에서 추출한 사용자 ID로 사용자 정보 조회
		return this.usersService.findOne(req.user.sub);
	}

	@Patch('me')
	@ApiOperation({ summary: '내 정보 수정 (마이페이지)' })
	@ApiResponse({ status: 200, description: '수정된 사용자 정보', type: User })
	@ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	async updateMyProfile(
		@Req() req: AuthenticatedRequest,
		@Body() updateUserDto: UpdateUserDto,
	): Promise<User> {
		// JWT에서 추출한 사용자 ID로 자신의 정보만 수정 가능
		return this.usersService.update(req.user.sub, updateUserDto);
	}

	@Get(':id')
	@ApiOperation({ summary: '특정 데모 사용자 조회' })
	@ApiParam({ name: 'id', description: '사용자 ID' })
	@ApiResponse({ status: 200, description: '사용자 정보', type: User })
	@ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
	findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
		return this.usersService.findOne(id);
	}

	@Patch(':id')
	@ApiOperation({ summary: '데모 사용자 정보 수정' })
	@ApiParam({ name: 'id', description: '사용자 ID' })
	@ApiResponse({ status: 200, description: '수정된 사용자 정보', type: User })
	@ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
	update(
		@Param('id', ParseIntPipe) id: number,
		@Body() updateUserDto: UpdateUserDto,
	): Promise<User> {
		return this.usersService.update(id, updateUserDto);
	}

	@Delete(':id')
	@ApiOperation({ summary: '데모 사용자 삭제' })
	@ApiParam({ name: 'id', description: '사용자 ID' })
	@ApiResponse({ status: 200, description: '사용자 삭제 성공' })
	@ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
	remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
		return this.usersService.remove(id);
	}
}
