import { Module } from '@nestjs/common';
import { CustomerAdminService } from './customer-admin.service';
import { CustomersController } from './customers.controller';

@Module({
  controllers: [CustomersController],
  providers: [CustomerAdminService],
  exports: [CustomerAdminService],
})
export class CustomersModule {}
