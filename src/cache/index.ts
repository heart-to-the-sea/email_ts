export default class Cache {
  emailList: any[] = [];
  private static cache = new Cache();
  constructor() {
    if (Cache.cache) {
      return Cache.cache;
    }
  }
}
