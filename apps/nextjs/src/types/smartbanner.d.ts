declare module "smartbanner.js/src/smartbanner.js" {
  export default class SmartBanner {
    constructor();
    publish(): boolean | void;
    exit(): void;
    clickout(): void;
  }
}
