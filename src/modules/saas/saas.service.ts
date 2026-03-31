// RUTA: src/modules/saas/saas.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SaasSubscription }  from './entities/saas-subscription.entity';
import { SaasPlan }          from './entities/saas-plan.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Restaurant }        from '../restaurants/entities/restaurant.entity';
import { User, UserRole }    from '../users/entities/user.entity';
import { RegisterRestaurantDto, UpdateSubscriptionStatusDto, ChangePlanDto, RegisterPaymentDto } from './dto/saas.dto';

@Injectable()
export class SaasService {
  constructor(
    @InjectRepository(SaasSubscription)  private subRepo:  Repository<SaasSubscription>,
    @InjectRepository(SaasPlan)          private planRepo: Repository<SaasPlan>,
    @InjectRepository(PaymentTransaction) private txRepo:  Repository<PaymentTransaction>,
    @InjectRepository(Restaurant)        private restRepo: Repository<Restaurant>,
    @InjectRepository(User)              private userRepo: Repository<User>,
    private dataSource: DataSource,
  ) {}

  getKpis(filters: { dateFrom?: string; dateTo?: string }) {
    return { message: 'KPIs globales', filters };
  }

  async registerRestaurant(dto: RegisterRestaurantDto) {
    return this.dataSource.transaction(async em => {
      const plan = await em.findOneBy(SaasPlan, { id: dto.planId });
      if (!plan) throw new NotFoundException('Plan no encontrado');
      const hash = await bcrypt.hash(dto.adminPassword, 12);
      const tempAdmin = em.create(User, { role: UserRole.RESTAURANT_ADMIN, fullName: dto.adminFullName, email: dto.adminEmail, passwordHash: hash });
      const savedAdmin = await em.save(User, tempAdmin);
      const rest = em.create(Restaurant, { name: dto.restaurantName, slug: dto.slug, ownerId: savedAdmin.id, timezone: dto.timezone ?? 'America/Monterrey', dashboardConfig: { show_sales:true,show_top_dishes:true,show_peak_hours:true,show_category_income:true,show_dishes_by_menu:true } });
      const savedRest = await em.save(Restaurant, rest);
      await em.update(User, savedAdmin.id, { restaurantId: savedRest.id });
      const trialEnd   = new Date(Date.now() + 30*24*60*60*1000);
      const nextBilling = trialEnd;
      const sub = em.create(SaasSubscription, { restaurant: { id: savedRest.id }, plan: { id: plan.id }, status: 'trial', amountMxn: plan.priceMxn, trialEndsAt: trialEnd, nextBillingAt: nextBilling, currentPeriodEnd: trialEnd });
      await em.save(SaasSubscription, sub);
      return { restaurant: savedRest, admin: { ...savedAdmin, passwordHash: undefined }, subscription: sub };
    });
  }

  async getRestaurants(filters: { plan?: string; status?: string; search?: string; page: number; limit: number }) {
    const qb = this.restRepo.createQueryBuilder('r').leftJoinAndSelect('r.owner','owner').take(filters.limit).skip((filters.page-1)*filters.limit);
    if (filters.search) qb.where('r.name LIKE :s', { s: `%${filters.search}%` });
    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page: filters.page, limit: filters.limit } };
  }

  async getRestaurant(id: number) {
    const r = await this.restRepo.findOne({ where: { id }, relations: ['owner'] });
    if (!r) throw new NotFoundException('Restaurante no encontrado');
    return r;
  }

  getRestaurantStats(id: number, filters: any) { return { message: 'Stats del restaurante', id, filters }; }
  getRestaurantMenus(id: number) { return { message: 'Menús del restaurante', id }; }
  getDishesSold(id: number, filters: any) { return { message: 'Platillos vendidos', id, filters }; }

  async updateRestaurantStatus(id: number, isActive: boolean) {
    await this.restRepo.update(id, { isActive });
    if (!isActive) {
      await this.subRepo.createQueryBuilder().update().set({ status: 'suspended' }).where('restaurant_id = :id', { id }).execute();
    }
    return this.getRestaurant(id);
  }

  getSubscriptions(filters: { status?: string; plan?: string }) { return this.subRepo.find({ relations: ['plan','restaurant'] }); }

  async getSubscription(id: number) {
    const sub = await this.subRepo.findOne({ where: { id }, relations: ['plan','restaurant'] });
    if (!sub) throw new NotFoundException('Suscripción no encontrada');
    const transactions = await this.txRepo.find({ where: { subscription: { id } }, order: { createdAt: 'DESC' } });
    return { ...sub, transactions };
  }

  async updateSubscriptionStatus(id: number, dto: UpdateSubscriptionStatusDto) {
    const sub = await this.subRepo.findOne({ where: { id }, relations: ['restaurant'] });
    if (!sub) throw new NotFoundException('Suscripción no encontrada');
    await this.subRepo.update(id, { status: dto.status as any });
    const isActive = dto.status === 'active' || dto.status === 'trial';
    await this.restRepo.update(sub.restaurant.id, { isActive });
    return this.getSubscription(id);
  }

  async changePlan(id: number, dto: ChangePlanDto) {
    const plan = await this.planRepo.findOneBy({ id: dto.planId });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    await this.subRepo.update(id, { plan: { id: dto.planId }, amountMxn: plan.priceMxn });
    return this.getSubscription(id);
  }

  async registerManualPayment(id: number, dto: RegisterPaymentDto) {
    const sub = await this.subRepo.findOneBy({ id });
    if (!sub) throw new NotFoundException('Suscripción no encontrada');
    const tx = this.txRepo.create({ subscription: { id }, amount: dto.amount, currency: 'MXN', status: 'success', paymentMethod: dto.paymentMethod ?? 'manual', gatewayRef: `MANUAL-${Date.now()}`, paidAt: new Date() });
    await this.txRepo.save(tx);
    const next = new Date(sub.nextBillingAt);
    next.setMonth(next.getMonth() + 1);
    await this.subRepo.update(id, { status: 'active', nextBillingAt: next, currentPeriodEnd: next });
    await this.restRepo.update(sub.restaurant ? (sub as any).restaurantId : 0, { isActive: true });
    return { message: 'Pago registrado. Status → active', nextBillingAt: next };
  }

  sendPaymentReminder(id: number) { return { message: 'Recordatorio enviado', subscriptionId: id }; }
  getPaymentsReport(filters: any) { return { message: 'Reporte de pagos', filters }; }
}
