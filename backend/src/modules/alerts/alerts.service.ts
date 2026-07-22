import { prisma } from '../../shared/prisma';

export class AlertsService {
  async getAlerts(
    userId: string,
    filters: { severity?: string; isRead?: boolean; wellId?: string },
    page = 1,
    pageSize = 20
  ) {
    const where: any = { well: { field: { userId } } };
    if (filters.severity) where.severity = filters.severity;
    if (filters.isRead !== undefined) where.isRead = filters.isRead;
    if (filters.wellId) where.wellId = filters.wellId;

    const skip = (page - 1) * pageSize;

    const [alerts, totalCount] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: { well: { select: { id: true, name: true } } },
        orderBy: { triggeredAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.alert.count({ where }),
    ]);

    return {
      alerts,
      pagination: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
    };
  }

  async getAlertCounts(userId: string) {
    const where = { well: { field: { userId } } };
    const [total, unread, critical, high] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.count({ where: { ...where, isRead: false } }),
      prisma.alert.count({ where: { ...where, severity: 'CRITICAL' } }),
      prisma.alert.count({ where: { ...where, severity: 'HIGH' } }),
    ]);
    return { total, unread, critical, high };
  }

  async markAsRead(alertId: string, userId: string) {
    const alert = await prisma.alert.findFirst({
      where: { id: alertId, well: { field: { userId } } },
    });
    if (!alert) return null;
    return prisma.alert.update({ where: { id: alertId }, data: { isRead: true } });
  }

  async markAllAsRead(userId: string) {
    const result = await prisma.alert.updateMany({
      where: { well: { field: { userId } }, isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count };
  }

  async dismissAlert(alertId: string, userId: string) {
    const alert = await prisma.alert.findFirst({
      where: { id: alertId, well: { field: { userId } } },
    });
    if (!alert) return null;
    return prisma.alert.delete({ where: { id: alertId } });
  }
}
