import { Module } from '@nestjs/common';
import Redis from 'ioredis';

@Module({
    providers: [
        {
          provide: 'REDIS_CLIENT',
          useFactory: () => {
            return new Redis({
              host: 'localhost', // Redis server host
              port: 6379, // Redis server port
            });
          },
        },
      ],
      exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
