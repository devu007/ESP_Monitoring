import { prisma } from '../../shared/prisma';
import { NotFoundError } from '../../shared/errors/app-error';
import { CreateFieldInput, UpdateFieldInput } from './field.schema';

export class FieldService {
  async create(userId: string, input: CreateFieldInput) {
    return prisma.field.create({
      data: { ...input, userId },
      include: { _count: { select: { wells: true } } },
    });
  }

  async findAllByUser(userId: string) {
    return prisma.field.findMany({
      where: { userId },
      include: { _count: { select: { wells: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const field = await prisma.field.findFirst({
      where: { id, userId },
      include: {
        wells: {
          include: { esp: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { wells: true } },
      },
    });
    if (!field) throw new NotFoundError('Field');
    return field;
  }

  async update(id: string, userId: string, input: UpdateFieldInput) {
    await this.findById(id, userId);
    return prisma.field.update({
      where: { id },
      data: input,
      include: { _count: { select: { wells: true } } },
    });
  }

  async delete(id: string, userId: string) {
    await this.findById(id, userId);
    return prisma.field.delete({ where: { id } });
  }
}
