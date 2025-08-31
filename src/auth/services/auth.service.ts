import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/services/users.service';
import { parseJwtExpiration } from '../../common/utils/time.util';

interface KakaoUser {
	id: number;
	kakao_account?: {
		email?: string;
		profile?: {
			nickname?: string;
		};
	};
}

@Injectable()
export class AuthService {
	constructor(
		private readonly configService: ConfigService,
		private readonly httpService: HttpService,
		private readonly jwtService: JwtService,
		private readonly usersService: UsersService,
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
			const kakaoUser: KakaoUser = await this.getKakaoUserInfo(accessToken);

			if (!kakaoUser.kakao_account?.email) {
				throw new BadRequestException(
					'카카오 계정에서 이메일 정보를 가져올 수 없습니다. 동의 항목을 확인해주세요.',
				);
			}

			const nickname = kakaoUser.kakao_account?.profile?.nickname;
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

			const newAccessToken = await this.getAccessToken(user.id, user.email);
			const newRefreshToken = await this.getRefreshToken(user.id, user.email);

			await this.saveRefreshToken(newRefreshToken, user.id);

			res.cookie('access_token', newAccessToken, {
				httpOnly: true,
				secure: this.configService.get('NODE_ENV') === 'production',
				sameSite: 'lax',
				maxAge: parseJwtExpiration(
					this.configService.getOrThrow('JWT_ACCESS_TOKEN_EXPIRATION_TIME'),
				),
			});

			res.cookie('refresh_token', newRefreshToken, {
				httpOnly: true,
				secure: this.configService.get('NODE_ENV') === 'production',
				sameSite: 'lax',
				maxAge: parseJwtExpiration(
					this.configService.getOrThrow('JWT_REFRESH_TOKEN_EXPIRATION_TIME'),
				),
			});

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
				this.httpService.post(url, new URLSearchParams(data).toString(), {
					headers,
				}),
			);
			return response.data.access_token;
		} catch (error) {
			throw new UnauthorizedException('카카오 토큰 발급에 실패했습니다.');
		}
	}

	private async getKakaoUserInfo(accessToken: string): Promise<KakaoUser> {
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

	async getAccessToken(userId: number, email: string): Promise<string> {
		const payload = { sub: userId, email };
		const accessToken = await this.jwtService.signAsync(payload, {
			secret: this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
			expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_EXPIRATION_TIME'),
		});
		return accessToken;
	}

	async getRefreshToken(userId: number, email: string): Promise<string> {
		const payload = { sub: userId, email };
		const refreshToken = await this.jwtService.signAsync(payload, {
			secret: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET'),
			expiresIn: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME'),
		});
		return refreshToken;
	}

	async saveRefreshToken(refreshToken: string, userId: number) {
		const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
		await this.usersService.setCurrentRefreshToken(userId, currentHashedRefreshToken);
	}

	async refreshAccessToken(refreshToken: string) {
		try {
			const payload = await this.jwtService.verifyAsync(refreshToken, {
				secret: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET'),
			});

			const user = await this.usersService.getUserIfRefreshTokenMatches(
				refreshToken,
				payload.sub,
			);
			if (!user) {
				throw new UnauthorizedException('Invalid refresh token');
			}

			const newAccessToken = await this.getAccessToken(user.id, user.email);
			return { accessToken: newAccessToken };
		} catch (error) {
			throw new UnauthorizedException('Invalid refresh token');
		}
	}

	async signout(res: Response, userId: number): Promise<void> {
		try {
			await this.usersService.removeRefreshToken(userId);

			// 쿠키 생성 시와 동일한 옵션으로 삭제
			const cookieOptions = {
				httpOnly: true,
				secure: this.configService.get('NODE_ENV') === 'production',
				sameSite: 'lax' as const,
			};

			res.clearCookie('access_token', cookieOptions);
			res.clearCookie('refresh_token', cookieOptions);

			console.log(`User ${userId} signed out successfully`);
		} catch (error) {
			console.error(`Failed to sign out user ${userId}:`, error);
			// 에러가 발생해도 쿠키는 삭제 시도
			res.clearCookie('access_token');
			res.clearCookie('refresh_token');
		}
	}
}
