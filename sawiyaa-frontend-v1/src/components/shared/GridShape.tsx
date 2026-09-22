import Image from "next/image";
import React from "react";

export default function GridShape() {
  return (
    <>
      <div className="pointer-events-none absolute right-0 top-0 -z-1 w-full max-w-[250px] xl:max-w-[450px]">
        <Image
          width={540}
          height={254}
          src="/images/shape/grid-01.svg"
          alt=""
          loading="eager"
          style={{ width: "100%", height: "auto" }}
          className="w-full"
        />
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 -z-1 w-full max-w-[250px] rotate-180 xl:max-w-[450px]">
        <Image
          width={540}
          height={254}
          src="/images/shape/grid-01.svg"
          alt=""
          loading="eager"
          style={{ width: "100%", height: "auto" }}
          className="w-full"
        />
      </div>
    </>
  );
}
