// RUTA: src/modules/reports/reports.module.ts
import { Module }            from '@nestjs/common';
import { ReportsController } from './reports.controller';

@Module({ controllers: [ReportsController] })
export class ReportsModule {}
