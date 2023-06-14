import { Module } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { BookmarkController } from './bookmark.controller';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports:[RedisModule],
  providers: [BookmarkService],
  controllers: [BookmarkController]
})
export class BookmarkModule {}
