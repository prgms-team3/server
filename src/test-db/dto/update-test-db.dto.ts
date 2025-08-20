import { PartialType } from '@nestjs/mapped-types';
import { CreateTestDbDto } from './create-test-db.dto';

export class UpdateTestDbDto extends PartialType(CreateTestDbDto) {}
