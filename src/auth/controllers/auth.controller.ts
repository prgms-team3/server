import { Controller, Get, Param, Post, Query, Redirect, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { AuthService } from '../services/auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Get(':provider')
	@ApiOperation({ summary: '소셜 로그인 페이지로 리다이렉션' })
	@ApiParam({
		name: 'provider',
		description: '소셜 로그인 제공자 (e.g., kakao, google)',
		enum: ['kakao', 'google'],
	})
	@Redirect()
	socialLogin(@Param('provider') provider: string) {
		const { url } = this.authService.getSocialLoginUrl(provider);
		return { url };
	}

	@Get(':provider/callback')
	@ApiOperation({ summary: '소셜 로그인 콜백' })
	@Redirect()
	async socialLoginCallback(
		@Param('provider') provider: string,
		@Query('code') code: string,
		@Res({ passthrough: true }) res: Response,
	) {
		const redirectUrl = await this.authService.socialLogin(provider, code, res);
		return { url: redirectUrl };
	}

	@Post('logout')
	@ApiOperation({ summary: '로그아웃' })
	async logout(@Res({ passthrough: true }) res: Response) {
		await this.authService.logout(res);
		return { message: '로그아웃 되었습니다.' };
	}

	@Get('')
	@ApiOperation({ summary: '로그인 상태 확인' })
	async checkLoginStatus(@Res({ passthrough: true }) res: Response) {
		return 'social login passed';
	}
}
