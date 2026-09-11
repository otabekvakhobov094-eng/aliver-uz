import { Injectable, NotFoundException } from '@nestjs/common';
import { B2BLeadStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateLeadInput {
  company: string; contactPerson: string; phone: string; telegram?: string;
  city?: string; businessType?: string; monthlyVolume?: string; comment?: string;
}

@Injectable()
export class B2bService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateLeadInput) { return this.prisma.b2BLead.create({ data }); }

  list(status?: B2BLeadStatus) {
    return this.prisma.b2BLead.findMany({ where: { status }, orderBy: { createdAt: 'desc' } });
  }

  async update(id: string, data: { status?: B2BLeadStatus; assignedTo?: string | null; comment?: string }) {
    const exists = await this.prisma.b2BLead.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('B2B ariza topilmadi');
    return this.prisma.b2BLead.update({ where: { id }, data });
  }
}
