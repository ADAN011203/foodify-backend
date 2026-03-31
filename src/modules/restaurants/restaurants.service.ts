// RUTA: src/modules/restaurants/restaurants.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { Restaurant }       from './entities/restaurant.entity';
import { UpdateRestaurantDto, UpdateSettingsDto } from './dto/restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(@InjectRepository(Restaurant) private repo: Repository<Restaurant>) {}

  findByOwner(ownerId: number) { return this.repo.find({ where: { ownerId } }); }

  async findOne(id: number) {
    const r = await this.repo.findOneBy({ id });
    if (!r) throw new NotFoundException('Restaurante no encontrado');
    return r;
  }

  async update(id: number, dto: UpdateRestaurantDto) {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async uploadLogo(id: number, file: Express.Multer.File) {
    // TODO: subir a S3 con aws-sdk y guardar URL
    const logoUrl = `https://s3.amazonaws.com/foodify-assets/${id}-logo.jpg`;
    await this.repo.update(id, { logoUrl });
    return { logoUrl };
  }

  async updateStatus(id: number, isActive: boolean) {
    await this.repo.update(id, { isActive });
    return this.findOne(id);
  }

  async updateSettings(id: number, dto: UpdateSettingsDto) {
    const restaurant = await this.findOne(id);
    const current    = restaurant.dashboardConfig ?? {};
    await this.repo.update(id, { dashboardConfig: { ...current, ...dto } });
    return this.findOne(id);
  }

  getDashboard(id: number) {
    // TODO: agregar KPIs reales del día
    return { message: 'KPIs del restaurante', restaurantId: id };
  }
}
