// svg.d.ts
declare module "*.svg" {
  import * as React from "react";
  const src: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  export default src;
  export const ReactComponent: typeof src;
}
