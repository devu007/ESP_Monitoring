import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../shared/prisma';
import { config } from '../../config';
import { ConflictError, UnauthorizedError } from '../../shared/errors/app-error';
import { RegisterInput, LoginInput } from './auth.schema';
import { JwtPayload } from '../../middleware/auth';

const SALT_ROUNDS = 12;

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const token = this.generateToken({ userId: user.id, email: user.email });
    return { user, token };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = this.generateToken({ userId: user.id, email: user.email });
    return {
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      token,
    };
  }

  private generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
  }
}
