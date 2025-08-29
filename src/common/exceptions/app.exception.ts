import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

export class AppException extends HttpException {
	constructor(errorCode: ErrorCode) {
		super(
			{
				code: errorCode.code,
				message: errorCode.message,
			},
			errorCode.status,
		);
	}
}
