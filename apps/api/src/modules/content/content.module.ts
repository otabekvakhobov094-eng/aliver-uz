import { Module } from '@nestjs/common';
import { AdminContentController } from './admin-content.controller';
import { ContactController } from './contact.controller';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  controllers: [ContentController, AdminContentController, ContactController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
