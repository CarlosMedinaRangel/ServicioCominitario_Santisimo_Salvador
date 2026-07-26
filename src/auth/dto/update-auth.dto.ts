import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto.user';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}
