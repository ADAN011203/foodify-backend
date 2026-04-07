// RUTA: src/modules/tables/tables.service.ts
import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table, TableStatus } from './entities/table.entity';

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);
  constructor(@InjectRepository(Table) private repo: Repository<Table>) {}

  async findAll(restaurantId: number) {
    try {
      this.logger.debug(`findAll: restaurantId=${restaurantId}`);
      return await this.repo.find({
        where: { restaurant: { id: restaurantId } },
        order: { number: 'ASC' },
      });
    } catch (err) {
      this.logger.error(
        `findAll FAILED for restaurantId=${restaurantId}: ${err?.message}`,
        err?.stack,
      );
      throw new InternalServerErrorException('Error al obtener mesas');
    }
  }

  async findOne(id: number, restaurantId: number) {
    const t = await this.repo.findOne({
      where: { id, restaurant: { id: restaurantId } },
    });
    if (!t) throw new NotFoundException('Mesa no encontrada');
    return t;
  }

  async create(restaurantId: number, dto: { number: number; capacity?: number }) {
    const qrCodeUrl = `https://menu.foodify.mx/mesa/${restaurantId}-${dto.number}`;
    return this.repo.save(
      this.repo.create({
        ...dto,
        restaurant: { id: restaurantId } as any,
        qrCodeUrl,
      }),
    );
  }

  async update(id: number, restaurantId: number, dto: Partial<Table>) {
    const table = await this.findOne(id, restaurantId);
    await this.repo.update(table.id, dto);
    return this.findOne(id, restaurantId);
  }

  async updateStatus(id: number, restaurantId: number, status: TableStatus) {
    const table = await this.findOne(id, restaurantId);
    await this.repo.update(table.id, { status });
    return this.findOne(id, restaurantId);
  }

  async remove(id: number, restaurantId: number) {
    const table = await this.findOne(id, restaurantId);
    return this.repo.delete(table.id);
  }
}

