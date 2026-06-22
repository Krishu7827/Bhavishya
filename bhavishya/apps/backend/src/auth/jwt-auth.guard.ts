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
      // For public routes, allow access without authentication
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        // No token present, allow without user
        return true;
      }
      
      // Token present but public route - set flag for handleRequest
      (request as any).isPublicRoute = true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: Error | null, user: any, _info: any, context: any) {
    // Check if this is a public route (set in canActivate)
    const request = context?.switchToHttp?.()?.getRequest?.() || {};
    const isPublic = (request as any).isPublicRoute;
    
    if (isPublic) {
      return user || null; // Allow null user for public routes
    }
    
    if (err || !user) {
      throw err || new UnauthorizedException('Not authenticated');
    }
    
    return user;
  }
}
