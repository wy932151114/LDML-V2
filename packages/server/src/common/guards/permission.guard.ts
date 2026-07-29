import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export enum PermissionLevel {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  VIP = 'vip',
}

// 权限等级数字映射（便于比较）
const LEVEL_ORDER: Record<string, number> = {
  [PermissionLevel.FREE]: 0,
  [PermissionLevel.BASIC]: 1,
  [PermissionLevel.PREMIUM]: 2,
  [PermissionLevel.VIP]: 3,
};

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const requiredLevel = this.reflector.get<PermissionLevel>('permission-level', context.getHandler());

    if (!requiredLevel) return true;
    if (!user) throw new ForbiddenException('用戶等級不足');

    const userLevel = LEVEL_ORDER[user.membershipLevel] ?? -1;
    const required = LEVEL_ORDER[requiredLevel] ?? -1;

    if (userLevel >= required) {
      return true;
    }

    throw new ForbiddenException('用戶等級不足');
  }
}
