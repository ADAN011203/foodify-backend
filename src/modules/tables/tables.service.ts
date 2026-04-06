// RUTA: src/modules/tables/tables.service.ts
import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table, TableStatus } from './entities/table.entity';

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);
  constructor(@InjectRepository(Table) private repo: Repository<Table>) {}
  findAll(restaurantId: number) {
    try {
      return this.repo.find({ where: { restaurantId }, order: { number: 'ASC' } });
    } catch (err) {
      this.logger.error(`findAll failed for restaurantId=${restaurantId}`, err?.stack);
      throw new InternalServerErrorException('Error al obtener mesas');
    }
  }
  async findOne(id: number, restaurantId: number) {
    const t = await this.repo.findOneBy({ id, restaurantId });
    if (!t) throw new NotFoundException('Mesa no encontrada');
    return t;
  }
  create(restaurantId: number, dto: { number: number; capacity?: number }) {
    const qrCodeUrl = `https://menu.foodify.mx/mesa/${restaurantId}-${dto.number}`;
    return this.repo.save(this.repo.create({ ...dto, restaurantId, qrCodeUrl }));
  }
  async update(id: number, restaurantId: number, dto: Partial<Table>) {
    await this.repo.update({ id, restaurantId }, dto);
    return this.findOne(id, restaurantId);
  }
  async updateStatus(id: number, restaurantId: number, status: TableStatus) {
    await this.repo.update({ id, restaurantId }, { status });
    return this.findOne(id, restaurantId);
  }
  remove(id: number, restaurantId: number) { return this.repo.delete({ id, restaurantId }); }
}
