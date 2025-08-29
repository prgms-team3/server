import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
// import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';
import { UsersService } from '../../users/services/users.service';

@Injectable()
export class AuthService {
	constructor(
		private readonly configService: ConfigService,
		private readonly httpService: HttpService,
		private readonly usersService: UsersService,
		// private readonly jwtService: JwtService,
	) {}

	getSocialLoginUrl(provider: string): { url: string } {
		if (provider === 'kakao') {
			const KAKAO_CLIENT_ID = this.configService.getOrThrow<string>('KAKAO_CLIENT_ID');
			const KAKAO_REDIRECT_URI = this.configService.getOrThrow<string>('KAKAO_REDIRECT_URI');

			const url = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${KAKAO_REDIRECT_URI}&response_type=code`;
			return { url };
		}
		// TODO: Google 등 다른 프로바이더 추가
		throw new BadRequestException(`지원하지 않는 프로바이더입니다: ${provider}`);
	}

	async socialLogin(provider: string, code: string, res: Response): Promise<string> {
		if (provider === 'kakao') {
			const accessToken = await this.getKakaoAccessToken(code);
			const kakaoUser: {
				id: number;
				kakao_account?: { email?: string; profile?: { nickname?: string } };
				properties?: { nickname?: string };
			} = await this.getKakaoUserInfo(accessToken);

			if (!kakaoUser.kakao_account?.email) {
				throw new BadRequestException(
					'카카오 계정에서 이메일 정보를 가져올 수 없습니다. 동의 항목을 확인해주세요.',
				);
			}

			const nickname = kakaoUser.properties?.nickname || kakaoUser.kakao_account?.profile?.nickname;
			if (!nickname) {
				throw new BadRequestException(
					'카카오 계정에서 닉네임 정보를 가져올 수 없습니다. 동의 항목을 확인해주세요.',
				);
			}

			let user = await this.usersService.findByProviderId(kakaoUser.id.toString(), 'kakao');
			if (!user) {
				user = await this.usersService.create({
					email: kakaoUser.kakao_account.email,
					name: nickname,
					provider: 'kakao',
					providerId: kakaoUser.id.toString(),
				});
			}

			// const jwtPayload = { sub: user.id, email: user.email };
			// const jwt = this.jwtService.sign(jwtPayload);

			// res.cookie('access_token', jwt, {
			// 	httpOnly: true,
			// 	secure: this.configService.get('NODE_ENV') === 'production',
			// 	sameSite: 'lax',
			// });

			return this.configService.getOrThrow<string>('CLIENT_REDIRECT_URI');
		}
		throw new BadRequestException(`지원하지 않는 프로바이더입니다: ${provider}`);
	}

	private async getKakaoAccessToken(code: string): Promise<string> {
		const KAKAO_CLIENT_ID = this.configService.getOrThrow<string>('KAKAO_CLIENT_ID');
		const KAKAO_REDIRECT_URI = this.configService.getOrThrow<string>('KAKAO_REDIRECT_URI');

		const url = 'https://kauth.kakao.com/oauth/token';
		const headers = {
			'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
		};
		const data = {
			grant_type: 'authorization_code',
			client_id: KAKAO_CLIENT_ID,
			redirect_uri: KAKAO_REDIRECT_URI,
			code,
		};

		try {
			const response = await firstValueFrom(
				this.httpService.post(url, new URLSearchParams(data as any).toString(), {
					headers,
				}),
			);
			return response.data.access_token;
		} catch (error) {
			throw new UnauthorizedException('카카오 토큰 발급에 실패했습니다.');
		}
	}

	private async getKakaoUserInfo(accessToken: string): Promise<any> {
		const url = 'https://kapi.kakao.com/v2/user/me';
		const headers = {
			Authorization: `Bearer ${accessToken}`,
			'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
		};

		try {
			const response = await firstValueFrom(this.httpService.get(url, { headers }));
			return response.data;
		} catch (error) {
			throw new UnauthorizedException('카카오 사용자 정보 조회에 실패했습니다.');
		}
	}

	async logout(res: Response): Promise<void> {
		// res.clearCookie('access_token');
	}
}
