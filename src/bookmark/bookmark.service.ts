import { ForbiddenException, HttpCode, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookmarkDto, EditBookmarkDto } from './dto';

@Injectable()
export class BookmarkService {
    constructor(private prisma:PrismaService){}

    getBookmarks(userId:number){
        return this.prisma.bookmark.findMany({
            where:{
                userId,
            }
        })
    } 

    
    async getBookmarkById(userId:number,bookmarkId:number) {

        const bookmark = await this.prisma.bookmark.findUnique({
            where:{
                id:bookmarkId,
            },
        })
        if(!bookmark || bookmark.userId !== userId){
            throw new NotFoundException(`Bookmark with id ${bookmarkId} not found`);
        }
        return this.prisma.bookmark.findFirst({
            where:{
                id:bookmarkId,
            }
        })

    }

    
   async createBookmark(userId:number,dto:CreateBookmarkDto) {
        const bookmark = await this.prisma.bookmark.create({
            data:{
                userId,
                ...dto
            }
        })

        return bookmark;
    }

    
    async editBookmarkById(userId:number,bookmarkId:number,dto:EditBookmarkDto) {
        const bookmark = await this.prisma.bookmark.findUnique({
            where:{
                id:bookmarkId,
            },
        })
        if(!bookmark || bookmark.userId !== userId){
            throw new ForbiddenException('Access to data resource denied');
        }

        return this.prisma.bookmark.update({
            where:{
                id:bookmarkId,
            },
            data:{
                ...dto
            }
        })

    }

    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteBookmarkById(userId:number,bookmarkId:number){
        const bookmark = await this.prisma.bookmark.findUnique({
            where:{
                id:bookmarkId,
            },
        })
        if(!bookmark || bookmark.userId !== userId){
            throw new ForbiddenException('Access to data resource denied');
        }

        await this.prisma.bookmark.delete({
            where:{
                id:bookmarkId
            }
        })
    }
}
