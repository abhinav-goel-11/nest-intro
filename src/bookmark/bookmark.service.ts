import {
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookmarkDto, EditBookmarkDto } from './dto';
import { generateRedisKey } from './helper';
import Redis from 'ioredis';

@Injectable()
export class BookmarkService {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redisClient: Redis,
  ) {}

  async getBookmarks(userId: number) {
    //first fetch from redis cache

    const matchedKeys = await this.redisClient.keys(`key:${userId}:*`);

    if (matchedKeys && matchedKeys.length > 0) {
      const cacheData = await this.redisClient.mget(...matchedKeys);
      //converting the response to json format
      let arr = [];
      cacheData.map((obj) => {
        arr.push(JSON.parse(obj));
      });
      console.log('data from redis ===>', arr);
      return arr;
    }
    // Fetch data from the database
    const dbData = await this.prisma.bookmark.findMany({
      where: {
        userId,
      },
    });
    //update data in redis(this condition will run when the redis cache expires)
    console.log('cache is expired data from db dbData ======> ', dbData);
    dbData.map(async (obj) => {
      await this.redisClient.set(
        `key:${obj.userId}:${obj.id}`,
        JSON.stringify(obj),
      );
      await this.redisClient.expire(`key:${obj.userId}:${obj.id}`, 15);
    });
    console.log(
      'data saved in redis cache successfully',
      await this.redisClient.keys(`key:${userId}:*`),
    );
    return dbData;
  }

  async getBookmarkById(userId: number, bookmarkId: number) {
    //first searching from redis

    const rediskey = generateRedisKey(userId, bookmarkId);
    console.log(
      'does the key exists ==>',
      await this.redisClient.exists(rediskey),
    );
    const cachedData = await this.redisClient.get(rediskey);

    if (cachedData) {
      console.log('_____data was in redis______ ', cachedData);
      return JSON.parse(cachedData);
    }

    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        id: bookmarkId,
      },
    });
    if (!bookmark || bookmark.userId !== userId) {
      throw new NotFoundException(
        `Bookmark with id ${bookmarkId} not found was not found for the userId ${userId}`,
      );
    }
    const dbData = await this.prisma.bookmark.findFirst({
      where: {
        id: bookmarkId,
      },
    });
    console.log('_____data was not in redis data from db \n', dbData);

    // Store the data in Redis cache
    await this.redisClient.set(rediskey, JSON.stringify(dbData));
    await this.redisClient.expire(rediskey, 15);
    return dbData;
  }

  async createBookmark(userId: number, dto: CreateBookmarkDto) {
    const bookmark = await this.prisma.bookmark.create({
      data: {
        userId,
        ...dto,
      },
    });

    const rediskey = generateRedisKey(userId, bookmark.id);
    console.log('===>', rediskey);

    // Store the data in Redis cache
    console.log('_____creating the bookmark in redis_____');
    await this.redisClient.set(rediskey, JSON.stringify(bookmark));
    await this.redisClient.expire(rediskey, 15);
    console.log('____bookmark stored in redis cache');
    return bookmark;
  }

  async editBookmarkById(
    userId: number,
    bookmarkId: number,
    dto: EditBookmarkDto,
  ) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        id: bookmarkId,
      },
    });
    if (!bookmark || bookmark.userId !== userId) {
      throw new ForbiddenException('Access to data resource denied');
    }

    const res = await this.prisma.bookmark.update({
      where: {
        id: bookmarkId,
      },
      data: {
        ...dto,
      },
    });
    const rediskey = generateRedisKey(userId, bookmark.id);
    //updating in redis cache
    await this.redisClient.set(rediskey, JSON.stringify(res));
    await this.redisClient.expire(rediskey, 15);
    console.log('updates bookmark in db and redis');
    return res;
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBookmarkById(userId: number, bookmarkId: number) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        id: bookmarkId,
      },
    });
    if (!bookmark || bookmark.userId !== userId) {
      throw new ForbiddenException('Access to data resource denied');
    }
    //delete in redis cache
    const redisKey = generateRedisKey(userId, bookmarkId);
    await this.redisClient.del(redisKey);

    await this.prisma.bookmark.delete({
      where: {
        id: bookmarkId,
      },
    });
    console.log('deleted bookmark from redis and db');
  }
}
