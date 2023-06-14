export const generateRedisKey = (userId:number,bookmarkId:number) :string=> {
    return `key:${userId}:${bookmarkId}`
}