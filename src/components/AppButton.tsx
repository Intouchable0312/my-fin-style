import type { ButtonHTMLAttributes, ReactNode } from "react";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function AppButton({ children, className = "", ...props }: AppButtonProps) {
  return (
    <button className={className} type="button" {...props}>
      {children}
    </button>
  );
}