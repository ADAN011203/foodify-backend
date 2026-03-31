// RUTA: src/modules/inventory/inventory.service.ts
//
// Lógica FIFO + compatibilidad con la App Android de Jorge.
// El trigger MySQL after_order_delivered hace el descuento automático.
// Este servicio maneja: CRUD items, lotes, ajustes manuales y alertas.
import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';

import { InventoryItem }     from './entities/inventory-item.entity';
import { InventoryLot, LotStatus } from './entities/inventory-lot.entity';
import { InventoryMovement, MovementType } from './entities/inventory-movement.entity';
import { InventoryAlert, AlertType }       from './entities/inventory-alert.entity';
import { CreateItemDto, UpdateItemDto, CreateLotDto, UpdateLotDto, AdjustmentDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)     private itemRepo:     Repository<InventoryItem>,
    @InjectRepository(InventoryLot)      private lotRepo:      Repository<InventoryLot>,
    @InjectRepository(InventoryMovement) private movRepo:      Repository<InventoryMovement>,
    @InjectRepository(InventoryAlert)    private alertRepo:    Repository<InventoryAlert>,
  ) {}

  // ─── Items ────────────────────────────────────────────────────────

  findAllItems(restaurantId: number) {
    return this.itemRepo.find({
      where:     { restaurant: { id: restaurantId } },
      relations: ['alerts'],
      order:     { name: 'ASC' },
    });
  }

  async findOneItem(id: number, restaurantId: number) {
    const item = await this.itemRepo.findOne({
      where:     { id, restaurant: { id: restaurantId } },
      relations: ['lots', 'alerts'],
    });
    if (!item) throw new NotFoundException('Insumo no encontrado');
    return item;
  }

  createItem(restaurantId: number, dto: CreateItemDto) {
    return this.itemRepo.save(
      this.itemRepo.create({ ...dto, restaurant: { id: restaurantId } as any }),
    );
  }

  async updateItem(id: number, restaurantId: number, dto: UpdateItemDto) {
    await this.itemRepo
      .createQueryBuilder()
      .update(InventoryItem)
      .set(dto as any)
      .where('id = :id AND restaurant_id = :rid', { id, rid: restaurantId })
      .execute();
    return this.findOneItem(id, restaurantId);
  }

  // ─── Lotes ────────────────────────────────────────────────────────

  findAllLots(restaurantId: number, filters: {
    itemId?: number; status?: string; expiringSoon?: boolean;
  }) {
    const qb = this.lotRepo.createQueryBuilder('l')
      .leftJoinAndSelect('l.item', 'item')
      .where('item.restaurant_id = :rid', { rid: restaurantId });

    if (filters.itemId)      qb.andWhere('l.item_id = :iid',    { iid: filters.itemId });
    if (filters.status)      qb.andWhere('l.status = :status', { status: filters.status });
    if (filters.expiringSoon) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + 7);
      qb.andWhere('l.expiryDate <= :threshold AND l.status != :expired', {
        threshold, expired: LotStatus.EXPIRED,
      });
    }
    return qb.orderBy('l.entryDate', 'ASC').getMany();
  }

  async findOneLot(id: number) {
    const lot = await this.lotRepo.findOne({ where: { id }, relations: ['item'] });
    if (!lot) throw new NotFoundException('Lote no encontrado');
    return lot;
  }

  /**
   * Registrar entrada de mercancía (nuevo lote).
   * Jorge: "Si yo en la App registro que llegaron 10kg de carne,
   * el Backend debe sumar eso al stock global"
   */
  async createLot(restaurantId: number, dto: CreateLotDto) {
    const itemId = dto.itemId ?? (dto as any).item_id;
    const lotNumber = dto.lotNumber ?? (dto as any).lot_number ?? null;
    const unitCost = dto.unitCost ?? (dto as any).unit_cost;
    const entryDate = dto.entryDate ?? (dto as any).entry_date;
    const expiryDate = dto.expiryDate ?? (dto as any).expiry_date;
    const itemName =
      dto.itemName ??
      (dto as any).item_name ??
      (dto as any).ingredient_name ??
      (dto as any).nombreIngrediente;
    const unit = dto.unit ?? (dto as any).unidad ?? (dto as any).unidadMedida;

    if (!unitCost) throw new BadRequestException('unitCost (o unit_cost) es requerido');
    if (!entryDate) throw new BadRequestException('entryDate (o entry_date) es requerido');

    let item: InventoryItem | null = null;
    if (itemId) {
      item = await this.itemRepo.findOne({
        where: { id: itemId, restaurant: { id: restaurantId } },
      });
    }

    // UX movil: permitir alta de insumo desde "Nuevo Lote".
    if (!item) {
      if (!itemName || !unit) {
        throw new NotFoundException(
          'Insumo no encontrado. Envia item_id valido o nombre + unidad para crearlo.',
        );
      }

      const existingByName = await this.itemRepo.findOne({
        where: { name: itemName.trim(), restaurant: { id: restaurantId } },
      });

      if (existingByName) {
        item = existingByName;
      } else {
        item = await this.itemRepo.save(
          this.itemRepo.create({
            restaurant: { id: restaurantId } as any,
            name: itemName.trim(),
            unit: unit.trim(),
            minStock: 0,
            category: null,
          }),
        );
      }
    }

    // Calcular estado del lote según fecha de caducidad
    let status = LotStatus.AVAILABLE;
    if (expiryDate) {
      const expiry    = new Date(expiryDate);
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + 7);
      if (expiry <= new Date())  status = LotStatus.EXPIRED;
      else if (expiry <= threshold) status = LotStatus.LOW;
    }

    const lot = await this.lotRepo.save(
      this.lotRepo.create({
        item:       { id: item.id } as any,
        lotNumber,
        quantity:   dto.quantity,
        remaining:  dto.quantity,
        unitCost,
        supplier:   dto.supplier ?? null,
        entryDate:  new Date(entryDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status,
      }),
    );

    // Actualizar stock total del insumo
    const newStock = Number(item.currentStock) + Number(dto.quantity);
    await this.itemRepo.update(item.id, { currentStock: newStock });

    // Registrar movimiento de entrada
    await this.movRepo.save(
      this.movRepo.create({
        lot:      { id: lot.id } as any,
        type:     MovementType.ENTRY,
        quantity: dto.quantity,
        notes:    `Entrada de mercancía: ${dto.supplier ?? 'sin proveedor'}`,
      }),
    );

    return lot;
  }

  async updateLot(id: number, dto: UpdateLotDto) {
    await this.lotRepo.update(id, dto as any);
    return this.findOneLot(id);
  }

  /**
   * Dar de baja un lote por merma.
   * Registra movimiento tipo 'waste' y actualiza stock del item.
   */
  async removeLot(id: number, restaurantId: number, notes?: string) {
    const lot  = await this.findOneLot(id);
    const item = await this.findOneItem(lot.itemId, restaurantId);

    await this.movRepo.save(
      this.movRepo.create({
        lot:      { id } as any,
        type:     MovementType.WASTE,
        quantity: lot.remaining,
        notes:    notes ?? 'Baja por merma',
      }),
    );

    const newStock = Math.max(0, Number(item.currentStock) - Number(lot.remaining));
    await this.itemRepo.update(item.id, { currentStock: newStock });
    await this.lotRepo.update(id, { remaining: 0, status: LotStatus.DEPLETED });

    return { message: 'Lote dado de baja por merma' };
  }

  // ─── Movimientos ─────────────────────────────────────────────────

  findMovements(restaurantId: number, filters: {
    lotId?: number; type?: string; dateFrom?: string; dateTo?: string;
  }) {
    const qb = this.movRepo.createQueryBuilder('m')
      .leftJoinAndSelect('m.lot', 'lot')
      .leftJoinAndSelect('lot.item', 'item')
      .where('item.restaurant_id = :rid', { rid: restaurantId });

    if (filters.lotId)   qb.andWhere('m.lot_id = :lid',   { lid: filters.lotId });
    if (filters.type)    qb.andWhere('m.type = :type',   { type: filters.type });
    if (filters.dateFrom) qb.andWhere('m.createdAt >= :from', { from: filters.dateFrom });
    if (filters.dateTo)   qb.andWhere('m.createdAt <= :to',   { to: filters.dateTo });

    return qb.orderBy('m.createdAt', 'DESC').getMany();
  }

  /**
   * Ajuste manual post-auditoría.
   * Jorge: PATCH /api/inventario/{id} — "Descontar stock cuando se cocina algo"
   */
  async createAdjustment(restaurantId: number, dto: AdjustmentDto, userId: number) {
    const lot  = await this.findOneLot(dto.lotId);
    const item = await this.findOneItem(lot.itemId, restaurantId);

    const newRemaining = Number(lot.remaining) + Number(dto.quantity);
    if (newRemaining < 0) throw new BadRequestException('Stock insuficiente para este ajuste');

    await this.lotRepo.update(dto.lotId, { remaining: newRemaining });

    const newStock = Number(item.currentStock) + Number(dto.quantity);
    await this.itemRepo.update(item.id, { currentStock: Math.max(0, newStock) });

    const mov = await this.movRepo.save(
      this.movRepo.create({
        lot:         { id: dto.lotId } as any,
        type:        dto.quantity > 0 ? MovementType.ENTRY : MovementType.ADJUSTMENT,
        quantity:    Math.abs(dto.quantity),
        notes:       dto.notes ?? 'Ajuste manual',
        createdBy:   { id: userId } as any,
      }),
    );

    // Si stock llega a mínimo, crear alerta
    if (Number(item.currentStock) <= item.minStock) {
      await this.alertRepo.save(
        this.alertRepo.create({
          itemId:  item.id,
          type:    AlertType.LOW_STOCK,
          message: `Stock de "${item.name}" por debajo del mínimo (${item.minStock} ${item.unit})`,
        }),
      );
    }

    return mov;
  }

  // ─── Alertas ─────────────────────────────────────────────────────

  /**
   * Retorna alertas activas con el flag que necesita Jorge:
   *   alertFlag: true cuando hay alerta activa
   *   alertType: "low_stock" | "expiring_soon" | "expired" | "out_of_stock"
   */
  findActiveAlerts(restaurantId: number) {
    return this.alertRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.item', 'item')
      .where('item.restaurant_id = :rid AND a.is_resolved = false', { rid: restaurantId })
      .orderBy('a.created_at', 'DESC')
      .getMany();
  }

  async resolveAlert(id: number) {
    await this.alertRepo.update(id, { isResolved: true });
    return { message: 'Alerta resuelta' };
  }

  /**
   * Actualiza el estado de los lotes según fecha de caducidad.
   * Corre periódicamente (puede programarse con @Cron).
   * Jorge: "La lógica de colores la estamos haciendo por fecha"
   */
  async refreshLotStatuses(restaurantId: number) {
    const now       = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 7);

    const lots = await this.findAllLots(restaurantId, {});
    for (const lot of lots) {
      if (!lot.expiryDate || lot.status === LotStatus.DEPLETED) continue;

      let newStatus = LotStatus.AVAILABLE;
      if (new Date(lot.expiryDate) <= now)       newStatus = LotStatus.EXPIRED;
      else if (new Date(lot.expiryDate) <= threshold) newStatus = LotStatus.LOW;
      else if (lot.remaining <= 0)                newStatus = LotStatus.DEPLETED;

      if (newStatus !== lot.status) {
        await this.lotRepo.update(lot.id, { status: newStatus });
        if (newStatus === LotStatus.EXPIRED || newStatus === LotStatus.LOW) {
          await this.alertRepo.save(
            this.alertRepo.create({
              itemId:  lot.itemId,
              type:    newStatus === LotStatus.EXPIRED
                ? AlertType.EXPIRED
                : AlertType.EXPIRING_SOON,
              message: newStatus === LotStatus.EXPIRED
                ? `Lote ${lot.lotNumber ?? '#' + lot.id} de "${lot.item?.name}" CADUCADO`
                : `Lote ${lot.lotNumber ?? '#' + lot.id} de "${lot.item?.name}" caduca en 7 días`,
            }),
          );
        }
      }
    }
    return { message: 'Estados de lotes actualizados' };
  }
}
