import { HttpStatus } from '@nestjs/common';

export interface ErrorCode {
	code: string;
	message: string;
	status: HttpStatus;
}

export const ErrorCode = {
	// General errors
	BAD_REQUEST: {
		code: 'WORKSPACE_BAD_REQUEST',
		message: '잘못된 요청입니다.',
		status: HttpStatus.BAD_REQUEST,
	},
	SERVER_ERROR: {
		code: 'WORKSPACE_SERVER_ERROR',
		message: '처리 중 서버 오류가 발생했습니다.',
		status: HttpStatus.INTERNAL_SERVER_ERROR,
	},

	// User related errors
	USER_NOT_FOUND: {
		code: 'USER_NOT_FOUND',
		message: '사용자를 찾을 수 없습니다.',
		status: HttpStatus.NOT_FOUND,
	},
	USER_ALREADY_EXISTS: {
		code: 'USER_ALREADY_EXISTS',
		message: '이미 존재하는 사용자입니다.',
		status: HttpStatus.CONFLICT,
	},
	USER_ALREADY_IN_WORKSPACE: {
		code: 'USER_ALREADY_IN_WORKSPACE',
		message: '사용자가 이미 워크스페이스에 속해 있습니다.',
		status: HttpStatus.CONFLICT,
	},
	USER_NOT_IN_WORKSPACE: {
		code: 'USER_NOT_IN_WORKSPACE',
		message: '사용자가 워크스페이스에 속해 있지 않습니다.',
		status: HttpStatus.BAD_REQUEST,
	},

	// Workspace related errors
	WORKSPACE_NOT_FOUND: {
		code: 'WORKSPACE_NOT_FOUND',
		message: '워크스페이스를 찾을 수 없습니다.',
		status: HttpStatus.NOT_FOUND,
	},
	WORKSPACE_ALREADY_EXISTS: {
		code: 'WORKSPACE_ALREADY_EXISTS',
		message: '이미 존재하는 워크스페이스입니다.',
		status: HttpStatus.CONFLICT,
	},
	WORKSPACE_ACCESS_DENIED: {
		code: 'WORKSPACE_ACCESS_DENIED',
		message: '워크스페이스에 접근할 권한이 없습니다.',
		status: HttpStatus.FORBIDDEN,
	},
	WORKSPACE_AUTHORIZATION_DENIED: {
		code: 'WORKSPACE_AUTHORIZATION_DENIED',
		message: '워크스페이스 작업을 수행할 권한이 없습니다.',
		status: HttpStatus.FORBIDDEN,
	},
	INVALID_INVITATION_CODE: {
		code: 'INVALID_INVITATION_CODE',
		message: '유효하지 않은 초대 코드입니다.',
		status: HttpStatus.BAD_REQUEST,
	},
	ALEADY_EXIST_INVITATION_CODE: {
		code: 'ALEADY_EXIST_INVITATION_CODE',
		message: '이미 존재하는 초대 코드입니다.',
		status: HttpStatus.CONFLICT,
	},

	// Space related errors
	SPACE_NOT_FOUND: {
		code: 'SPACE_NOT_FOUND',
		message: '공간을 찾을 수 없습니다.',
		status: HttpStatus.NOT_FOUND,
	},
	SPACE_ACCESS_DENIED: {
		code: 'SPACE_ACCESS_DENIED',
		message: '공간에 접근할 권한이 없습니다.',
		status: HttpStatus.FORBIDDEN,
	},

	// Reservation related errors
	RESERVATION_NOT_FOUND: {
		code: 'RESERVATION_NOT_FOUND',
		message: '예약을 찾을 수 없습니다.',
		status: HttpStatus.NOT_FOUND,
	},
	RESERVATION_CONFLICT: {
		code: 'RESERVATION_CONFLICT',
		message: '해당 시간에 이미 예약이 있습니다.',
		status: HttpStatus.CONFLICT,
	},
	RESERVATION_ACCESS_DENIED: {
		code: 'RESERVATION_ACCESS_DENIED',
		message: '예약에 접근할 권한이 없습니다.',
		status: HttpStatus.FORBIDDEN,
	},
	SPACE_UNAVAILABLE: {
		code: 'SPACE_UNAVAILABLE',
		message: '해당 시간에 공간을 사용할 수 없습니다.',
		status: HttpStatus.BAD_REQUEST,
	},

	// Group related errors
	GROUP_NOT_FOUND: {
		code: 'GROUP_NOT_FOUND',
		message: '그룹을 찾을 수 없습니다.',
		status: HttpStatus.NOT_FOUND,
	},
	GROUP_ACCESS_DENIED: {
		code: 'GROUP_ACCESS_DENIED',
		message: '그룹에 접근할 권한이 없습니다.',
		status: HttpStatus.FORBIDDEN,
	},
};
