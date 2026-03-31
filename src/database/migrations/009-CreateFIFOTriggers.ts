// RUTA: src/database/migrations/009-CreateFIFOTriggers.ts
// Triggers MySQL para descuento automático de inventario FIFO
// y cambio automático de kitchen_status cuando todos los ítems están listos.
// Jorge: "al vender un Platillo A, el sistema descuenta los Insumos B automáticamente"
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFIFOTriggers1710000000009 implements MigrationInterface {
  name = 'CreateFIFOTriggers1710000000009';

  public async up(q: QueryRunner): Promise<void> {
    // ── TRIGGER 1: after_order_delivered ──────────────────────────
    // Dispara cuando orders.status cambia a 'delivered'.
    // Descuenta insumos del lote más antiguo (entry_date ASC = FIFO).
    // Si stock = 0 → deshabilita el platillo (is_available = 0).
    // Si stock < min_stock → inserta alerta de stock bajo.
    await q.query(`DROP TRIGGER IF EXISTS after_order_delivered`);
    await q.query(`
      CREATE TRIGGER after_order_delivered
      AFTER UPDATE ON orders
      FOR EACH ROW
      BEGIN
        DECLARE done        INT DEFAULT FALSE;
        DECLARE v_item_id   INT;
        DECLARE v_quantity  DECIMAL(10,4);
        DECLARE v_lot_id    INT;
        DECLARE v_remaining DECIMAL(10,3);
        DECLARE v_to_deduct DECIMAL(10,3);
        DECLARE v_min_stock DECIMAL(10,3);
        DECLARE v_curr_stock DECIMAL(10,3);

        IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
          -- Cursor sobre ingredientes de los platillos del pedido
          BEGIN
            DECLARE ing_cursor CURSOR FOR
              SELECT ri.item_id, (ri.quantity * oi.quantity) AS total_qty
              FROM order_items oi
              JOIN dishes d ON oi.dish_id = d.id
              JOIN recipes r ON r.dish_id = d.id
              JOIN recipe_ingredients ri ON ri.recipe_id = r.id
              WHERE oi.order_id = NEW.id AND ri.item_id IS NOT NULL;

            DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

            OPEN ing_cursor;
            read_loop: LOOP
              FETCH ing_cursor INTO v_item_id, v_quantity;
              IF done THEN LEAVE read_loop; END IF;

              -- Descontar FIFO: lote más antiguo primero (entry_date ASC)
              SET @remaining_to_deduct = v_quantity;
              WHILE @remaining_to_deduct > 0 DO
                SELECT id, remaining INTO v_lot_id, v_remaining
                FROM inventory_lots
                WHERE item_id = v_item_id
                  AND status NOT IN ('depleted','expired')
                  AND remaining > 0
                ORDER BY entry_date ASC
                LIMIT 1;

                IF v_lot_id IS NULL THEN
                  SET @remaining_to_deduct = 0;
                ELSE
                  SET v_to_deduct = LEAST(v_remaining, @remaining_to_deduct);
                  UPDATE inventory_lots
                  SET remaining = remaining - v_to_deduct,
                      status = CASE WHEN (remaining - v_to_deduct) <= 0 THEN 'depleted' ELSE status END
                  WHERE id = v_lot_id;

                  INSERT INTO inventory_movements (lot_id, order_id, type, quantity, notes, created_at)
                  VALUES (v_lot_id, NEW.id, 'sale', v_to_deduct, CONCAT('FIFO - Pedido #', NEW.order_number), NOW());

                  SET @remaining_to_deduct = @remaining_to_deduct - v_to_deduct;
                  SET v_lot_id = NULL;
                END IF;
              END WHILE;

              -- Actualizar current_stock del item
              UPDATE inventory_items ii
              SET current_stock = (
                SELECT COALESCE(SUM(remaining), 0)
                FROM inventory_lots
                WHERE item_id = ii.id AND status NOT IN ('depleted','expired')
              )
              WHERE id = v_item_id;

              -- Si stock llega a 0: deshabilitar platillos relacionados
              SELECT current_stock, min_stock INTO v_curr_stock, v_min_stock
              FROM inventory_items WHERE id = v_item_id;

              IF v_curr_stock <= 0 THEN
                UPDATE dishes d
                SET is_available = 0
                WHERE d.id IN (
                  SELECT DISTINCT r2.dish_id FROM recipes r2
                  JOIN recipe_ingredients ri2 ON ri2.recipe_id = r2.id
                  WHERE ri2.item_id = v_item_id
                );
                INSERT INTO inventory_alerts (item_id, type, message, created_at)
                SELECT v_item_id, 'out_of_stock',
                  CONCAT('Sin stock: "', name, '"'), NOW()
                FROM inventory_items WHERE id = v_item_id;
              ELSEIF v_curr_stock <= v_min_stock THEN
                INSERT INTO inventory_alerts (item_id, type, message, created_at)
                SELECT v_item_id, 'low_stock',
                  CONCAT('Stock bajo: "', name, '" (', v_curr_stock, ' ', unit, ')'), NOW()
                FROM inventory_items WHERE id = v_item_id;
              END IF;

            END LOOP;
            CLOSE ing_cursor;
          END;
        END IF;
      END
    `);

    // ── TRIGGER 2: after_order_item_status_update ─────────────────
    // Dispara cuando order_items.status cambia.
    // Si TODOS los ítems = 'ready' → actualiza orders.kitchen_status = 'ready'.
    await q.query(`DROP TRIGGER IF EXISTS after_order_item_status_update`);
    await q.query(`
      CREATE TRIGGER after_order_item_status_update
      AFTER UPDATE ON order_items
      FOR EACH ROW
      BEGIN
        DECLARE v_pending_count INT;

        IF NEW.status = 'ready' AND OLD.status != 'ready' THEN
          SELECT COUNT(*) INTO v_pending_count
          FROM order_items
          WHERE order_id = NEW.order_id
            AND status NOT IN ('ready', 'served');

          IF v_pending_count = 0 THEN
            UPDATE orders
            SET kitchen_status = 'ready'
            WHERE id = NEW.order_id AND kitchen_status != 'delivered';
          END IF;
        END IF;
      END
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TRIGGER IF EXISTS after_order_item_status_update`);
    await q.query(`DROP TRIGGER IF EXISTS after_order_delivered`);
  }
}
