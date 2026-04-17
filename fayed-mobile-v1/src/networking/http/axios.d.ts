import "axios";

declare module "axios" {
  export interface InternalAxiosRequestConfig<_D = any> {
    _retry?: boolean;
  }
}
