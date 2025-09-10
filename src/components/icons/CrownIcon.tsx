import * as React from "react";

type Props = React.SVGProps<SVGSVGElement> & { size?: number };

export default function CrownIcon({ size = 20, ...props }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* coroa simples, visual coeso com os demais ícones */}
      <path d="M3 7l4 4 5-8 5 8 4-4v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M7 21h10" />
    </svg>
  );
}
