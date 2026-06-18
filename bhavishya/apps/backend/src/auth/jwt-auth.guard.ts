import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // For public routes, still try to authenticate if token is present
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;
      
      if (authHeader) {
        // Token present, try to validate it
        return super.canActivate(context) as Promise<boolean>;
      }
      
      // No token, allow access without user
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: Error | null, user: any) {
    // For public routes, don't throw error if no user
    const request = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      arguments[0]?.constructor,
    ]);
    
    if (request) {
      return user || null; // Allow null user for public routes
    }
    
    if (err || !user) {
      throw err || new UnauthorizedException('Not authenticated');
    }
    return user;
  }
}
