import { prisma } from '../../shared/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors/app-error';
import { CreateEspInput, UpdateEspInput } from './esp.schema';

export class EspService {
  async create(wellId: string, userId: string, input: CreateEspInput) {
    const well = await prisma.well.findFirst({
      where: { id: wellId, field: { userId } },
      include: { esp: true },
    });
    if (!well) throw new NotFoundError('Well');
    if (well.esp) throw new ConflictError('ESP configuration already exists for this well');

    return prisma.esp.create({
      data: {
        wellId,
        manufacturer: input.manufacturer,
        model: input.model,
        installationDate: new Date(input.installationDate),
        pumpStages: input.pumpStages,
        ratedPower: input.ratedPower,
        ratedSpeed: input.ratedSpeed,
        frequencyMin: input.frequencyMin,
        frequencyMax: input.frequencyMax,
        motorRating: input.motorRating,
        designFlowMin: input.designFlowMin,
        designFlowMax: input.designFlowMax,
      },
    });
  }

  async update(wellId: string, userId: string, input: UpdateEspInput) {
    const well = await prisma.well.findFirst({
      where: { id: wellId, field: { userId } },
      include: { esp: true },
    });
    if (!well) throw new NotFoundError('Well');
    if (!well.esp) throw new NotFoundError('ESP configuration');

    const data: any = { ...input };
    if (input.installationDate) {
      data.installationDate = new Date(input.installationDate);
    }

    return prisma.esp.update({
      where: { id: well.esp.id },
      data,
    });
  }

  async findByWell(wellId: string, userId: string) {
    const well = await prisma.well.findFirst({
      where: { id: wellId, field: { userId } },
      include: { esp: true },
    });
    if (!well) throw new NotFoundError('Well');
    if (!well.esp) throw new NotFoundError('ESP configuration');
    return well.esp;
  }
}
