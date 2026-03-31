// RUTA: src/modules/inventory/inventory.module.ts
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController }       from './inventory.controller';
import { InventoryCompatController } from './inventory-compat.controller';
import { InventoryService }          from './inventory.service';
import { InventoryItem }             from './entities/inventory-item.entity';
import { InventoryLot }              from './entities/inventory-lot.entity';
import { InventoryMovement }         from './entities/inventory-movement.entity';
import { InventoryAlert }            from './entities/inventory-alert.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryItem,
      InventoryLot,
      InventoryMovement,
      InventoryAlert,
    ]),
  ],
  controllers: [InventoryController, InventoryCompatController],
  providers:   [InventoryService],
  exports:     [InventoryService],
})
export class InventoryModule {}
